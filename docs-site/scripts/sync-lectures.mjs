#!/usr/bin/env node
/**
 * リポジトリ全体のマークダウンから frontmatter に `docs: true` を持つものだけを
 * 拾い、docs-site/src/content/docs/ 配下のサイトページを生成する。
 *
 * 採用される source/destination の対応 (規約):
 *   ROOT/README.md                  → docs/index.md             (/)
 *   sections/README.md              → docs/getting-started.md   (/getting-started/)
 *   sections/<name>.md              → docs/<name>.md            (/<name>/)        例: LEGAL.md → /legal/
 *   sections/<sec>/README.md        → docs/<sec>/index.md       (/<sec>/)
 *   sections/<sec>/<lec>/LECTURE.md → docs/<sec>/<lec>.md       (/<sec>/<lec>/)   サイドバーには 1 ファイルとして並ぶ
 *
 * frontmatter で title / sidebar.label / sidebar.order を上書きできる。
 * sidebar.order は LECTURE.md に限り、ディレクトリ名 (`01-...`) からデフォルト値を導出する。
 * 本文中の相対リンクは:
 *   - 同期対象のマークダウン → 対応するサイト URL (相対) に変換
 *   - sections/ 配下のソースコードや他リソース → GitHub blob URL に変換
 *   - リポジトリルート直下のファイル (TODO.md, AGENTS.md など) → GitHub blob URL に変換
 */

import { glob, mkdir, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT, 'docs-site', 'src', 'content', 'docs');
const REPO = 'https://github.com/seekseep/ai-webapp-security-handson-2026';
const MAX_FILE_BYTES = 200 * 1024;
const PUBLISH_FLAG = 'docs';

function parseScalar(val) {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return Number(val);
  return val;
}

/**
 * 簡易 YAML フロントマターパーサー。
 * フラットなキーと、1 段ネストしたブロック (例: `sidebar: { order, label }`) のみを扱う。
 */
function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: content };
  const data = {};
  let currentParent = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (line.trim() === '') { currentParent = null; continue; }
    const nested = line.match(/^[ \t]+([\w-]+):\s*(.*)$/);
    if (nested && currentParent) {
      data[currentParent][nested[1]] = parseScalar(nested[2].trim());
      continue;
    }
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (!top) { currentParent = null; continue; }
    const val = top[2].trim();
    if (val === '') {
      data[top[1]] = {};
      currentParent = top[1];
    } else {
      data[top[1]] = parseScalar(val);
      currentParent = null;
    }
  }
  return { data, body: content.slice(m[0].length) };
}

function extractDescription(content) {
  const lines = content.split('\n');
  let foundH1 = false;
  const buffer = [];
  for (const line of lines) {
    if (!foundH1) {
      if (/^#[ \t]/.test(line)) foundH1 = true;
      continue;
    }
    if (line.trim() === '') {
      if (buffer.length > 0) break;
      continue;
    }
    if (/^#/.test(line)) break;
    buffer.push(line.trim());
    if (buffer.join(' ').length > 160) break;
  }
  const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 160) : undefined;
}

function stripLeadingH1(content) {
  return content.replace(/^\s*#[ \t]+.+?(?:\r?\n)+/, '');
}

function parseLectureOrder(lecture) {
  const m = lecture.match(/^(\d+)-/);
  return m ? Number(m[1]) : 99;
}

function relativeUrl(fromUrl, toUrl, hash = '') {
  const fromSegs = fromUrl.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  const toSegs = toUrl.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
  let i = 0;
  while (i < fromSegs.length && i < toSegs.length && fromSegs[i] === toSegs[i]) i++;
  const ups = fromSegs.length - i;
  const downs = toSegs.slice(i);
  let rel;
  if (ups === 0 && downs.length === 0) {
    rel = './';
  } else if (ups === 0) {
    rel = './' + downs.join('/') + '/';
  } else {
    rel = '../'.repeat(ups) + (downs.length > 0 ? downs.join('/') + '/' : '');
  }
  return rel + hash;
}

/**
 * 既知のサイト内ターゲットへのマッピング。
 * resolved (リポジトリルートからの POSIX 相対) を、サイト URL に変換する。
 * 一致しなければ null を返す。
 */
function resolveSiteUrl(resolved, isDirLink) {
  // ファイル形式の単一情報源
  if (resolved === 'sections/LEGAL.md') return '/legal/';
  if (resolved === 'sections/README.md') return '/getting-started/';

  let m = resolved.match(/^sections\/([\w-]+)\/README\.md$/);
  if (m) return `/${m[1]}/`;

  m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)\/LECTURE\.md$/i);
  if (m) return `/${m[1]}/${m[2]}/`;

  m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)\/README\.md$/i);
  if (m) return `/${m[1]}/${m[2]}/readme/`;

  // ディレクトリリンク
  if (isDirLink) {
    m = resolved.match(/^sections\/([\w-]+)\/([\w-]+)$/);
    if (m) return `/${m[1]}/${m[2]}/`;
    m = resolved.match(/^sections\/([\w-]+)$/);
    if (m) return `/${m[1]}/`;
  }
  return null;
}

