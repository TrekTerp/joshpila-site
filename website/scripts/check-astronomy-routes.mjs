import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,'app/astronomy-routing.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,URL});
const redirect=mod.exports.astronomyRedirect;
const cases=[
 ['/artifact/sky/','/astronomy/'],
 ['/artifact/sky','/astronomy/'],
 ['/artifact/sky/index.html?utm_source=bookmark#top','/astronomy/?utm_source=bookmark#top'],
 ['/artifact/sky/?photo=astro-moon-eclipses#photo-viewer','/astronomy/gallery/?photo=astro-moon-eclipses#photo-viewer'],
 ['/artifact/sky/photos/','/astronomy/gallery/'],
 ['/artifact/sky/photos/index.html?photo=astro-moon-phases&view=all#photo-viewer','/astronomy/gallery/?photo=astro-moon-phases&view=all#photo-viewer'],
 ['/astronomy/?photo=astro-e93b89a511d263fe&view=highlights#photo-viewer','/astronomy/gallery/?photo=astro-e93b89a511d263fe&view=highlights#photo-viewer'],
 ['/astronomy/?view=all','/astronomy/gallery/?view=all'],
 ['/astronomy/index.html?photo=astro-moon-eclipses#photo-viewer','/astronomy/gallery/?photo=astro-moon-eclipses#photo-viewer'],
 ['/astronomy/#photo-viewer','/astronomy/gallery/#photo-viewer'],
 ['/astronomy/#photo-grid','/astronomy/gallery/#photo-grid'],
 ['/astronomy/?photo=x%2By&ref=shared%20link#photo-viewer','/astronomy/gallery/?photo=x%2By&ref=shared%20link#photo-viewer'],
 ['/astronomy/',null],['/astronomy/?utm_source=bookmark',null],['/astronomy/#astronomy-heading',null],
 ['/astronomy/gallery/?photo=astro-moon-eclipses#photo-viewer',null],['/skywatcher/',null],
];
for(const [input,output] of cases)assert.equal(redirect('https://www.joshpila.com'+input),output,input);
const dist=resolve(root,'../pages-dist');
const landing=readFileSync(resolve(dist,'astronomy/index.html'),'utf8');
assert(landing.includes('class="astronomy-landing"'));
assert(landing.includes('href="https://www.joshpila.com/astronomy/"'));
assert(landing.includes('href="/astronomy/gallery/"'));
assert(!landing.includes('href="/astronomy/?photo='));
const gallery=readFileSync(resolve(dist,'astronomy/gallery/index.html'),'utf8');
assert(gallery.includes('id="photo-viewer"'));
assert(gallery.includes('href="https://www.joshpila.com/astronomy/gallery/"'));
assert(gallery.includes('href="/astronomy/"'));
for(const match of gallery.matchAll(/(?:src|href)="(\/(?:astronomy|icons|brand)\/[^"?#]+)"/g))assert(existsSync(resolve(dist,match[1].slice(1))),match[1]);
const js=readFileSync(resolve(dist,'astronomy/gallery.js'),'utf8');
assert(!js.includes("'./'+"),'Photo assets must resolve from the original astronomy asset directory');
assert(readFileSync(resolve(dist,'skywatcher/index.html'),'utf8').includes('href="/astronomy/"'));
console.log(`Astronomy routes pass: ${cases.length} redirect cases, landing/gallery pages, canonical URLs, asset paths, and SkyWatcher navigation.`);
