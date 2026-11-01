// Publishable browser configuration. Authorization is enforced by the server.
const url='https://skcjspvcinvknkqvgnfk.supabase.co';
const key='sb_publishable_PyGWyQl3b6-rR_rKK_G86A_XfOjySW_';
export const supabase=window.supabase.createClient(url,key);
export async function apiFetch(path,options={}){
 const {data:{session}}=await supabase.auth.getSession();
 const headers=new Headers(options.headers);
 headers.set('apikey',key);
 if(session?.access_token)headers.set('Authorization','Bearer '+session.access_token);
 return fetch(url+'/functions/v1/cocktails/'+path,{...options,headers});
}
export function installSignIn(toolbar){
 const button=document.createElement('button');button.type='button';button.textContent='Owner sign-in';toolbar.append(button);
 const dialog=document.createElement('dialog');dialog.id='owner-sign-in';
 dialog.innerHTML=`<header><h2>Owner sign-in</h2><button type="button" aria-label="Close">×</button></header><form><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password"></label><button type="submit">Sign in</button><button type="button" id="email-sign-in">Email me a sign-in link</button><p role="status" aria-live="polite"></p></form>`;
 document.body.append(dialog);button.onclick=()=>dialog.showModal();dialog.querySelector('header button').onclick=()=>dialog.close();
 const form=dialog.querySelector('form'),status=dialog.querySelector('[role=status]');
 async function run(magic){
  if(!form.reportValidity())return;
  status.textContent='Signing in…';dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{
   const email=form.elements.email.value.trim(),password=form.elements.password.value;
   if(email.toLowerCase()!=='joshpila@gmail.com')throw Error('Editing is available only to the archive owner.');
   if(!magic&&!password)throw Error('Enter your password, or choose an email sign-in link.');
   const {error}=magic?await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+'/cocktails/?view=calendar'}}):await supabase.auth.signInWithPassword({email,password});
   if(error)throw error;
   if(magic)status.textContent='Check your email for the sign-in link. Open it on this device.';
   else location.reload();
  }catch(error){status.textContent=error.message;}finally{dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 form.onsubmit=e=>{e.preventDefault();void run(false);};dialog.querySelector('#email-sign-in').onclick=()=>void run(true);
}
