import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = process.cwd();
const koreanPages = fs.readdirSync(root).filter(name => /^K-.*\.html$/.test(name));
const japanesePages = fs.readdirSync(path.join(root, 'japanese')).filter(name => /^J-.*\.html$/.test(name));
if (!koreanPages.length) throw new Error('No K-prefixed Korean pages found');
if (!japanesePages.length) throw new Error('No J-prefixed Japanese pages found');

const legacy = name => /^korean.*\.html$/.test(name) || (/^japanese\//.test(name) && !/^japanese\/J-/.test(name));
const textExtensions = new Set(['.html', '.js', '.mjs', '.json', '.xml', '.webmanifest', '.css']);
const files = execFileSync('rg', ['--files', '-g', '!AGENTS.md', '-g', '!GUIDED_AUDIO_PROTOCOL.md', '-g', '!preview/**'], {encoding: 'utf8'})
  .trim().split('\n').filter(Boolean);
const oldKorean = fs.readdirSync(root).filter(name => /^korean.*\.html$/.test(name));
const oldJapanese = fs.readdirSync(path.join(root, 'japanese')).filter(name => !/^J-/.test(name) && name.endsWith('.html'));
const problems = [];
for (const rel of files) {
  if (legacy(rel) || path.basename(rel) === 'validate-language-route-names.mjs') continue;
  if (!textExtensions.has(path.extname(rel))) continue;
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const name of oldKorean) if (new RegExp(`(?<!K-)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)) problems.push(`${rel}: ${name}`);
  for (const name of oldJapanese) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`japanese/(?!J-)${escaped}`).test(text)) problems.push(`${rel}: japanese/${name}`);
    if (rel.startsWith('japanese/') && new RegExp(`(?<![A-Za-z0-9_./-])${escaped}(?=[?#\"')\\s]|$)`).test(text)) problems.push(`${rel}: ${name}`);
  }
}
if (problems.length) throw new Error(`Old learner route references remain:\n${[...new Set(problems)].join('\n')}`);
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
if (/https:\/\/talktag\.co\.kr\/(?:korean|japanese\/)(?!J-)/.test(sitemap)) throw new Error('Sitemap contains an unprefixed language route');
for (const file of [...koreanPages, ...japanesePages.map(name => `japanese/${name}`)]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (/<meta\b[^>]*http-equiv=["']refresh/i.test(html)) continue;
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
  const koreanHomeAlias = file === 'K-korean.html' && canonical === 'https://talktag.co.kr/';
  if (canonical && !koreanHomeAlias && !canonical.endsWith(file.replaceAll('\\', '/'))) throw new Error(`Canonical mismatch: ${file} -> ${canonical}`);
}
console.log(`Language routes: ${koreanPages.length} K-prefixed Korean pages and ${japanesePages.length} J-prefixed Japanese pages; legacy aliases are redirect-only.`);
