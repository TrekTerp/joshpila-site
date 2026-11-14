/* Canvas view and input. Visual styles never change the rules or consume game RNG. */
(() => {
'use strict';
const $=id=>document.getElementById(id), canvas=$('board'), ctx=canvas.getContext('2d');
const W=720,H=760,top=70,bottom=700,dy=(bottom-top)/16;
const paintedArt=new EvolvedArt(ctx,FRINGER_ART);
const palette=['#dbac58','#6aaca8','#d47e72','#91b474','#ad8dbc'];
const paletteBright=['#e9bd5e','#55c9d0','#f48c93','#a4d66c','#bf9de3'];
let game=new Fringer.Game(), running=false, look='evolved', sound=false, audio=null;
let modalKind='menu', last=0, flash=null, lastHud='', tutorial=-1, savedBest=0;
let paused=false, focusBeforeModal=null;
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try{savedBest=Number(localStorage.getItem('fringer.best.v1'))||0;look=localStorage.getItem('fringer.look.v1')||'evolved';}catch{}
function saveBest(){if(!game.practice&&game.score>savedBest){savedBest=game.score;try{localStorage.setItem('fringer.best.v1',savedBest);}catch{}}}
function playTone(type){
  if(!sound)return;
  try{
    audio??=new(window.AudioContext||window.webkitAudioContext)(); audio.resume();
    const notes=type==='free'?[392,494,587]:type==='untie'?[440,660]:type==='flip'?[330,440]:[165];
    notes.forEach((f,i)=>{const t=audio.currentTime+i*.055,o=audio.createOscillator(),g=audio.createGain();
      o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.10,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+.21);
      o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.23);});
  }catch{}
}
function setLook(value){look=value==='classic'?'classic':'evolved';document.body.dataset.look=look;
  $('classic').setAttribute('aria-pressed',look==='classic');$('evolved').setAttribute('aria-pressed',look==='evolved');
  try{localStorage.setItem('fringer.look.v1',look);}catch{}draw(performance.now());}
