// Bygger netlify/functions/api.mjs: hela API:t inklusive pg i en enda fil, så att Netlify inte
// behöver installera några paket. Kör efter ändringar i server/: npm run bundle
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const out = 'netlify/functions/api.mjs';
execFileSync('npx', ['-y', 'esbuild@0.24', 'netlify/src/api.mjs', '--bundle', '--platform=node', '--target=node20', '--format=esm',
  '--external:pg-native', `--outfile=${out}`, "--banner:js=import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);"], { stdio: 'inherit' });
// Netlify läser routen från en statisk "export const config".
let s = readFileSync(out, 'utf8');
s = s.replace('var config = { path: "/api/*" };', 'export const config = { path: "/api/*" };');
const i = s.lastIndexOf('export {'); const j = s.indexOf('};', i);
const names = s.slice(i + 8, j).split(',').map((x) => x.trim()).filter((x) => x && x !== 'config');
s = s.slice(0, i) + `export {\n  ${names.join(',\n  ')}\n};` + s.slice(j + 2);
writeFileSync(out, s);
console.log('Klart:', out);
