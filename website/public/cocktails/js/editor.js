import { apiFetch, supabase, installSignIn } from './backend.js';
import { inferIngredients } from './import-parser.js';
import { installCardPhotoUpload } from './photo-upload.js';
const data=await window.cocktailReady;
const session=await apiFetch('session',{cache:'no-store'}).then(r=>r.json()).catch(()=>({canEdit:false}));
const toolbar=document.createElement('div');toolbar.className='owner-tools';
if(!session.canEdit){
  installSignIn(toolbar);document.querySelector('main').prepend(toolbar);
}else{
  toolbar.innerHTML='<span>Your archive</span><button id="owner-add-day" type="button">Add a day</button><button id="owner-export" type="button">Export records</button><button id="owner-signout" type="button">Sign out</button>';
  document.querySelector('main').prepend(toolbar);
  toolbar.querySelector('#owner-signout').onclick=async()=>{await supabase.auth.signOut();location.reload();};
  toolbar.querySelector('#owner-export').onclick=async()=>{try{const r=await apiFetch('export');if(!r.ok)throw Error('Could not export records.');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='cocktail-archive.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){alert(e.message);}};
  const dialog=document.createElement('dialog');dialog.id='archive-editor';
  dialog.innerHTML=`<header><h2 id="editor-title">Update your archive</h2><button type="button" id="editor-close" aria-label="Close editor">×</button></header>
  <p id="editor-status" role="status" aria-live="polite"></p>
  <section id="day-editor" hidden><form id="import-form"><label>Recipe post link<input type="url" id="import-url" required placeholder="https://www.reddit.com/r/cocktails/comments/…"></label>
    <details id="paste-source"><summary>Paste the post text instead</summary><label>Source text<textarea id="import-text" rows="8" maxlength="100000"></textarea></label></details><button type="submit">Read recipe</button></form>
    <form id="review-form" hidden><h3>Review before saving</h3><p class="editor-help">Save the ingredients, quantities, and concise preparation steps. Leave source stories and article text out of the recipe. The full source text is kept for your private reference and is not displayed to visitors.</p><p id="import-warning" class="callout"></p>
    <div class="editor-date"><label>Year<input id="entry-year" type="number" min="2020" max="2100" required></label><label>December day<input id="entry-day" type="number" min="1" max="24" required></label></div>
    <label>Drink name<input id="entry-name" maxlength="200" required></label><div id="entry-specs"></div><button type="button" id="add-variant">Add another variant</button>
    <details><summary>Original source text</summary><pre id="original-source"></pre></details>
    <label class="confirm-review"><input type="checkbox" id="reviewed" required> I checked the date, variants, measures, and method, and removed any copied stories or article text.</label>
    <button type="submit">Save day</button></form></section>`;
  dialog.setAttribute('aria-labelledby','editor-title');document.body.append(dialog);
  const $=id=>document.getElementById(id);
  let draft=null,busy=false;
  const catalog=[...new Map(data.recipes.flatMap(r=>r.specs.flatMap(s=>s.ingredients)).map(i=>[i.name,i])).values()];
  const status=(message,error=false)=>{$('editor-status').textContent=message;$('editor-status').classList.toggle('error',error);};
  const setBusy=value=>{busy=value;dialog.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=value);};
  async function api(path,body){const res=await apiFetch(path,{method:'POST',headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body)});const result=await res.json();if(!res.ok){const e=Error(result.error||'Could not save. Please try again.');e.needsText=result.needsText;throw e;}return result;}
  function show(){ $('day-editor').hidden=false;$('editor-title').textContent='Add an Advent day';status('');if(!dialog.open)dialog.showModal(); }
  $('editor-close').onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  $('owner-add-day').onclick=show;
  installCardPhotoUpload(data);
  function refresh(year,day){const url=new URL(location.href);url.searchParams.set('view','calendar');url.searchParams.set('year',year);url.searchParams.set('day',day);url.searchParams.delete('recipe');if(window.parent!==window)window.parent.postMessage({type:'cocktail-archive-updated',year:Number(year)},location.origin);location.replace(url);}
  function addSpec(spec={name:'',ingredientsText:'',instructions:'',tags:''}){const field=document.createElement('fieldset');field.className='recipe-review-spec';const legend=document.createElement('legend');legend.textContent='Recipe variant';field.append(legend);for(const [key,label,rows] of [['name','Variant name',0],['ingredientsText','Ingredients and quantities, one per line',5],['instructions','Method / garnish',4],['tags','Search ingredients, comma separated',2]]){const l=document.createElement('label');l.textContent=label;const input=document.createElement(rows?'textarea':'input');if(rows)input.rows=rows;input.dataset.field=key;input.value=spec[key]||(key==='tags'?inferIngredients(spec.ingredientsText,catalog).map(i=>i.name).join(', '):'');input.required=key==='name'||key==='ingredientsText';l.append(input);field.append(l);}const remove=document.createElement('button');remove.type='button';remove.textContent='Remove variant';remove.onclick=()=>field.remove();field.append(remove);$('entry-specs').append(field);}
  $('add-variant').onclick=()=>addSpec();
  $('import-form').onsubmit=async e=>{e.preventDefault();if(busy)return;setBusy(true);$('review-form').hidden=true;status('Reading the source…');try{draft=await api('import-preview',{url:$('import-url').value,text:$('import-text').value});$('entry-year').value=draft.year||new Date().getFullYear();$('entry-day').value=draft.day||'';$('entry-name').value=draft.name;$('import-warning').textContent=draft.warnings.join(' ');$('original-source').textContent=draft.sourceText;$('entry-specs').replaceChildren();draft.specs.forEach(addSpec);$('reviewed').checked=false;$('review-form').hidden=false;status('Draft ready. Nothing has been saved yet.');$('paste-source').open=false;$('review-form').scrollIntoView({block:'start'});}catch(err){status(err.message,true);if(err.needsText)$('paste-source').open=true;}finally{setBusy(false);}};
  $('review-form').onsubmit=async e=>{e.preventDefault();if(busy||!draft)return;setBusy(true);status('Saving the day…');try{const specs=[...$('entry-specs').children].map(field=>Object.fromEntries([...field.querySelectorAll('[data-field]')].map(i=>[i.dataset.field,i.value])));const result=await api('entries',{...draft,year:Number($('entry-year').value),day:Number($('entry-day').value),name:$('entry-name').value,specs,reviewed:$('reviewed').checked});status('Day saved.');refresh(result.year,result.day);}catch(err){status(err.message,true);}finally{setBusy(false);}};
}
