import {cpSync,mkdirSync,existsSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dest=path.join(root,'pages-dist');rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
cpSync(path.join(root,'website/out'),dest,{recursive:true});
for(const file of ['dnd','games','CNAME','apple-touch-icon.png','favicon.ico','favicon-32.png','favicon-48.png'])if(existsSync(path.join(root,file)))cpSync(path.join(root,file),path.join(dest,file),{recursive:true});
// The separate SkyWatcher repository remains authoritative. CI checks out the
// reviewed revision; local builds can pass that checkout's index.html explicitly.
const skySource=process.argv[2] || path.join(root,'skywatcher-source/index.html');
let sky=readFileSync(skySource,'utf8');
sky=sky.replaceAll('https://trekterp.github.io/SkyWatcher/','https://www.joshpila.com/skywatcher/');
// This source revision does not include the image referenced in its social tags.
sky=sky.replace(/<meta (?:property="og:image[^"]*"|name="twitter:image") [^>]*>\s*/g,'');
sky=sky.replace('name="twitter:card" content="summary_large_image"','name="twitter:card" content="summary"');
// Assign the site's observing-planner icon without changing the upstream checkout.
sky=sky.replace(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi,tag=>/\brel=["'][^"']*\bicon\b/i.test(tag)?'':tag);
sky=sky.replace('</head>','<link rel="icon" type="image/png" sizes="32x32" href="/icons/skywatcher-32.png"><link rel="icon" type="image/svg+xml" sizes="any" href="/icons/skywatcher.svg"><link rel="apple-touch-icon" sizes="180x180" href="/icons/skywatcher-180.png"></head>');
sky=sky.replace('</head>','<link rel="canonical" href="https://www.joshpila.com/skywatcher/"></head>');
if(!/<body\b[^>]*>/.test(sky))throw Error('SkyWatcher is missing its body element');
sky=sky.replace(/<body\b[^>]*>/,match=>match+'<nav aria-label="Site navigation" style="display:flex;gap:24px;padding:10px 18px;background:#0e1521;border-bottom:1px solid #26394d;font-size:12px"><a href="/artifact/sky/" style="color:#a8d6ff">← Astronomy</a><a href="/?selected=sky" style="color:#a8d6ff">Return to Orrery</a></nav>');
mkdirSync(path.join(dest,'skywatcher'),{recursive:true});
writeFileSync(path.join(dest,'skywatcher/index.html'),sky);
console.log('Pages artifact assembled with SkyWatcher and existing D&D and Games intact.');
