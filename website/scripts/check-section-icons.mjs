import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(root, 'pages-dist');
const sections = ['home','astronomy','skywatcher','campaigns','patterns','writing','cocktails','workshop','games'];
for (const section of sections) {
  assert(readFileSync(resolve(dist, `icons/${section}.svg`), 'utf8').includes('<svg'));
  for (const size of [32,48,180]) {
    const png = readFileSync(resolve(dist, `icons/${section}-${size}.png`));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
}
const routes = {
  'index.html':'home', 'artifact/origin/index.html':'home',
  'artifact/sky/index.html':'astronomy', 'artifact/sky/photos/index.html':'astronomy', 'astronomy/index.html':'astronomy', 'astronomy/gallery/index.html':'astronomy',
  'skywatcher/index.html':'skywatcher', 'artifact/campaigns/index.html':'campaigns', 'dnd/index.html':'campaigns',
  'artifact/patterns/index.html':'patterns', 'artifact/writing/index.html':'writing',
  'artifact/cocktails/index.html':'cocktails', 'study/cabinet/index.html':'cocktails', 'cocktails/index.html':'cocktails',
  'artifact/workshop/index.html':'workshop', 'artifact/games/index.html':'games', 'games/index.html':'games',
};
const links = html => (html.match(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)||[]).filter(tag=>/\brel=["'][^"']*\bicon\b/i.test(tag));
for (const [route, section] of Object.entries(routes)) {
  const tags = links(readFileSync(resolve(dist,route),'utf8'));
  assert(tags.some(tag=>tag.includes(`/icons/${section}.svg`)),route);
  assert(tags.some(tag=>tag.includes(`/icons/${section}-32.png`)),route);
  assert(tags.some(tag=>tag.includes(`/icons/${section}-180.png`)),route);
  assert(tags.every(tag=>!tag.includes('/favicon')),`${route}: old shared icon`);
}
function checkChildren(dir) {
  for(const entry of readdirSync(dir,{withFileTypes:true})) {
    const file=resolve(dir,entry.name);
    if(entry.isDirectory())checkChildren(file);
    else if(entry.name.endsWith('.html')) {
      const tags=links(readFileSync(file,'utf8'));assert(tags.length,`${file}: missing icon`);
      for(const tag of tags) {
        const href=tag.match(/\bhref=["']([^"']+)/i)?.[1];
        if(href?.startsWith('/'))assert(existsSync(resolve(dist,href.slice(1))),`${file}: missing ${href}`);
      }
    }
  }
}
checkChildren(resolve(dist,'dnd')); checkChildren(resolve(dist,'games'));
console.log('Section icons pass: 9 designs, 17 entry routes, PNG sizes, and icons throughout D&D and Games.');
