import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import baseline from './archive.json' with { type: 'json' };
import { parseRecipeText, redditJSONURL, sourceURL, validateDraft, inferIngredients } from './import.mjs';
import { photosForVariant, photosForDay } from './photos.mjs';
const OWNER='joshpila@gmail.com';
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket=sb.storage.from('cocktail-photos');
const origins=new Set(['https://www.joshpila.com','https://joshpila.com','https://trekterp.github.io','http://localhost:3000','http://127.0.0.1:3000']);
class Conflict extends Error {}
async function rows(table:string,columns='*') {
 const result:any[]=[];
 for(let offset=0;;offset+=500){const {data,error}=await sb.from(table).select(columns).order('created_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);if(error)throw Error('Archive storage is unavailable.');result.push(...(data||[]));if(!data||data.length<500)return result;}
}
function yearList(data:any) {
 const explicit=new Map(data.years.map((y:any)=>[y.year,y.status]));
 return [...new Set([...data.recipes.map((r:any)=>r.year),...data.daySlots.map((s:any)=>s.year),...explicit.keys()])].sort((a:any,b:any)=>a-b).map(year=>{
 const slots=data.daySlots.filter((s:any)=>s.year===year),photos=new Set(slots.flatMap((s:any)=>s.photo_ids));
 return {year,status:explicit.get(year)==='backfill'?'Backfill':slots.length?'Archive':'Upcoming',days:slots.length,photos:photos.size,photographed:photos.size>0};});
}
async function archive() {
 const data:any=structuredClone(baseline);
 const [entries,photos]=await Promise.all([rows('cocktail_entries','recipe_json,created_at'),rows('cocktail_photos')]);
 for(const row of entries){const recipe=row.recipe_json;data.recipes.push(recipe);data.daySlots.push({year:recipe.year,day:recipe.day_of_origin,official_recipe_slug:recipe.slug,actual_recipe_slug:recipe.slug,actual_recipe_name:null,substitution_reason:null,photo_ids:[],actual_variant_id:null});}
 for(const row of photos){data.photos.push({id:row.id,file:'',url:bucket.getPublicUrl(row.object_key).data.publicUrl,recipe_slug:row.recipe_slug,variant_id:row.variant_id,replaces_photo_id:row.replaces_photo_id,replacement_scope:row.replacement_scope,role:'primary',confidence:'confirmed',source:'owner-upload',source_post_date:row.created_at.slice(0,10),notes:row.caption});const day=data.daySlots.find((s:any)=>s.year===row.year&&s.day===row.day);if(day)day.photo_ids.unshift(row.id);}
 return {...data,archiveYears:yearList(data)};
}
async function limited(stream:ReadableStream<Uint8Array>|null,limit:number){if(!stream)return new Uint8Array();const reader=stream.getReader(),chunks=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('This request is too large.');}chunks.push(value);}const result=new Uint8Array(length);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;}
function imageMime(b:Uint8Array){if(b[0]===255&&b[1]===216&&b[2]===255)return'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return'image/png';if(new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP')return'image/webp';return null;}
async function owner(req:Request){const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return null;const {data,error}=await sb.auth.getUser(token);const u=data?.user;return !error&&u?.email_confirmed_at&&u.email?.toLowerCase()===OWNER?u:null;}
export async function handler(req:Request):Promise<Response>{
 const origin=req.headers.get('Origin')||'',allowed=origins.has(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}:{})};
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers});
 const endpoint=new URL(req.url).pathname.split('/cocktails/')[1]||'';
 try {
  if(req.method==='GET'&&endpoint==='archive')return json(await archive());
  if(req.method==='GET'&&endpoint==='years')return json((await archive()).archiveYears);
  const user=await owner(req);
  if(req.method==='GET'&&endpoint==='session')return json({canEdit:!!user,signedIn:!!user});
  if(!user)return json({error:'Sign in as the site owner to save changes.'},403);
  if(req.method==='GET'&&endpoint==='export')return json({...await archive(),savedSources:await rows('cocktail_entries','year,day,source_text,created_at')});
  if(req.method!=='POST')return json({error:'Not found.'},404);
  if(!allowed)return json({error:'Open the editor on joshpila.com to save changes.'},403);
  if(endpoint==='photos'){
   const bytes=await limited(req.body,13*1024*1024);
   const form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('Content-Type')||''}}).formData();
   const year=Number(form.get('year')),day=Number(form.get('day')),variantId=String(form.get('variantId')||''),caption=String(form.get('caption')||'').trim(),replacesPhotoId=String(form.get('replacesPhotoId')||'');
   const scope=variantId||`day:${year}:${day}`,file=form.get('file');
   if(!(file instanceof File)||!file.size||file.size>12*1024*1024||caption.length>1000)throw Error('Choose a JPEG, PNG, or WebP under 12 MB and a caption under 1,000 characters.');
   const data=await archive(),slot=data.daySlots.find((s:any)=>s.year===year&&s.day===day);
   if(!slot)throw Error('Save the day first, then add its photographs.');
   const candidates=data.recipes.filter((r:any)=>r.slug===slot.actual_recipe_slug||r.slug===slot.official_recipe_slug);
   const recipe=variantId?candidates.find((r:any)=>r.specs.some((_:unknown,i:number)=>`${r.slug}--v${i+1}`===variantId)):candidates.find((r:any)=>r.slug===(slot.actual_recipe_slug||slot.official_recipe_slug));
   if(!recipe)throw Error('Choose a recipe variant from this day.');
   const buffer=new Uint8Array(await file.arrayBuffer()),mime=imageMime(buffer);if(!mime)throw Error('Only JPEG, PNG, and WebP photographs are supported.');
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');
   const {data:existing,error:findError}=await sb.from('cocktail_photos').select('*').eq('year',year).eq('day',day).eq('digest',digest).maybeSingle();if(findError)throw Error('Could not check saved photographs.');
   if(existing){if(replacesPhotoId&&existing.id!==replacesPhotoId&&(existing.replaces_photo_id!==replacesPhotoId||existing.replacement_scope!==scope))throw new Conflict('That image is already saved. Choose a different photo.');if((existing.variant_id||'')!==variantId)throw new Conflict('This photo is already attached to another recipe.');return json({id:existing.id,duplicate:true});}
   if(replacesPhotoId){const shown=variantId?photosForVariant(data,variantId):photosForDay(data,year,day);if(!shown.some((p:any)=>p.id===replacesPhotoId))throw new Conflict('This photo is no longer on this card. Reload before replacing it.');}
   const id=crypto.randomUUID(),object_key=`${year}/${day}/${id}`;
   const {error:uploadError}=await bucket.upload(object_key,buffer,{contentType:mime,upsert:false});if(uploadError)throw Error('Photo upload failed. Please retry.');
   const {error}=await sb.from('cocktail_photos').insert({id,year,day,recipe_slug:recipe.slug,variant_id:variantId||null,object_key,mime,caption,digest,owner_id:user.id,replaces_photo_id:replacesPhotoId||null,replacement_scope:replacesPhotoId?scope:null});
   if(error){await bucket.remove([object_key]);if(error.code==='23505')throw new Conflict('This card was updated by another request. Reload to see it.');throw Error('Could not save the photo record. Please retry.');}
   return json({id,year,day},201);
  }
  if(!req.headers.get('Content-Type')?.includes('application/json'))return json({error:'Expected JSON.'},415);
  const input=JSON.parse(new TextDecoder().decode(await limited(req.body,200000)));
  if(endpoint==='import-preview'){
   const url=sourceURL(input.url);let text=String(input.text||''),title='';
   if(!text.trim()){
    const remote=redditJSONURL(url);if(!remote)return json({needsText:true,error:'Paste the recipe post text below. Automatic fetching supports r/cocktails links.'},422);
    let response;try{response=await fetch(remote,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});}catch{return json({needsText:true,error:'Could not read that post. Paste its text below.'},422);}
    if(!response.ok)return json({needsText:true,error:'The source did not allow this import. Paste the post text below.'},422);
    let source;try{source=JSON.parse(new TextDecoder().decode(await limited(response.body,1500000)));}catch{return json({needsText:true,error:'Could not read this format. Paste the text below.'},422);}
    const post=source?.[0]?.data?.children?.[0]?.data;if(post?.subreddit?.toLowerCase()!=='cocktails'||!post.selftext||['[removed]','[deleted]'].includes(post.selftext))return json({needsText:true,error:'No readable recipe text was available. Paste the text below.'},422);text=post.selftext;title=post.title||'';
   }
   return json({...parseRecipeText(text,title),sourceURL:url});
  }
  if(endpoint==='entries'){
   const draft=validateDraft(input),current=await archive();
   if(current.daySlots.some((s:any)=>s.year===draft.year&&s.day===draft.day))throw new Conflict('That day already has a page. Open it to add photos.');
   if(current.recipes.some((r:any)=>r.source_url===draft.sourceURL))throw new Conflict('That source link is already in the archive.');
   const catalog:any[]=[...new Map(baseline.recipes.flatMap((r:any)=>r.specs.flatMap((s:any)=>s.ingredients)).map((i:any)=>[i.name,i])).values()];
   const slug=`advent-${draft.year}-day-${draft.day}`;
   const specs=draft.specs.map((s:any)=>({name:s.name,fields:[{label:'Ingredients',value:s.ingredientsText},...(s.instructions?[{label:'Method',value:s.instructions}]:[])],ingredients:s.tags?s.tags.split(',').map((n:string)=>n.trim()).filter(Boolean).map((name:string)=>catalog.find(i=>i.name.toLowerCase()===name.toLowerCase())||{name,category:'Other / Mixers',umbrella:false}):inferIngredients(s.ingredientsText,catalog)}));
   const recipe={slug,year:draft.year,day_of_origin:draft.day,date:`${draft.year}-12-${String(draft.day).padStart(2,'0')}`,name:draft.name,base_spirit:'',source_url:draft.sourceURL,source_label:`Advent of Cocktails ${draft.year} · Day ${draft.day}`,ingredients:[...new Map(specs.flatMap((s:any)=>s.ingredients).map((i:any)=>[i.name,i])).values()],specs};
   const {error}=await sb.from('cocktail_entries').insert({id:`${draft.year}-${draft.day}`,year:draft.year,day:draft.day,recipe_json:recipe,source_url:draft.sourceURL,source_text:draft.sourceText,owner_id:user.id});
   if(error){if(error.code==='23505')throw new Conflict('This day or source was already saved. Reload the archive.');throw Error('Could not save the day.');}return json({year:draft.year,day:draft.day,slug},201);
  }
  return json({error:'Not found.'},404);
 }catch(e){return json({error:e instanceof Error?e.message:'Could not save this change.'},e instanceof Conflict?409:400);}
}
Deno.serve(handler);
