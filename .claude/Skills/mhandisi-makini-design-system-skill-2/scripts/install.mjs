#!/usr/bin/env node
// Copies the Mhandisi Makini kit into a project. Cross-platform (Node 18+), never overwrites unless --force.
// Usage: node install.mjs [--project .] [--styles src/styles/mhandisi-makini] [--react src/components/mhandisi-makini]
//                        [--brand public/brand] [--tailwind v3|v4] [--no-react] [--force]
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const flag = k => args.includes(`--${k}`);
const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const root = resolve(opt('project', '.'));
const hasSrc = existsSync(join(root, 'src'));
const dest = {
  styles: opt('styles', hasSrc ? 'src/styles/mhandisi-makini' : 'styles/mhandisi-makini'),
  react: opt('react', hasSrc ? 'src/components/mhandisi-makini' : 'components/mhandisi-makini'),
  brand: opt('brand', existsSync(join(root, 'public')) ? 'public/brand' : 'assets/brand'),
};
const force = flag('force'); const done = [], skipped = [];
function copy(from, to) {
  const target = join(root, to);
  if (existsSync(target) && !force) { skipped.push(to); return; }
  mkdirSync(dirname(target), { recursive: true }); cpSync(join(kit, from), target); done.push(to);
}
for (const f of ['tokens.css', 'components.css']) copy(`styles/${f}`, `${dest.styles}/${f}`);
if (!flag('no-react')) copy('react/mhandisi-makini.tsx', `${dest.react}/index.tsx`);
for (const f of readdirSync(join(kit, 'brand'))) copy(`brand/${f}`, `${dest.brand}/${f}`);
const tw = opt('tailwind', null);
if (tw === 'v3') copy('tailwind/mhandisi-makini.preset.cjs', 'mhandisi-makini.preset.cjs');
if (tw === 'v4') copy('tailwind/mhandisi-makini.v4.css', `${dest.styles}/tailwind-theme.css`);
console.log(JSON.stringify({ project: root, written: done, skippedExisting: skipped, paths: dest }, null, 2));
console.log(`\nNext: import "${dest.styles}/tokens.css" then "${dest.styles}/components.css" once at the app root.`);
