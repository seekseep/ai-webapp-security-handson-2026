#!/usr/bin/env node
/**
 * sections/ 配下のマークダウンを単一情報源として、
 * docs-site/src/content/docs/ 配下のサイトページを生成する。
 *
 * 同期対象:
 *   ROOT/README.md                            → docs/index.md             (/)
 *   sections/README.md                        → docs/getting-started.md   (/getting-started/)
 *   sections/LEGAL.md                         → docs/legal.md             (/legal/)
 *   sections/<sec>/README.md                  → docs/<sec>/index.md       (/<sec>/)
 *   sections/<sec>/<lec>/LECTURE.md           → docs/<sec>/<lec>/index.md (/<sec>/<lec>/)
 *   sections/<sec>/<lec>/README.md            → docs/<sec>/<lec>/readme.md(/<sec>/<lec>/readme/)
 *
 * 各出力は YAML フロントマター (title / description / sidebar / editUrl) を付与。
 * 本文中の相対リンクは:
 *   - 既知の単一情報源マークダウン → 対応するサイト URL (相対) に変換
 *   - sections/ 配下のソースコードや他リソース → GitHub blob URL に変換
 *   - リポジトリルート直下のファイル (TODO.md, AGENTS.md など) → GitHub blob URL に変換
 */

import { mkdir, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SECTIONS_DIR = path.join(ROOT, 'sections');
const DOCS_DIR = path.join(ROOT, 'docs-site', 'src', 'content', 'docs');
const REPO = 'https://github.com/seekseep/ai-webapp-security-handson-2026';
const MAX_FILE_BYTES = 200 * 1024;

const SECTIONS = ['01-environment', '02-auth', '03-injection', '04-performance'];

function extractTitle(content) {
  const match = content.match(/^#[ \t]+(.+?)\s*$/m);
  return match ? match[1].trim() : 'Untitled';
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
  return content.replace(/^#[ \t]+.+?(?:\r?\n)+/, '');
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
  sidebarOrder,
  sidebarLabel,
  editPath,
  required = true,
}) {
  let stats;
  try {
    stats = await stat(sourceFile);
  } catch (e) {
    if (e.code === 'ENOENT') {
      if (required) {
        console.warn(`[sync-lectures] missing required source: ${path.relative(ROOT, sourceFile)}`);
      }
      return;
    }
    throw e;
  }
  if (stats.size > MAX_FILE_BYTES) {
    console.warn(`[sync-lectures] skipping oversize: ${path.relative(ROOT, sourceFile)} (${stats.size} bytes)`);
    return;
  }

  const raw = await readFile(sourceFile, 'utf8');
  const title = extractTitle(raw);
  const description = extractDescription(raw);
  const body = transformLinks(stripLeadingH1(raw), sourceDir, sourceSiteUrl);

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

async function main() {
  await cleanDocsDir();
  await mkdir(DOCS_DIR, { recursive: true });

  // ルート README → /
  await syncFile({
    sourceFile: path.join(ROOT, 'README.md'),
    sourceDir: '',
    sourceSiteUrl: '/',
    outputFile: path.join(DOCS_DIR, 'index.md'),
    sidebarOrder: 0,
    editPath: 'README.md',
  });

  // sections/README → /getting-started/
  await syncFile({
    sourceFile: path.join(SECTIONS_DIR, 'README.md'),
    sourceDir: 'sections',
    sourceSiteUrl: '/getting-started/',
    outputFile: path.join(DOCS_DIR, 'getting-started.md'),
    sidebarOrder: 0,
    sidebarLabel: 'はじめに',
    editPath: 'sections/README.md',
  });

  // sections/LEGAL → /legal/
  await syncFile({
    sourceFile: path.join(SECTIONS_DIR, 'LEGAL.md'),
    sourceDir: 'sections',
    sourceSiteUrl: '/legal/',
    outputFile: path.join(DOCS_DIR, 'legal.md'),
    sidebarOrder: 99,
    sidebarLabel: '注意事項',
    editPath: 'sections/LEGAL.md',
    required: false,
  });

  // 各セクション + そのレクチャー
  for (const section of SECTIONS) {
    // sections/<sec>/README → /<sec>/
    await syncFile({
      sourceFile: path.join(SECTIONS_DIR, section, 'README.md'),
      sourceDir: `sections/${section}`,
      sourceSiteUrl: `/${section}/`,
      outputFile: path.join(DOCS_DIR, section, 'index.md'),
      sidebarOrder: 0,
      sidebarLabel: '概要',
      editPath: `sections/${section}/README.md`,
    });

    // レクチャー
    let lectureNames = [];
    try {
      lectureNames = (await readdir(path.join(SECTIONS_DIR, section), { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    for (const lecture of lectureNames) {
      const lectureSrcDir = path.join(SECTIONS_DIR, section, lecture);
      const lectureOutDir = path.join(DOCS_DIR, section, lecture);
      const lectureOrder = parseLectureOrder(lecture);

      // LECTURE.md → /<sec>/<lec>/
      await syncFile({
        sourceFile: path.join(lectureSrcDir, 'LECTURE.md'),
        sourceDir: `sections/${section}/${lecture}`,
        sourceSiteUrl: `/${section}/${lecture}/`,
        outputFile: path.join(lectureOutDir, 'index.md'),
        sidebarOrder: lectureOrder,
        sidebarLabel: '解説',
        editPath: `sections/${section}/${lecture}/LECTURE.md`,
      });

      // README.md → /<sec>/<lec>/readme/
      await syncFile({
        sourceFile: path.join(lectureSrcDir, 'README.md'),
        sourceDir: `sections/${section}/${lecture}`,
        sourceSiteUrl: `/${section}/${lecture}/readme/`,
        outputFile: path.join(lectureOutDir, 'readme.md'),
        sidebarOrder: 5,
        sidebarLabel: '起動方法',
        editPath: `sections/${section}/${lecture}/README.md`,
      });
    }
  }

  console.log('[sync-lectures] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
