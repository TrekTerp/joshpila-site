import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {helioRect,planetNames,localJD,photoJD,lunarState} from '../public/astronomy/astro-engine.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(readFileSync(resolve(root,'content/astronomy/catalog.json'),'utf8'));
assert.equal(catalog.photos.length,88);assert.equal(new Set(catalog.photos.map(p=>p.id)).size,88);
assert.equal(catalog.photos.filter(p=>p.date).length,87);
assert.equal(catalog.photos.filter(p=>p.isComposite&&!p.date).length,1);
assert.equal(catalog.photos.find(p=>p.number===47).date,'2025-01-09');
assert.equal(catalog.photos.find(p=>p.number===49).date,'2025-01-05');
assert.equal(catalog.photos.find(p=>p.number===67).date,'2026-01-10');
for(const p of catalog.photos){for(const key of ['image','thumbnail']){assert(!p[key].includes('..'));assert(existsSync(resolve(root,'public/astronomy',p[key])),p[key]);}assert(!Object.keys(p).some(k=>/latitude|longitude|gpsposition|gpslatitude|gpslongitude/i.test(k)));if(!p.date)assert.equal(photoJD(p),null);else{const jd=photoJD(p);assert(Number.isFinite(jd));assert(jd>2460676&&jd<2461407);}}
for(const g of catalog.relatedSets)for(const id of g.photoIds)assert(catalog.photos.some(p=>p.id===id),id);
const earth=helioRect('Earth',2451545);assert(Math.abs(earth.x+.17717)<.00002);assert(Math.abs(earth.y-.96721)<.00002);
for(const date of [2451545,2461041.5,2461208.5])for(const name of planetNames){const p=helioRect(name,date);assert(Object.values(p).every(Number.isFinite));assert(p.r>0);}
function utc(jd){return(jd-2440587.5)*86400000;}for(const [d,expected]of [['2026-03-19','2026-03-20T04:00:00Z'],['2026-02-12','2026-02-13T05:00:00Z'],['2026-11-01','2026-11-02T05:00:00Z']])assert(Math.abs(utc(localJD(d))-Date.parse(expected))<2);
assert(lunarState(Date.parse('2026-03-03T12:00Z')/86400000+2440587.5).illumination>.99,'March 3 full Moon');assert(lunarState(Date.parse('2026-03-19T01:00Z')/86400000+2440587.5).illumination<.01,'March 19 new Moon');
const g=readFileSync(resolve(root,'public/astronomy/catalog-data.js'),'utf8');assert(g.startsWith('window.JP_ASTRONOMY'));assert.deepEqual(JSON.parse(g.slice(g.indexOf('=')+1).trim().replace(/;$/,'')),catalog);
console.log('Astronomy checks passed: 88 linked photographs, dates, related sets, J2000 Earth position, Pacific DST, and lunar phases.');
