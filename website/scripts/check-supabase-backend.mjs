// Exercise the deployed handler with a deterministic Supabase double, no live writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import * as parser from '../lib/cocktails/import.mjs';
import {photosForVariant,photosForDay} from '../lib/cocktails/photos.mjs';
const baseline=JSON.parse(await fs.readFile('content/cocktails/archive.json','utf8'));
const tables={cocktail_entries:[],cocktail_photos:[]},objects=new Map();let actor=null;
const storage={getPublicUrl:key=>({data:{publicUrl:'https://storage.test/'+key}}),async upload(key,bytes){assert.ok(!objects.has(key));objects.set(key,bytes);return{error:null};},async remove(keys){keys.forEach(k=>objects.delete(k));return{error:null};}};
const sb={auth:{async getUser(){return {data:{user:actor},error:null};}},storage:{from:()=>storage},from(table){
 const filters=[];let fields='*';
 const selected=()=>tables[table].filter(r=>filters.every(([k,v])=>r[k]===v)).map(r=>fields==='*'?r:Object.fromEntries(fields.split(',').map(k=>[k,r[k]])));
 return {select(value='*'){fields=value;return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},async range(start,end){return {data:selected().slice(start,end+1),error:null};},async maybeSingle(){return {data:selected()[0]||null,error:null};},async insert(row){
  const conflict=tables[table].some(r=>r.id===row.id||(table==='cocktail_entries'&&(r.year===row.year&&r.day===row.day||r.source_url===row.source_url))||(table==='cocktail_photos'&&(r.year===row.year&&r.day===row.day&&r.digest===row.digest||row.replaces_photo_id&&r.replaces_photo_id===row.replaces_photo_id&&r.replacement_scope===row.replacement_scope)));
  if(conflict)return {error:{code:'23505'}};
  tables[table].push({...row,created_at:new Date().toISOString()});return{error:null};
 }};
}};
globalThis.__edgeTest={sb,baseline,parser,photosForVariant,photosForDay};
let source=await fs.readFile('supabase/functions/cocktails/index.ts','utf8');
source=source.replace(/^import .*;\n/gm,'').replace(/const sb=createClient[^\n]+\n/,'const sb=globalThis.__edgeTest.sb;\n').replace('Deno.serve(handler);','');
source='const {baseline,photosForVariant,photosForDay,parser}=globalThis.__edgeTest;const {parseRecipeText,redditJSONURL,sourceURL,validateDraft,inferIngredients}=parser;\n'+source;
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const owner={id:'00000000-0000-4000-8000-000000000001',email:'joshpila@gmail.com',email_confirmed_at:'2026-11-01'};
async function request(path,body,{user=owner,origin='https://www.joshpila.com',method=body?'POST':'GET'}={}){
 actor=user;const headers={Origin:origin,Authorization:'Bearer test'};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';
 return handler(new Request('https://backend.test/functions/v1/cocktails/'+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined}));
}
for(const user of [null,{...owner,email:'visitor@example.com'},{...owner,email_confirmed_at:null}]){
 assert.equal((await request('entries',{}, {user})).status,403);
 assert.equal((await request('photos',new FormData(),{user})).status,403);
 assert.equal((await request('export',undefined,{user})).status,403);
}
assert.equal((await request('entries',{}, {origin:'https://evil.test'})).status,403);
const text='Advent 2098 Day 24\n## Gin version\n2 oz gin\n1 oz lemon juice\nShake with ice.\n## Rum version\n2 oz rum\n1 oz lime juice\nShake with ice.\nA private narrative about this drink.';
let res=await request('import-preview',{url:'https://example.com/2098/day24',text});assert.equal(res.status,200);const draft=await res.json();assert.equal(draft.specs.length,2);
const entry={...draft,year:2098,day:24,name:'Test cocktail',reviewed:true};
assert.equal((await request('entries',{...entry,reviewed:false})).status,400);
assert.equal((await request('entries',entry)).status,201);
assert.equal((await request('entries',entry)).status,409);
const bytes=await fs.readFile('public/cocktails/photos/'+baseline.photos[0].file);
const form=new FormData();form.set('year','2098');form.set('day','24');form.set('variantId','advent-2098-day-24--v2');form.set('file',new Blob([bytes],{type:'image/jpeg'}),'test.jpg');
res=await request('photos',form);assert.equal(res.status,201,await res.clone().text());const photo=await res.json();
assert.equal((await (await request('photos',form)).json()).duplicate,true);
form.set('variantId','advent-2098-day-24--v1');assert.equal((await request('photos',form)).status,409);
form.set('variantId','advent-2098-day-24--v2');form.set('replacesPhotoId',photo.id);form.set('file',new Blob([bytes,new Uint8Array([1])],{type:'image/jpeg'}),'replace.jpg');
res=await request('photos',form);assert.equal(res.status,201,await res.clone().text());const replacement=await res.json();
assert.equal((await (await request('photos',form)).json()).duplicate,true);
let data=await (await request('archive',undefined,{user:null})).json();
assert.deepEqual(photosForVariant(data,'advent-2098-day-24--v2').map(p=>p.id),[replacement.id]);
assert.equal(objects.size,2,'Both original and replacement bytes are retained.');
assert.ok(!JSON.stringify(data).includes('private narrative'));
assert.ok((await (await request('export')).json()).savedSources.some(s=>s.source_text===text));
form.set('file',new Blob([bytes,new Uint8Array([2])],{type:'image/jpeg'}),'stale.jpg');assert.equal((await request('photos',form)).status,409);
const shared=baseline.recipes.find(r=>r.specs.length>1&&photosForVariant(baseline,r.slug+'--v1').some(p=>photosForVariant(baseline,r.slug+'--v2').some(q=>q.id===p.id)));
const sharedPhoto=photosForVariant(baseline,shared.slug+'--v1').find(p=>photosForVariant(baseline,shared.slug+'--v2').some(q=>q.id===p.id));
form.set('year',String(shared.year));form.set('day',String(shared.day_of_origin));form.set('variantId',shared.slug+'--v1');form.set('replacesPhotoId',sharedPhoto.id);
res=await request('photos',form);assert.equal(res.status,201,await res.clone().text());const changed=await res.json();data=await (await request('archive')).json();
assert.ok(photosForVariant(data,shared.slug+'--v1').some(p=>p.id===changed.id));
assert.ok(!photosForVariant(data,shared.slug+'--v1').some(p=>p.id===sharedPhoto.id));
assert.ok(photosForVariant(data,shared.slug+'--v2').some(p=>p.id===sharedPhoto.id));
console.log('PASS: verified owner enforcement, public reads, source privacy, reviewed imports, duplicate/stale replacement rejection, old-photo retention, sibling variant isolation.');
delete globalThis.__edgeTest;