function transformLinks(content, sourceDir, sourceSiteUrl) {
  return content.replace(/(\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (match, label, rawTarget, title) => {
    const target = rawTarget.trim();
    const titlePart = title || '';

    if (/^(https?:|mailto:|tel:|#)/i.test(target)) return match;
    if (target.startsWith('/')) return match;
    if (!target.startsWith('./') && !target.startsWith('../')) return match;

    const [pathPart, hashPart = ''] = target.split('#', 2);
    const hash = hashPart ? `#${hashPart}` : '';
    const isDirLink = pathPart.endsWith('/');
    const resolved = path.posix.normalize(path.posix.join(sourceDir, pathPart)).replace(/\/$/, '');

    if (resolved.startsWith('..') || resolved === '..') return match;

    const toUrl = resolveSiteUrl(resolved, isDirLink);
    if (toUrl) {
      return `${label}(${relativeUrl(sourceSiteUrl, toUrl, hash)}${titlePart})`;
    }

    if (resolved.startsWith('sections/')) {
      return `${label}(${REPO}/blob/main/${resolved}${hash}${titlePart})`;
    }

    if (!resolved.includes('/') && resolved.length > 0) {
      return `${label}(${REPO}/blob/main/${resolved}${hash}${titlePart})`;
    }

    return match;
  });
}

function yamlEscape(s) {
  if (s === undefined || s === null) return '""';
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter({ title, description, sidebarOrder, sidebarLabel, editUrl }) {
  const lines = ['---'];
  lines.push(`title: ${yamlEscape(title)}`);
  if (description) lines.push(`description: ${yamlEscape(description)}`);
  if (sidebarOrder !== undefined || sidebarLabel) {
    lines.push('sidebar:');
    if (sidebarOrder !== undefined) lines.push(`  order: ${sidebarOrder}`);
    if (sidebarLabel) lines.push(`  label: ${yamlEscape(sidebarLabel)}`);
  }
  if (editUrl) lines.push(`editUrl: ${yamlEscape(editUrl)}`);
  lines.push('---', '', '');
  return lines.join('\n');
}

async function syncFile({
  sourceFile,
  sourceDir,
  sourceSiteUrl,
  outputFile,
  defaultSidebarOrder,
  editPath,
}) {
  const stats = await stat(sourceFile);
  if (stats.size > MAX_FILE_BYTES) {
    console.warn(`[sync-lectures] skipping oversize: ${path.relative(ROOT, sourceFile)} (${stats.size} bytes)`);
    return;
  }

  const raw = await readFile(sourceFile, 'utf8');
  const { data: srcFm, body: bodyAfterFm } = parseFrontmatter(raw);
  const title = srcFm.title || '名称不明';
  const description = srcFm.description || extractDescription(bodyAfterFm);
  const body = transformLinks(stripLeadingH1(bodyAfterFm), sourceDir, sourceSiteUrl);

  const sidebar = srcFm.sidebar || {};
  const sidebarOrder = sidebar.order ?? defaultSidebarOrder;
  const sidebarLabel = sidebar.label;

  const fm = buildFrontmatter({
    title,
    description,
    sidebarOrder,
    sidebarLabel,
    editUrl: editPath ? `${REPO}/edit/main/${editPath}` : undefined,
  });

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, fm + body, 'utf8');
  console.log(`[sync-lectures] ${path.relative(ROOT, sourceFile)} -> ${path.relative(ROOT, outputFile)}`);
}

async function cleanDocsDir() {
  try {
    const entries = await readdir(DOCS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      await rm(path.join(DOCS_DIR, entry.name), { recursive: true, force: true });
    }
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
}

/**
 * source path (POSIX, ROOT 相対) から出力先・サイト URL・既定の sidebar order を導出する。
 * 規約に当てはまらない場合は null を返し、呼び出し側で警告して skip する。
 */
function deriveDestination(srcRel) {
  const parts = srcRel.split('/');
  const file = parts[parts.length - 1];

  if (srcRel === 'README.md') {
    return { outputPath: 'index.md', slug: '/' };
  }
  if (srcRel === 'sections/README.md') {
    return { outputPath: 'getting-started.md', slug: '/getting-started/' };
  }
  // sections/<name>.md (例: LEGAL.md → /legal/)
  if (parts[0] === 'sections' && parts.length === 2) {
    const name = file.replace(/\.md$/i, '').toLowerCase();
    return { outputPath: `${name}.md`, slug: `/${name}/` };
  }
  // sections/<sec>(/<lec>...)/README.md → ディレクトリの index ページ
  if (parts[0] === 'sections' && file === 'README.md' && parts.length >= 3) {
    const inner = parts.slice(1, -1);
    return {
      outputPath: path.posix.join(...inner, 'index.md'),
      slug: '/' + inner.join('/') + '/',
    };
  }
  // sections/<sec>/<lec>/LECTURE.md → 親ディレクトリ直下の 1 ファイル
  if (parts[0] === 'sections' && file === 'LECTURE.md' && parts.length >= 3) {
    const inner = parts.slice(1, -1);
    return {
      outputPath: inner.join('/') + '.md',
      slug: '/' + inner.join('/') + '/',
      defaultSidebarOrder: parseLectureOrder(inner[inner.length - 1]),
    };
  }
  return null;
}

async function findPublishableMarkdown() {
  const it = glob('**/*.md', {
    cwd: ROOT,
    exclude: (rel) => rel === 'node_modules' || rel.startsWith('node_modules/')
      || rel.startsWith('docs-site/') || rel.startsWith('.git/'),
  });
  const all = [];
  for await (const rel of it) all.push(rel.split(path.sep).join('/'));
  all.sort();

  const result = [];
  for (const rel of all) {
    const raw = await readFile(path.join(ROOT, rel), 'utf8');
    const { data } = parseFrontmatter(raw);
    if (data[PUBLISH_FLAG] !== true) continue;
    result.push(rel);
  }
  return result;
}

async function main() {
  await cleanDocsDir();
  await mkdir(DOCS_DIR, { recursive: true });

  for (const srcRel of await findPublishableMarkdown()) {
    const dest = deriveDestination(srcRel);
    if (!dest) {
      console.warn(`[sync-lectures] no destination convention for ${srcRel} (skipped)`);
      continue;
    }
    await syncFile({
      sourceFile: path.join(ROOT, srcRel),
      sourceDir: path.posix.dirname(srcRel),
      sourceSiteUrl: dest.slug,
      outputFile: path.join(DOCS_DIR, dest.outputPath),
      defaultSidebarOrder: dest.defaultSidebarOrder,
      editPath: srcRel,
    });
  }

  console.log('[sync-lectures] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
