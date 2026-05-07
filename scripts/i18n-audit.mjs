import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/shared/i18n/locales');
const NAMESPACES = ['admission', 'app', 'chat', 'coding', 'common', 'diff', 'filter', 'help', 'inspect', 'mode', 'overlay', 'prefs', 'review', 'search'];
const LOCALES = fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory());

function flatKeys(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k)
  );
}

function load(loc, ns) {
  const p = path.join(ROOT, loc, `${ns}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

let problems = 0;
for (const ns of NAMESPACES) {
  const baseKeys = new Set(flatKeys(load('en', ns) ?? {}));
  for (const loc of LOCALES) {
    if (loc === 'en') continue;
    const data = load(loc, ns);
    if (!data) {
      console.error(`MISSING FILE: ${loc}/${ns}.json`);
      problems++;
      continue;
    }
    const keys = new Set(flatKeys(data));
    const missing = [...baseKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseKeys.has(k));
    for (const k of missing) {
      console.error(`MISSING KEY: ${loc}/${ns}: ${k}`);
      problems++;
    }
    for (const k of extra) {
      console.warn(`EXTRA KEY:   ${loc}/${ns}: ${k}`);
    }
  }
}
console.log(problems === 0 ? '\n✓ i18n keys are in sync.' : `\n✗ ${problems} problem(s) found.`);
process.exit(problems === 0 ? 0 : 1);