function x(col,n=game.ropes.length){return W/2+(col-(n-1)/2)*Math.min(76,570/Math.max(1,n-1));}
const y=row=>top+row*dy;
function rounded(x0,y0,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x0,y0,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function line(path,color,width,shadow=false){
  ctx.beginPath();path();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  if(shadow){ctx.shadowColor='#0008';ctx.shadowBlur=4;ctx.shadowOffsetX=2;ctx.shadowOffsetY=3;}
  ctx.stroke();ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
}
function rope(path,color){
  const classic=look==='classic';
  line(path,classic?'#111':'#0b1d22',classic?12:15);
  line(path,color,classic?8:10,!classic);
  if(!classic){line(path,'#fff4',2);ctx.setLineDash([1,5]);line(path,'#152b2b55',9);ctx.setLineDash([]);}
}
function star(cx,cy,r,color){
  ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r*.27,cy-r*.27);ctx.lineTo(cx+r,cy);
  ctx.lineTo(cx+r*.27,cy+r*.27);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r*.27,cy+r*.27);
  ctx.lineTo(cx-r,cy);ctx.lineTo(cx-r*.27,cy-r*.27);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function draw(t){
  if(look==='evolved'&&paintedArt.render(game,t,flash,reduce))return;
  const classic=look==='classic', bg=classic?'#101b27':'#162b30';
  ctx.clearRect(0,0,W,H);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(classic){ctx.fillStyle='#213342';for(let yy=0;yy<H;yy+=16)for(let xx=(yy%32?8:0);xx<W;xx+=16)ctx.fillRect(xx,yy,1,1);}
  else{
    const g=ctx.createRadialGradient(W/2,H*.4,30,W/2,H/2,600);g.addColorStop(0,'#324b4244');g.addColorStop(1,'#05161b55');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#a7bfad07';ctx.lineWidth=1;
    for(let xx=0;xx<W;xx+=5){ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx,H);ctx.stroke();}
    for(let yy=0;yy<H;yy+=5){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke();}
    // Stitched borders and brass corner pins.
    ctx.setLineDash([3,7]);ctx.strokeStyle='#b7b9a027';ctx.strokeRect(17,17,W-34,H-34);ctx.setLineDash([]);
    for(const xx of [28,W-28])for(const yy of [28,H-28]){ctx.fillStyle='#c3a16b';ctx.beginPath();ctx.arc(xx,yy,2,0,Math.PI*2);ctx.fill();}
  }
  const wood=ctx.createLinearGradient(0,34,0,65);wood.addColorStop(0,classic?'#888':'#9b7d4f');wood.addColorStop(.45,classic?'#ccc':'#b79460');wood.addColorStop(1,classic?'#555':'#5e4a35');
  rounded(45,34,W-90,26,classic?0:5,wood,'#ceb27b66');
  ctx.fillStyle=classic?'#aaa':'#78918a';ctx.font='10px system-ui';ctx.textAlign='left';ctx.fillText(game.practice?'UNTIMED PRACTICE':'THE BAR IS ADVANCING',47,25);
  ctx.textAlign='right';ctx.fillText(`${game.knots.length} KNOT${game.knots.length===1?'':'S'}`,W-47,25);
  const n=game.ropes.length, lanes=game.ropes.map(r=>r.id), ends=Array(n).fill(58);
  const color=id=>(classic?paletteBright:palette)[game.ropes.find(r=>r.id===id)?.color??0];
  for(let c=0;c<n;c++){
    ctx.fillStyle='#111c1f';ctx.beginPath();ctx.ellipse(x(c),48,9,4,0,0,Math.PI*2);ctx.fill();
  }
  const knots=[...game.knots].sort((a,b)=>a.row-b.row||a.col-b.col);
  for(const k of knots){
    const l=k.col,r=l+1,cy=y(k.row),half=dy*.44;
    for(const c of [l,r]){const from=ends[c];rope(()=>{ctx.moveTo(x(c),from);ctx.lineTo(x(c),cy-half);},color(lanes[c]));}
    const left=lanes[l],right=lanes[r];
    const cross=(from,to,id)=>rope(()=>{ctx.moveTo(x(from),cy-half);ctx.bezierCurveTo(x(from),cy-half*.25,x(to),cy+half*.25,x(to),cy+half);},color(id));
    if(k.dir===1){cross(r,l,right);cross(l,r,left);}else{cross(l,r,left);cross(r,l,right);}
    [lanes[l],lanes[r]]=[lanes[r],lanes[l]];ends[l]=ends[r]=cy+half;
    if(k.spark){const pulse=reduce?1:.85+Math.sin(t/330+k.id)*.15;star((x(l)+x(r))/2+22,cy-18,7*pulse,'#f6d48c');}
  }
  for(let c=0;c<n;c++){
    rope(()=>{ctx.moveTo(x(c),ends[c]);ctx.lineTo(x(c),bottom+17);},color(lanes[c]));
    // Loose tassels.
    for(let j=-2;j<=2;j++)line(()=>{ctx.moveTo(x(c)+j*1.5,bottom+14);ctx.quadraticCurveTo(x(c)+j*3,bottom+24,x(c)+j*3.6,bottom+30);},color(lanes[c]),2);
  }
  const danger=game.knots.some(k=>k.row>13);
  ctx.strokeStyle=danger?'#ed8c7c':'#bc827255';ctx.lineWidth=1;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(40,bottom);ctx.lineTo(W-40,bottom);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=danger?'#f4a797':'#ad9082';ctx.textAlign='center';ctx.font='9px system-ui';ctx.fillText('DO NOT LET A KNOT CROSS THIS LINE',W/2,H-18);
  if(!game.practice&&game.bar>=-.3){
    const by=y(game.bar);rounded(35,by-5,W-70,10,classic?0:3,classic?'#c0c0c0':'#ab9270','#dcc7a3');
    for(let c=0;c<n;c++)rounded(x(c)-3,by+3,6,10,2,'#aa9170');
  }
  if(n>=2&&game.state==='playing'){
    const target=game.target(),cx=(x(game.column)+x(game.column+1))/2,cy=Math.min(bottom+10,y(target.row));
    const ww=(x(1)-x(0))*.87;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(game.direction*Math.PI/9);
    rounded(-ww/2-7,-19,ww+14,38,classic?0:6,null,'#ffedb5');ctx.restore();
    // The short slash shows exactly which over-strand angle the frame accepts.
    const sign=game.direction;
    line(()=>{ctx.moveTo(cx-8,cy-sign*7);ctx.lineTo(cx+8,cy+sign*7);},'#fff5cc',3);
    ctx.fillStyle='#ffe7a1';ctx.beginPath();ctx.arc(cx,cy,2,0,Math.PI*2);ctx.fill();
  }
  if(flash&&t-flash.time<650&&!reduce){
    const age=(t-flash.time)/650;ctx.globalAlpha=1-age;ctx.fillStyle='#ffdd99';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText(flash.text,flash.x,flash.y-age*40);ctx.globalAlpha=1;
  }
}
function hud(){
  $('level').textContent=game.practice?'PRACTICE':String(game.level).padStart(2,'0');
  $('score').textContent=game.score.toLocaleString();$('freed').textContent=`${game.cleared} / ${game.startRopes}`;
  $('best').textContent=savedBest.toLocaleString();$('bonus').textContent=game.practice?'∞':game.bonuses;
  $('flip').disabled=!game.practice&&game.bonuses===0;
  const active=running&&!paused&&!modalKind;
  for(const id of ['left','right','twist'])$(id).disabled=!active;
  $('flip').disabled=!active||(!game.practice&&game.bonuses===0);
  $('pause').disabled=!running; $('pause').textContent=paused?'Resume':'Pause';
}
function status(text){if(text!==lastHud){$('status').textContent=text;lastHud=text;}}
function targetStatus(){
  if(game.practice&&tutorial===0)return status('Lesson 1: the frame is over a knot. Press Space or tap Twist / untwist.');
  if(game.practice&&tutorial===1)return status('Lesson 2: different colors, wrong angle. Press ↓ to turn, then Space to untie.');
  if(game.practice)return status('Lesson 3: use ← → to choose a pair. Free all four ropes. Turns are unlimited.');
  status('← → choose a pair · Space twist / untwist · ↓ spend a turn bonus');
}
function showModal(kind,html){
  focusBeforeModal=document.activeElement;modalKind=kind;$('modal').innerHTML=html;
  $('modal').setAttribute('role','dialog');$('modal').setAttribute('aria-modal','true');
  $('modal').setAttribute('aria-label',$('modal').querySelector('h2')?.textContent||'Fringer');
  $('overlay').hidden=false;hud();$('modal').querySelector('button,a')?.focus();
}
function closeModal(){modalKind=null;$('overlay').hidden=true;last=performance.now();hud();canvas.focus();}
const button=(action,label,primary=false)=>`<button data-action="${action}" class="${primary?'primary':'secondary'}">${label}</button>`;
function menu(){running=false;paused=false;tutorial=-1;game=new Fringer.Game();
  showModal('menu',`<span class="eyebrow">A RETRO DISK BOX REMAKE</span><h2>Fringer</h2><p>A few colored ropes.<br>A wonderfully tangled problem.</p><p>Unweave every knot before the bar pushes it to the bottom.</p>${button('start','Play Fringer',true)}<br>${button('learn','Learn to play')}<p class="fine">Keyboard, mouse, or touch · best score saved here</p>`);status('Untie the knots. Free every rope.');
}
function start(){tutorial=-1;game=new Fringer.Game();running=true;paused=false;closeModal();targetStatus();}
function lessonBoard(index){
  tutorial=index;game=new Fringer.Game(42,true);game.ropes=Array.from({length:index===2?4:2},(_,id)=>({id,color:index===0?0:id%2}));
  game.knots=index===2?[{id:0,col:1,row:3,dir:1,spark:true,original:true},{id:1,col:0,row:5,dir:-1,spark:false,original:true},{id:2,col:2,row:6,dir:1,spark:true,original:true}]:[{id:0,col:0,row:6,dir:1,spark:index===1,original:true}];
  game.direction=index===1?-1:1;game.column=index===2?2:0;game.state='playing';game.score=0;game.cleared=0;game.startRopes=game.ropes.length;game.nextId=3;game.bar=-1.2;
  running=true;paused=false;closeModal();targetStatus();
}
function act(){
  if(!running||paused||modalKind)return;
  const target=game.target(),pos={x:(x(game.column)+x(game.column+1))/2,y:y(target.row)};
  const event=game.twist();if(!event)return;
  if(event.type==='untie'){
    playTone(event.freed?'free':'untie');
    flash={...pos,time:performance.now(),text:event.freed?`${event.freed} rope${event.freed===1?'':'s'} freed`:event.spark?'✦ +1 turn':event.points?`+${event.points}`:'Untied'};
    status(event.spark?'Spark collected: +1 turn bonus.':event.freed?`${event.freed} rope${event.freed===1?'':'s'} freed. Keep going!`:'Knot untied. Your frame turns after each move.');
  }else{playTone('twist');status('A twist was added. Your angle has changed.');}
  afterAction();
}
function afterAction(){
  saveBest();hud();
  if(game.state==='won'){
    if(tutorial>=0){
      showModal('lessonWon',`<span class="eyebrow">LESSON ${tutorial+1} OF 3</span><h2>${tutorial===2?'You’ve got it.':'Nicely untied.'}</h2><p>${tutorial===0?'Same-color knots can be untied from either angle. Different colors ask a little more of you.':tutorial===1?'A turn bonus changes the frame without adding a knot. Sparkling knots replenish your supply.':'In a real game, the bar advances and turn bonuses are limited. Keep working from the loose ends.'}</p>${button(tutorial===2?'start':'nextLesson',tutorial===2?'Play Fringer':'Next lesson',true)}`);
    }else showModal('won',`<span class="eyebrow">LEVEL ${game.level} COMPLETE</span><h2>All unwoven.</h2><p>${game.startRopes} ropes freed · ${game.timeBonus} time bonus</p><p>Score <b>${game.score.toLocaleString()}</b></p>${button('next','Next level',true)}${button('menu','Main menu')}`);
  }else if(game.state==='lost')showModal('lost',`<span class="eyebrow">THE TANGLE CAUGHT UP</span><h2>One knot too far.</h2><p>Level ${game.level} · ${game.totalFreed} ropes freed</p><p>Final score <b>${game.score.toLocaleString()}</b></p>${button('start','Try again',true)}${button('menu','Main menu')}`);
}
function pause(){
  if(!running)return;
  if(modalKind==='paused'){paused=false;closeModal();return;}
  if(modalKind)return;paused=true;
  showModal('paused',`<span class="eyebrow">TAKE YOUR TIME</span><h2>Paused.</h2><p>The ropes can wait.</p>${button('resume','Resume',true)}${button('restart','New game')}`);status('Paused.');
}
function help(){showModal('help',`<span class="eyebrow">HOW TO PLAY</span><h2>Find your angle.</h2><p>Move the frame left or right. It rises to the lowest reachable position between two ropes.</p><p><b>Space</b> unties a knot when your frame matches the angle of the thread passing over the top. Same-color knots work from either angle.</p><p>At a blocked pair, Space adds a twist. Every twist or untwist turns your frame.</p><p><b>↓</b> spends a sparkling-knot bonus to turn without twisting. Freed ropes vanish. A knot reaching the bottom ends the game.</p>${button('close','Got it',true)}`);}
function about(){showModal('about',`<span class="eyebrow">REMADE FOR THE GAME PACK</span><h2>A familiar tangle.</h2><p>Inspired by Fringer, designed by Alexey Pajitnov and Vladimir Pokhilko for Microsoft’s 1997 <i>The Puzzle Collection</i>.</p><p>This is a fresh browser implementation with new art, generated levels, sound and scoring. Classic and Evolved change only the presentation.</p><p class="fine">v1 implements the core rope, angle, sparkle and advancing-bar game. Original fire, repaint and bonus-stage variations are not implemented. Timing and scoring are newly tuned.</p><p class="fine"><a href="https://www.lexaloffle.com/bbs/?pid=picofringer-3" target="_blank" rel="noreferrer">Rules cross-check: Pico Fringer ↗</a></p>${button('close','Back',true)}`);}
function returnToGame(){
  if(!running){menu();return;}
  paused=false;
  if(game.state==='playing'){closeModal();targetStatus();}else afterAction();
}
function restart(){showModal('restart',`<h2>Start again?</h2><p>This ends the current run.</p>${button('start','New game',true)}${button('close','Keep playing')}`);}
$('modal').addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='start')start();else if(action==='learn')lessonBoard(0);else if(action==='nextLesson')lessonBoard(tutorial+1);
  else if(action==='resume'){paused=false;closeModal();targetStatus();}
  else if(action==='menu')menu();else if(action==='restart')restart();
  else if(action==='next'){game.next();closeModal();targetStatus();}
  else if(action==='close')returnToGame();
});
$('evolved').onclick=()=>setLook('evolved');$('classic').onclick=()=>setLook('classic');
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',sound);$('sound').setAttribute('aria-label',sound?'Disable sound':'Enable sound');if(sound)playTone('untie');};
$('pause').onclick=pause;$('help').onclick=help;$('about').onclick=about;
$('newGame').onclick=()=>running?restart():start();$('lesson').onclick=()=>{
  if(running)showModal('restart',`<h2>Open the lesson?</h2><p>This ends your current run.</p>${button('learn','Learn to play',true)}${button('close','Keep playing')}`);else lessonBoard(0);
};
$('homeLink').onclick=e=>{e.preventDefault();if(running)restart();else menu();};
function move(d){if(!running||paused||modalKind)return;game.move(d);targetStatus();}
function flip(){if(!running||paused||modalKind)return;if(game.flip()){playTone('flip');status('Frame turned. No knot added.');}else status('No turn bonuses left. Untie a sparkling knot to earn one.');hud();}
$('left').onclick=()=>move(-1);$('right').onclick=()=>move(1);$('twist').onclick=act;$('flip').onclick=flip;
function point(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};}
function selectPoint(e){if(!running||paused||modalKind||game.ropes.length<2)return;const p=point(e);let col=0,min=Infinity;for(let i=0;i<game.ropes.length-1;i++){const d=Math.abs(p.x-(x(i)+x(i+1))/2);if(d<min){min=d;col=i;}}game.select(col);}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')selectPoint(e);});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();canvas.focus();selectPoint(e);act();});
window.addEventListener('keydown',e=>{
  if(e.key==='Tab'&&modalKind){const items=[...$('modal').querySelectorAll('button,a')];if(items.length){if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}}return;}
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();if(modalKind&&modalKind!=='paused'){if(['help','about','restart'].includes(modalKind))returnToGame();}else pause();return;}
  if(modalKind)return;
  // Preserve normal keyboard operation for focused buttons and links.
  if(/^(BUTTON|A)$/.test(document.activeElement?.tagName)&&[' ','Enter'].includes(e.key))return;
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))e.preventDefault();
  if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1);
  else if(e.key===' '&&!e.repeat)act();else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&!e.repeat)flip();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!modalKind&&!paused)pause();});
window.addEventListener('blur',()=>{if(running&&!modalKind&&!paused)pause();});
function fit(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw(performance.now());}
new ResizeObserver(fit).observe(canvas);
function frame(now){const dt=last?Math.min(.25,(now-last)/1000):0;last=now;
  if(running&&!paused&&!modalKind){game.tick(dt);if(game.state==='lost')afterAction();}
  draw(now);requestAnimationFrame(frame);
}
setLook(look);menu();fit();requestAnimationFrame(frame);
})();
