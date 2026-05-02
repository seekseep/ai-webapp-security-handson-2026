#!/usr/bin/env node
/**
 * sections/<section>/<lecture>/{LECTURE,README,LEGAL}.md を
 * docs-site/src/content/docs/<section>/<lecture>/{index,readme,legal}.md に
 * フロントマターを差し込んで同期する。
 *
 * - sections/ 側のマークダウンが単一情報源
 * - 出力先のレクチャーディレクトリは毎回作り直す
 * - 本文中の相対リンクのうち、.md は サイト内パスへ、.md 以外は GitHub blob URL に変換
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

// LECTURE.md → index.md (グループの代表)
// README.md  → readme.md
// LEGAL.md   → legal.md
const KINDS = {
  'LECTURE.md': { kind: 'index',  slug: 'index.md',  pageOrder: 1, sidebarLabel: '解説' },
  'README.md':  { kind: 'readme', slug: 'readme.md', pageOrder: 5, sidebarLabel: '起動方法' },
  'LEGAL.md':   { kind: 'legal',  slug: 'legal.md',  pageOrder: 9, sidebarLabel: '注意事項' },
};

const KIND_TO_SLUG = { index: '', readme: 'readme/', legal: 'legal/' };

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

function siteUrlFor(section, lecture, kind) {
  return `/${section}/${lecture}/${KIND_TO_SLUG[kind] || ''}`;
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

function transformLinks(content, section, lecture, currentKind) {
  const fromUrl = siteUrlFor(section, lecture, currentKind);
  return content.replace(/(\[[^\]]*\])\(([^)\s]+)(\s+"[^"]*")?\)/g, (match, label, rawTarget, title) => {
    const target = rawTarget.trim();
    const titlePart = title || '';

    if (/^(https?:|mailto:|tel:|#)/i.test(target)) return match;
    if (target.startsWith('/')) return match;

    const otherLecMd = target.match(/^(?:\.\.\/)+([\w-]+)\/([\w-]+)\/(LECTURE|README|LEGAL)\.md(#[^\s)]*)?$/i);
    if (otherLecMd) {
      const [, sec, lec, kindUpper, hash] = otherLecMd;
      const kind = kindUpper.toUpperCase() === 'LECTURE' ? 'index' : kindUpper.toLowerCase();
      const toUrl = siteUrlFor(sec, lec, kind);
      return `${label}(${relativeUrl(fromUrl, toUrl, hash || '')}${titlePart})`;
    }

    const sameLecMd = target.match(/^\.\/(LECTURE|README|LEGAL)\.md(#[^\s)]*)?$/i);
    if (sameLecMd) {
      const [, kindUpper, hash] = sameLecMd;
      const kind = kindUpper.toUpperCase() === 'LECTURE' ? 'index' : kindUpper.toLowerCase();
      const toUrl = siteUrlFor(section, lecture, kind);
      return `${label}(${relativeUrl(fromUrl, toUrl, hash || '')}${titlePart})`;
    }

    if (target.startsWith('./')) {
      const cleaned = target.replace(/^\.\//, '');
      return `${label}(${REPO}/blob/main/sections/${section}/${lecture}/${cleaned}${titlePart})`;
    }

    if (target.startsWith('../')) {
      const resolved = path.posix.normalize(path.posix.join(`sections/${section}/${lecture}`, target));
      if (resolved.startsWith('sections/') && !resolved.includes('..')) {
        return `${label}(${REPO}/blob/main/${resolved}${titlePart})`;
      }
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
  lines.push('sidebar:');
  lines.push(`  order: ${sidebarOrder}`);
  if (sidebarLabel) lines.push(`  label: ${yamlEscape(sidebarLabel)}`);
  if (editUrl) lines.push(`editUrl: ${yamlEscape(editUrl)}`);
  lines.push('---', '', '');
  return lines.join('\n');
}

async function cleanLectureDirs(section) {
  const sectionDir = path.join(DOCS_DIR, section);
  let entries;
  try {
    entries = await readdir(sectionDir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') {
      await mkdir(sectionDir, { recursive: true });
      return;
    }
    throw e;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await rm(path.join(sectionDir, entry.name), { recursive: true, force: true });
    }
  }
}

async function syncSection(section) {
  await cleanLectureDirs(section);
  const sectionSrcDir = path.join(SECTIONS_DIR, section);
  const lectures = (await readdir(sectionSrcDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const lecture of lectures) {
    const lectureSrcDir = path.join(sectionSrcDir, lecture);
    const lectureOutDir = path.join(DOCS_DIR, section, lecture);
    await mkdir(lectureOutDir, { recursive: true });

    let wroteAny = false;
    for (const [filename, { kind, slug, pageOrder, sidebarLabel }] of Object.entries(KINDS)) {
      const srcPath = path.join(lectureSrcDir, filename);
      let stats;
      try {
        stats = await stat(srcPath);
      } catch (e) {
        if (e.code === 'ENOENT') continue;
        throw e;
      }
      if (stats.size > MAX_FILE_BYTES) {
        console.warn(`[sync-lectures] skipping oversize file: ${srcPath} (${stats.size} bytes)`);
        continue;
      }

      const raw = await readFile(srcPath, 'utf8');
      const title = extractTitle(raw);
      const description = extractDescription(raw);
      const body = transformLinks(stripLeadingH1(raw), section, lecture, kind);

      const lectureOrder = parseLectureOrder(lecture);
      const sidebarOrder = kind === 'index' ? lectureOrder : pageOrder;
      const editUrl = `${REPO}/edit/main/sections/${section}/${lecture}/${filename}`;

      const fm = buildFrontmatter({
        title,
        description,
        sidebarOrder,
        sidebarLabel,
        editUrl,
      });

      const outPath = path.join(lectureOutDir, slug);
      await writeFile(outPath, fm + body, 'utf8');
      wroteAny = true;
      console.log(`[sync-lectures] ${section}/${lecture}/${filename} -> ${path.relative(ROOT, outPath)}`);
    }

    if (!wroteAny) {
      console.warn(`[sync-lectures] no files synced for ${section}/${lecture}`);
    }
  }
}

async function main() {
  for (const section of SECTIONS) {
    await syncSection(section);
  }
  console.log('[sync-lectures] done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
