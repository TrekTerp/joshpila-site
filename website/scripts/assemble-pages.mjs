import {cpSync,mkdirSync,existsSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
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
// SkyWatcher also reads the 64px favicon to initialize its header logo.
// Keep that startup dependency while assigning the site icon.
sky=sky.replace(/<link\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi,tag=>/\brel=["'][^"']*\bicon\b/i.test(tag)?'':tag);
sky=sky.replace('</head>','<link rel="icon" type="image/png" sizes="32x32" href="/icons/skywatcher-32.png"><link rel="icon" type="image/png" sizes="64x64" href="/icons/skywatcher-64.png"><link rel="icon" type="image/svg+xml" sizes="any" href="/icons/skywatcher.svg"><link rel="apple-touch-icon" sizes="180x180" href="/icons/skywatcher-180.png"></head>');
sky=sky.replace('</head>','<link rel="canonical" href="https://www.joshpila.com/skywatcher/"></head>');
if(!/<body\b[^>]*>/.test(sky))throw Error('SkyWatcher is missing its body element');
sky=sky.replace(/<body\b[^>]*>/,match=>match+'<nav aria-label="Site navigation" style="display:flex;gap:24px;padding:10px 18px;background:#0e1521;border-bottom:1px solid #26394d;font-size:12px"><a href="/astronomy/" style="color:#a8d6ff">← Astronomy</a><a href="/?selected=sky" style="color:#a8d6ff">Return to Orrery</a></nav>');
mkdirSync(path.join(dest,'skywatcher'),{recursive:true});
writeFileSync(path.join(dest,'skywatcher/index.html'),sky);
// Retain the supplied Life Lab source; add only hosting metadata and return links.
let life=readFileSync(path.join(root,'website/vendor/conways-life-lab.html'),'utf8');
life=life.replace('</head>','<link rel="canonical" href="https://www.joshpila.com/patterns/life/"><link rel="icon" href="/icons/patterns.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icons/patterns-180.png"></head>');
const lifeHeader='<header class="top">';
if(!life.includes(lifeHeader))throw Error('Life Lab header missing; cannot insert site navigation');
life=life.replace(lifeHeader,lifeHeader+'<nav aria-label="Site navigation" style="display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;font-size:13px"><a href="/patterns/" style="color:var(--accent);padding:10px 0">Patterns</a><a href="/?selected=patterns" style="color:var(--accent);padding:10px 0">Return to Orrery</a></nav>');
mkdirSync(path.join(dest,'patterns/life'),{recursive:true});
writeFileSync(path.join(dest,'patterns/life/index.html'),life);
// Build the portable Lab from editable source; never commit its encoded bundle.
const labRoot=path.join(root,'website/vendor/magic-squares-lab');
execFileSync('python3',[path.join(labRoot,'build.py')],{stdio:'inherit'});
let lab=readFileSync(path.join(labRoot,'dist/magic_squares_lab_combined.html'),'utf8');
lab=lab.replace('</head>','<link rel="canonical" href="https://www.joshpila.com/patterns/magic-squares/"><style>.app-tools{flex-wrap:wrap}.app-tools-context{display:flex;align-items:center;gap:8px 18px;flex-wrap:wrap}.site-return{display:flex;gap:14px}.site-return a{color:var(--copper);padding:5px 0;text-underline-offset:3px}</style></head>');
const labTools='<section class="wrap app-tools" aria-label="Current view and page tools">';
const labActions='<div class="app-tools-right">';
if(!lab.includes(labTools)||!lab.includes(labActions))throw Error('Magic Squares Lab tools missing; cannot insert site navigation');
lab=lab.replace(labTools,labTools+'<div class="app-tools-context"><nav class="site-return" aria-label="Site navigation"><a href="https://www.joshpila.com/patterns/">Patterns</a><a href="https://www.joshpila.com/?selected=patterns">Return to Orrery</a></nav>');
lab=lab.replace(labActions,'</div>'+labActions);
mkdirSync(path.join(dest,'patterns/magic-squares'),{recursive:true});
writeFileSync(path.join(dest,'patterns/magic-squares/index.html'),lab);
console.log('Pages artifact assembled with SkyWatcher, Life Lab, Magic Squares Lab, and existing D&D and Games intact.');
