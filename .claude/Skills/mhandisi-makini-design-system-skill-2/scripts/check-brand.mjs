#!/usr/bin/env node
// Brand lint: flags off-palette hex colours, foreign font families and obvious rule breaks.
// Usage: node check-brand.mjs [dir=src]   → exit 1 if problems found.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const PALETTE = new Set(['#ffb800','#e6a600','#252a2d','#343a3f','#ffffff','#fff','#f7f8f6','#dce1e5','#5e6872','#7b858e',
  '#168a56','#e9f7ef','#2667d9','#eaf1ff','#a96800','#fff3db','#d64545','#feebeb']);
const EXT = new Set(['.css','.scss','.tsx','.jsx','.ts','.js','.html','.vue','.svelte']);
const SKIP = /node_modules|\.git|dist|build|\.next|coverage/;
const isKit = p => /tokens\.css$|components\.css$|mhandisi-makini\.tsx$/.test(p) || /mhandisi-makini[\/\\]index\.tsx$/.test(p);
// Print/PDF output can't read CSS variables at render time (headless Chromium
// footer templates, Puppeteer-rendered sheets), and the container only has
// "DejaVu Sans" installed, not Manrope/Inter — each file's own doc-comment
// explains the duplication. Hex and font-family checks are skipped for these;
// every other check (caps, labels, focus) still applies.
const PRINT_EXEMPT = /reports[\/\\]financial-summary[\/\\]PrintSheet\.tsx$|lib[\/\\]documents[\/\\]print-css\.ts$|lib[\/\\]documents[\/\\]render\.ts$/;
const root = process.argv[2] ?? 'src'; const problems = [];
function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n); if (SKIP.test(p)) continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p); else if (EXT.has(extname(n)) && !isKit(p)) check(p);
  }
}
// Blank out comment bodies (keeping newlines, so line numbers stay accurate)
// so hex codes mentioned only in prose — e.g. describing artwork colour in a
// doc-comment — don't false-positive as style values.
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
}
function check(p) {
  const raw = readFileSync(p, 'utf8');
  const lines = raw.split('\n');
  const exempt = PRINT_EXEMPT.test(p);
  const hexLines = exempt ? null : stripComments(raw).split('\n');
  const f = relative(process.cwd(), p);
  lines.forEach((l, i) => {
    const at = `${f}:${i + 1}`;
    if (hexLines) {
      for (const m of hexLines[i].matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        const hex = m[0].toLowerCase();
        if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/.test(hex) && !/&#|href=|url\(#/.test(l)) problems.push(`${at}  ${PALETTE.has(hex) ? 'hardcoded brand hex' : 'OFF-PALETTE hex'} ${m[0]} → use a --mm-* variable`);
      }
    }
    const ff = l.match(/font-?family\s*[:=]\s*['"`]?([^;'"`}]+)/i);
    if (ff && !exempt && !/var\(--mm-font|Manrope|Inter|inherit/.test(ff[1])) problems.push(`${at}  font-family "${ff[1].trim()}" → use var(--mm-font-heading|body)`);
    const caps = l.replace(/MHANDISI MAKINI/g, '').match(/>[^<{]*\b[A-Z]{3,}\s+[A-Z]{2,}[^<{]*</);
    if (caps) problems.push(`${at}  all-caps UI text "${caps[0].slice(1, -1).trim()}" → sentence case`);
    if (/<input\b/.test(l) && /placeholder=/.test(l) && !/aria-label|id=|\{\.\.\./.test(l)) problems.push(`${at}  input may lack a label → add <label htmlFor>`);
    if (/outline\s*:\s*(none|0)/.test(l) && !/focus-ring|box-shadow/.test(l)) problems.push(`${at}  outline removed without a focus replacement`);
  });
}
try { walk(root); } catch (e) { console.error(`Cannot read ${root}: ${e.message}`); process.exit(2); }
if (!problems.length) { console.log('Brand check passed.'); process.exit(0); }
console.log(problems.join('\n')); console.log(`\n${problems.length} issue(s).`); process.exit(1);
