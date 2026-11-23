"use strict";
const $=s=>document.getElementById(s),mine=$("mine"),glass=$("cockpit"),hud=glass.getContext("2d"),pan=$("panel");
const SAVE="rr.training.v1", PREF="rr.options.v1";
let lastAutosave=0,mapYaw=.64,mapPitch=.38,mapScale=1,mapDrag=null,pressedFlight=false;
let audioCtx,master,previousScreen="",lastFrame=0;
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function write(key,x){try{localStorage.setItem(key,JSON.stringify(x));return true;}catch{return false;}}
function rm(key){try{localStorage.removeItem(key);}catch{}}
function options(){write(PREF,{modern,soundOn,skill});}
function hasSave(){const x=read(SAVE);return !!(x&&x.v===1&&MINES[x.i]&&x.state);}
function saveFlight(){
  if(!S||S.escaped||S.shield<=0||!(["flight","pause","map","controls"].includes(phase)))return;
  write(SAVE,{v:1,i:level,d:skill,state:S,elapsed,randomSeed});lastAutosave=elapsed;
}
function restore(){
  const x=read(SAVE);if(!hasSave())return training();
  prepareLevel(x.i,x.d);S=x.state;elapsed=x.elapsed||0;randomSeed=x.randomSeed??9182;
  for(const e of world.edges)e.open=e.lock?(needKey(e)?1:0):1;
  lastAutosave=elapsed;startFlight("Training restored",true);
}
function audioInit(){
  if(!soundOn)return;
  try{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();
    master.gain.value=.16;master.connect(audioCtx.destination);}if(audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});}catch{}
}
function tone(f,end,len,type="sine",vol=.5,delay=0){
  if(!soundOn||!audioCtx||!master)return;
  const at=audioCtx.currentTime+delay,osc=audioCtx.createOscillator(),amp=audioCtx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(Math.max(end,14),at+len);
  amp.gain.setValueAtTime(.001,at);amp.gain.linearRampToValueAtTime(vol,at+.009);amp.gain.exponentialRampToValueAtTime(.001,at+len);
  osc.connect(amp);amp.connect(master);osc.start(at);osc.stop(at+len+.02);
}
function sfx(type,g=1){
  if(!soundOn)return;
  if(type==="laser"||type==="spread")tone(type==="spread"?510:650,110,.115,"triangle",.38);
  if(type==="missile"){tone(180,34,.42,"sawtooth",.36);tone(60,23,.53,"sine",.62);}
  if(type==="enemy")tone(310,140,.17,"sawtooth",.19*g);
  if(type==="tick")tone(208,75,.045,"triangle",.18);
  if(type==="hit")tone(126,31,.22,"sawtooth",.45);
  if(type==="boom"||type==="core"){tone(103,20,type==="core"?1.1:.50,"sawtooth",.59);tone(64,17,.65,"sine",.87);}
  if(["key","rescue","pickup","win"].includes(type)){
    [370,494,type==="win"?740:620].forEach((v,i)=>tone(v,v*1.02,.18,"sine",.42,i*.085));}
  if(type==="alarm")tone(480,386,.24,"triangle",.34);
  if(type==="flare")tone(460,190,.10,"sine",.32);
}
function campaignLinks(){
  const opts=new URLSearchParams({mode:modern?"evolved":"classic"});
  if(!soundOn)opts.set("muted","1");
  $("originalMenu").href="original/index.html?"+opts;
  opts.set("start","1");$("original").href="original/index.html?"+opts;
  opts.set("data","custom");$("registered").href="original/index.html?"+opts;
}
function setStyle(value){
  const changed=modern!==value;
  modern=value;styleDirty=true;
  if(changed&&renderer){renderer.selectAtlas();if(world)renderer.setWorld(world);}
  document.querySelectorAll("[data-style]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.style==="evolved")===modern)));
  $("styleFlight").textContent=modern?"Evolved":"Classic";
  campaignLinks();options();
}
function setAudio(value){
  soundOn=value;if(master)master.gain.value=value ? .16 : 0;
  $("soundlabel").textContent=value?"Audio on":"Audio off";
  $("sound").setAttribute("aria-pressed",String(value));campaignLinks();options();if(value)audioInit();
}
function releaseMouse(){if(document.pointerLockElement===mine)document.exitPointerLock?.();}
function captureMouse(){
  if(!mine.requestPointerLock||matchMedia("(pointer: coarse)").matches)return;
  try{const result=mine.requestPointerLock();if(result?.catch)result.catch(()=>{});}catch{}
}
function reveal(id,on){$(id).hidden=!on;}
function updateLayers(){
  const run=phase==="flight",nav=phase==="map",homeScreen=phase==="menu";
  const underHome=["menu","training","brief","credits"].includes(phase)||phase==="controls"&&["training","menu"].includes(previousScreen);
  reveal("home",underHome);$("home").inert=!homeScreen;reveal("mast",homeScreen);reveal("mapLayer",nav);
  reveal("panelLayer",!homeScreen&&!run&&!nav);reveal("flightTools",run);
  reveal("touch",run&&matchMedia("(pointer: coarse)").matches);
  glass.style.display=underHome?"none":"";mine.style.display=underHome?"none":"";
}
function b(text,act,cls="secondary"){return '<button class="'+cls+'" data-act="'+act+'">'+text+'</button>';}
function panel(ey,title,body,actions=""){
  pan.innerHTML='<div class="eyebrow">'+ey+'</div><h2 id="panelTitle">'+title+'</h2>'+body+(actions?'<div class="actionRow">'+actions+'</div>':"");
  updateLayers();const focus=pan.querySelector(".primary,button,select");if(focus)focus.focus({preventScroll:true});
}
const drills=[
  ["Flight & combat","Slide past incoming fire, collect the blue key, and escape through the green hatch behind your starting position."],
  ["Vertical navigation","Follow the pump shaft down for the blue key and the hoist up for yellow. Use the survey map to keep track of the decks."],
  ["Reactor escape","Trace the three colored locks through a branching foundry. A pressure seal releases a shortcut when the reactor fails."]
];
function homeMenu(){clearControls();releaseMouse();phase="menu";updateLayers();reveal("resumeHome",hasSave());}
function training(){
  clearControls();releaseMouse();phase="training";
  const rows=MINES.map((m,i)=>'<button class="trainingRow" data-act="brief'+i+'"><i>0'+(i+1)+'</i><span><b>'+m.name+
    '</b><small>'+drills[i][0]+'</small></span><span class="levelTag">'+m.code+'</span></button>').join("");
  panel("OPTIONAL TRAINING","Training mines","<p>Choose any drill. Each is a new, complete mission with its own reactor and escape.</p>"+rows+
    '<label>Difficulty &nbsp; <select id="difficulty" aria-label="Training difficulty">'+["Cadet","Pilot","Ace"].map((x,i)=>'<option value="'+i+'"'+(i===skill?' selected':'')+'>'+x+'</option>').join("")+'</select></label>',
    (hasSave()?b("Resume training","resume","primary"):"")+b("Flight controls","controls")+b("Hangar","home"));
}
let selected=0;
function brief(i){
  selected=i;phase="brief";const m=MINES[i];
  panel("FLIGHT SCHOOL / DRILL 0"+(i+1),m.name,"<p>"+drills[i][1]+"</p><p class='small'>"+
    (i===0?"W/S thrust · A/D slide · Mouse or IJKL aim · Click or Z fires · Tab opens the map.":m.briefing)+"</p>"+
    (hasSave()?"<p class='small'>Launching a drill replaces the current training checkpoint.</p>":""),
    b("Launch drill","launch","primary")+b("Back","training"));
}
function controls(){
  previousScreen=phase;phase="controls";
  const bindings=[["Forward / reverse","W / S"],["Slide left / right","A / D"],["Rise / sink","Space / Shift"],["Roll left / right","Q / E"],
    ["Aim","Mouse / IJKL"],["Primary weapon","Click / Z"],["Missile","Right click / X"],[previousScreen==="menu"?"Weapon select":"Laser / spread",previousScreen==="menu"?"Number keys":"1 / 2"],["Launch flare","F"],["Survey map","Tab"],
    ["Switch graphics","F8"],["Pause","P / Esc"]];
  panel("PILOT REFERENCE","Flight controls","<div class='cols'>"+bindings.map(([l,k])=>"<div class='bind'><span>"+l+"</span><kbd>"+k+"</kbd></div>").join("")+
    "</div><p class='small'>Movement follows the ship’s orientation. Release thrust to slow to a hover. If mouse capture is unavailable, use IJKL to aim.</p>",b("Back","controlsBack","primary"));
}
function pause(){
  if(phase!=="flight")return;saveFlight();phase="pause";clearControls();releaseMouse();showPause();
}
function showPause(){
  phase="pause";panel("TRAINING / "+world.spec.code,"Flight paused","<p>"+world.spec.name+" · "+(roomAt(S.p)?.name||"Transit tunnel")+
    "</p><div class='graphics'><span>GRAPHICS</span><div class='seg'><button data-style='classic'>Classic</button><button data-style='evolved'>Evolved</button></div></div>",
    b("Resume flight","fly","primary")+b("Flight controls","controls")+b("Hangar","home"));setStyle(modern);
}
function startFlight(msg="",lock=false){
  clearControls();phase="flight";acc=0;lastFrame=0;updateLayers();audioInit();if(msg)notify(msg,3.4);
  if(lock)captureMouse();saveFlight();
}
function startDrill(i,carry=null){
  if(!renderer){try{renderer=initRenderer(mine);}catch(e){phase="brief";panel("FLIGHT SYSTEM","Renderer unavailable",
    "<p>This browser could not start the 3D view. Try a browser with WebGL support.</p>",b("Back","training"));console.error(e);return;}}
  prepareLevel(i,skill,carry);lastAutosave=0;startFlight(i===0?"W / S thrust • Mouse or IJKL aim • Click or Z fires":world.spec.briefing,true);
}
function endFlight(outcome){
  clearControls();releaseMouse();
  const saved=read(SAVE);
  if(outcome==="lost"){
    phase="lost";panel("SIGNAL LOST",S.countdown!==null&&S.countdown<=0?"Mine collapsed":"Ship destroyed",
      "<p>"+world.spec.name+" · "+S.kills+" robots destroyed.</p><p class='small'>Retry starts this drill at its launch bay.</p>",
      b("Retry drill","retry","primary")+(saved?.state?.shield>0?b("Last checkpoint","resume"):"")+b("Hangar","home"));
  }else{
    rm(SAVE);phase="clear";
    panel("EXTRACTION CONFIRMED",level===2?"Foundry cleared":"Drill complete",
      "<p>"+world.spec.name+" · "+S.kills+" / "+S.bots.length+" robots destroyed · "+S.hostages+" / "+
      S.pickup.filter(x=>x.type==="hostage").length+" miners rescued.</p><p class='small'>Score "+S.score.toLocaleString()+" · "+
      Math.max(0,Math.ceil(S.countdown))+" seconds to spare</p>",
      (level<2?b("Next drill","next","primary"):b("Original campaign","original","primary"))+b("Training mines","training")+b("Hangar","home"));
  }
}
function openMap(){
  if(phase!=="flight")return;saveFlight();phase="map";clearControls();releaseMouse();updateLayers();
  $("mapInfo").textContent=world.spec.name+" · "+S.visited.length+" / "+world.rooms.length+" rooms surveyed";drawMap();
}
function showCredits(){
  phase="credits";panel("CREDITS","Reactor Run","<p>Descent was created by Parallax Software and published by Interplay. The original campaign uses the Three.js port by mrdoob and contributors.</p>"+
    "<p>The flight school adds three purpose-built training mines, a separate flight engine, new artwork, and synthesized audio.</p>"+
    "<p class='small'><a href='original/' >Original campaign launcher</a> · <a href='https://github.com/mrdoob/three-descent' target='_blank' rel='noopener'>Upstream port and credits</a></p>",b("Hangar","home","primary"));
}
function act(a){
  if(a.startsWith("brief"))return brief(+a.slice(5));
  switch(a){
    case "launch":return startDrill(selected);case "training":return training();case "resume":if(!renderer)renderer=initRenderer(mine);return restore();
    case "home":return homeMenu();case "controls":return controls();
    case "controlsBack":return previousScreen==="pause"?showPause():previousScreen==="menu"?homeMenu():training();case "fly":return startFlight("",true);
    case "retry":return startDrill(level,S.entry);case "next":return startDrill(level+1,{shield:S.shield,energy:S.energy,missiles:S.missiles,
      weapon:S.weapon,spread:S.spread,runHostages:S.runHostages+S.hostages,score:S.score});case "original":location.href=$("original").href;
  }
}
document.addEventListener("click",e=>{
  const st=e.target.closest("[data-style]");if(st){setStyle(st.dataset.style==="evolved");return;}
  const btn=e.target.closest("[data-act]");if(btn)act(btn.dataset.act);
});
document.addEventListener("change",e=>{if(e.target.id==="difficulty"){skill=+e.target.value;options();}});
$("homeControls").onclick=controls;$("training").onclick=training;$("resumeHome").onclick=()=>act("resume");$("homeCredits").onclick=showCredits;
$("sound").onclick=()=>setAudio(!soundOn);$("fullscreen").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
$("styleFlight").onclick=()=>{setStyle(!modern);mine.focus();};$("mapButton").onclick=openMap;$("pauseButton").onclick=pause;
$("closeMap").onclick=()=>startFlight("",true);
function drawHud(){
  const w=glass.width,h=glass.height,u=Math.min(w/900,h/575);
  const g=hud;g.clearRect(0,0,w,h);g.save();g.scale(u,u);const W=w/u,H=h/u;
  const mono='"Courier New",monospace',sans='"Segoe UI",Arial,sans-serif';
  const ink=(x,y,t,size,col,align="left",family=mono,bold=600)=>{
    g.fillStyle=col;g.font=bold+" "+size+"px "+family;g.textAlign=align;g.fillText(t,x,y);};
  const poly=(pts,fill,stroke)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1.5;g.stroke();}};
  if(screenFlash>0){g.fillStyle="rgba(223,49,29,"+(screenFlash*.65)+")";g.fillRect(0,0,W,H);}
  const room=roomAt(S.p),loc=room?.name||"Transit tunnel";
  g.fillStyle="#071316c9";g.fillRect(15,15,Math.max(185,loc.length*9.6+29),48);
  g.fillStyle="#ff9756";g.fillRect(15,15,3,48);
  ink(28,34,world.spec.code+"   /   DRILL 0"+(level+1),11,"#89bab9");
  ink(28,55,loc,17,"#ecf3e9","left",sans);
  const cx=W/2,cy=H/2;g.strokeStyle=fireFlash>.06?"#fef7c0":"#a9e2dbea";g.lineWidth=1.45;
  for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){g.beginPath();g.moveTo(cx+x*6,cy+y*6);g.lineTo(cx+x*13,cy+y*13);g.stroke();}
  g.fillStyle="#ffbd74";g.fillRect(cx-1,cy-1,2,2);
  // Beveled cockpit cheeks leave the central flight area open in both renderers.
  const wing=Math.min(245,W*.28),a=modern?"#101d22ed":"#303e47",s=modern?"#60777a":"#758388";
  poly([[0,H],[0,H-81],[wing-47,H-81],[wing-17,H-51],[wing,H]],a,s);
  poly([[W,H],[W,H-81],[W-wing+47,H-81],[W-wing+17,H-51],[W-wing,H]],a,s);
  const stat=(x,y,label,value,color,right=false)=>{
    ink(x,y,label,11,"#acbebd",right?"right":"left");ink(x,y+25,String(Math.ceil(value)).padStart(3,"0"),24,color,right?"right":"left");
    const bw=Math.min(105,wing*.44),start=right?x-bw:x;g.fillStyle="#0a1115";g.fillRect(start,y+32,bw,5);
    g.fillStyle=color;g.fillRect(start,y+32,bw*Math.min(1,value/100),5);
  };
  stat(20,H-59,"SHIELDS",S.shield,S.shield<=28?"#ff7c65":"#9ee1ed");
  stat(W-20,H-59,"ENERGY",S.energy,"#ffc06c",true);
  ink(wing*.66,H-47,"MSL",10,"#aabbae","center");ink(wing*.66,H-25,String(S.missiles),18,"#eceddd","center");
  ink(W-wing*.66,H-47,"KEYS",10,"#aabbae","center");
  ["blue","yellow","red"].forEach((c,i)=>{const x=W-wing*.66-16+i*15;g.fillStyle=S.keys.includes(c)?{blue:"#4caeff",yellow:"#ffca47",red:"#ff6559"}[c]:"#36464b";g.fillRect(x,H-35,9,12);});
  if(W>670){
    poly([[cx-112,H],[cx-94,H-26],[cx+94,H-26],[cx+112,H]],a,s);
    ink(cx,H-8,S.weapon===2?"SPREAD CANNON":"PULSE LASERS",12,"#d2dddd","center");
  }
  if(S.countdown!==null){const sec=Math.max(0,Math.ceil(S.countdown));
    g.fillStyle="#3e150fe8";g.fillRect(cx-89,17,178,48);
    ink(cx,35,"REACTOR CRITICAL",11,"#ffab86","center");ink(cx,57,String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0"),22,"#ffdcbd","center");}
  if(notice&&elapsed<noticeEnd){
    g.font="600 14px "+sans;let msg=notice;
    const mw=Math.min(W-30,g.measureText(msg).width+26),yy=H-111;
    g.fillStyle="#0b1a20e8";g.fillRect(cx-mw/2,yy,mw,29);g.fillStyle="#e7f4ee";g.textAlign="center";g.fillText(msg,cx,yy+19,mw-10);
  }else if(phase==="flight"&&S.countdown===null){
    const hint=trainingHint(room);if(hint){
      g.font="600 13px "+sans;const ww=Math.min(W-40,g.measureText(hint).width+24);
      g.fillStyle="#0c171bc4";g.fillRect(cx-ww/2,H-110,ww,26);g.fillStyle="#c8d7d4";g.textAlign="center";g.fillText(hint,cx,H-93,ww-9);
    }
  }
  g.restore();
}
function trainingHint(room){
  if(!room)return "";
  if(level===0){
    if(room.id==="dock"&&S.visited.length===1)return "Drill 1 · Fly forward to the transfer hall. The green hatch behind you is your way out.";
    if(room.id==="hub"&&!S.keys.includes("blue"))return "Look for the TOOL CRIB sign. Fly through the blue key to collect it.";
    if(room.type==="shaft")return "Practice vertical thrust · Space rises / Shift sinks relative to your cockpit.";
    if(room.type==="charge")return "Hover over the lit floor ring to recharge energy.";
  }
  if(level===1&&room.id==="pump"&&!S.keys.includes("blue"))return "The shaft opens in the floor. Look down or sink through it.";
  if(level===2&&room.id==="atrium"&&S.keys.length===0)return "Follow the west gantry. Tab opens the 3D survey map.";
  if(room.type==="core"&&S.core>0)return "Destroy the rotating orange reactor. Missiles hit harder.";
  return "";
}
function drawMap(){
  const c=$("mapCanvas"),g=c.getContext("2d"),W=c.width=Math.round(c.clientWidth*devicePixelRatio),H=c.height=Math.round(c.clientHeight*devicePixelRatio);
  const scale=devicePixelRatio,rooms=world.rooms.filter(r=>S.visited.includes(r.id));
  const visible=new Set(rooms);
  const points=rooms.map(r=>r.c),mn=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),mx=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
  const center=mul(add(mn,mx),.5),sz=Math.min(W*.7,H*.60)/Math.max(52,dist(mn,mx)) *mapScale;
  const project=p=>{const [x,y,z]=sub(p,center),xx=x*Math.cos(mapYaw)+z*Math.sin(mapYaw),zz=z*Math.cos(mapYaw)-x*Math.sin(mapYaw);
    return [W*.54+xx*sz,H*.52+(-y*Math.cos(mapPitch)+zz*Math.sin(mapPitch))*sz];};
  for(const e of world.edges){
    const a=visible.has(e.a),b=visible.has(e.b);if(!a&&!b)continue;
    const A=project(a?e.a.c:lerp(e.b.c,e.a.c,.46)),B=project(b?e.b.c:lerp(e.a.c,e.b.c,.46));
    g.strokeStyle=e.lock&&e.lock!=="breach"?"rgb("+colors[e.lock].map(v=>Math.round(v*210)).join(",")+")":"#628f91";
    g.lineWidth=2*scale;g.setLineDash(a&&b?[]:[4*scale,5*scale]);g.beginPath();g.moveTo(...A);g.lineTo(...B);g.stroke();
  }
  g.setLineDash([]);g.font="600 "+Math.round(12*scale)+"px monospace";
  for(const r of rooms){
    const [x,y]=project(r.c);g.fillStyle=r.type==="exit"?"#79de9c":r.type==="core"?"#ff8c51":"#9dbfc0";
    g.fillRect(x-5*scale,y-5*scale,10*scale,10*scale);g.fillStyle="#d6e5de";g.fillText(r.name,x+8*scale,y-7*scale);
  }
  const [x,y]=project(S.p),f=rotate(S.q,[0,0,-1]),[tx,ty]=project(add(S.p,mul(f,6)));
  let ang=Math.atan2(ty-y,tx-x);g.save();g.translate(x,y);g.rotate(ang);g.fillStyle="#ff9a55";g.beginPath();
  g.moveTo(12*scale,0);g.lineTo(-7*scale,7*scale);g.lineTo(-3*scale,0);g.lineTo(-7*scale,-7*scale);g.fill();g.restore();
}
function resize(){
  const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
  const k=renderer?.software?Math.min(1,(modern?674:425)/w,(modern?412:288)/h):modern?Math.min(devicePixelRatio,1.65,1800/w):Math.min(1,600/w,430/h);
  mine.width=Math.max(1,Math.round(w*k));mine.height=Math.max(1,Math.round(h*k));
  mine.style.imageRendering=modern?"auto":"pixelated";
  const ui=Math.min(devicePixelRatio,2);glass.width=Math.round(w*ui);glass.height=Math.round(h*ui);
  styleDirty=false;if(phase==="map")drawMap();
}
function renderFlight(){
  if(!renderer||!S)return;if(styleDirty)resize();
  const view={p:S.p,r:rotate(S.q,[1,0,0]),u:rotate(S.q,[0,1,0]),f:rotate(S.q,[0,0,-1]),
    modern,time:elapsed,alert:S.countdown!==null};
  const [objects,glows]=drawObjects(view);renderer.render(view,objects,glows);drawHud();
}
function frame(stamp){
  requestAnimationFrame(frame);const dt=lastFrame?Math.min(.10,(stamp-lastFrame)/1000):0;lastFrame=stamp;
  if(phase==="flight"){
    acc+=dt;while(acc>=STEP&&phase==="flight"){update(STEP);acc-=STEP;}
    if(events.includes("clear")||events.includes("lost")){
      const outcome=events.includes("clear")?"clear":"lost";events=[];renderFlight();endFlight(outcome);return;
    }
    if(events.includes("save")||elapsed-lastAutosave>5)saveFlight();events=[];renderFlight();
  }else if(styleDirty&&S&&renderer){renderFlight();}
}
const gameKeys=new Set(["KeyW","KeyA","KeyS","KeyD","KeyR","KeyC","KeyQ","KeyE","ArrowLeft","ArrowRight","ArrowUp","ArrowDown",
  "Space","ShiftLeft","ShiftRight","ControlLeft","ControlRight","KeyI","KeyJ","KeyK","KeyL","KeyX","KeyZ","F8","KeyF","KeyP","KeyV","Digit1","Digit2","Tab","Escape"]);
document.addEventListener("keydown",e=>{
  if(phase==="map"){
    if(["Tab","Escape","KeyP"].includes(e.code)){e.preventDefault();if(!e.repeat)startFlight("",true);return;}
    const d=.09;if(e.code==="ArrowLeft")mapYaw-=d;if(e.code==="ArrowRight")mapYaw+=d;
    if(e.code==="ArrowUp")mapPitch=clamp(mapPitch+d,-1.5,1.5);if(e.code==="ArrowDown")mapPitch=clamp(mapPitch-d,-1.5,1.5);
    if(e.code==="Equal")mapScale=clamp(mapScale*1.1,.45,4);if(e.code==="Minus")mapScale=clamp(mapScale/1.1,.45,4);
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Equal","Minus"].includes(e.code)){e.preventDefault();drawMap();}return;
  }
  if(phase!=="flight"){
    if(e.code==="Escape"&&!e.repeat){if(phase==="pause")startFlight("",true);else if(phase==="controls")act("controlsBack");
      else if(phase==="brief")training();else if(["credits","training"].includes(phase))homeMenu();}
    if(e.code==="KeyP"&&phase==="pause"&&!e.repeat)startFlight("",true);return;
  }
  if(!gameKeys.has(e.code))return;e.preventDefault();keys.add(e.code);if(e.repeat)return;
  if(e.code==="Tab")openMap();if(e.code==="Escape"||e.code==="KeyP")pause();
  if(["KeyV","F8"].includes(e.code))setStyle(!modern);if(e.code==="KeyF")flare();
  if(e.code==="Digit1")S.weapon=1;if(e.code==="Digit2"){if(S.spread)S.weapon=2;else notify("Spread cannon not yet recovered",1.3);}
});
document.addEventListener("keyup",e=>keys.delete(e.code));
mine.oncontextmenu=e=>e.preventDefault();
mine.addEventListener("mousedown",e=>{if(phase!=="flight")return;e.preventDefault();buttons.add(e.button);pressedFlight=true;if(!document.pointerLockElement)captureMouse();});
document.addEventListener("mouseup",e=>{buttons.delete(e.button);pressedFlight=false;});
document.addEventListener("mousemove",e=>{if(phase==="flight"&&(document.pointerLockElement===mine||pressedFlight)){
  look[0]+=clamp(e.movementX,-190,190)*.0023;look[1]+=clamp(e.movementY,-190,190)*.0023;}});
let hadLock=false;
document.addEventListener("pointerlockchange",()=>{
  const has=document.pointerLockElement===mine;if(hadLock&&!has&&phase==="flight")pause();hadLock=has;
});
window.addEventListener("blur",()=>{if(phase==="flight")pause();});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&phase==="flight")pause();});
window.addEventListener("pagehide",()=>saveFlight());
window.addEventListener("resize",()=>{styleDirty=true;if(phase==="map")drawMap();});
const mc=$("mapCanvas");
mc.onpointerdown=e=>{mapDrag=[e.clientX,e.clientY];mc.setPointerCapture(e.pointerId);};
mc.onpointermove=e=>{if(!mapDrag)return;mapYaw+=(e.clientX-mapDrag[0])*.008;mapPitch=clamp(mapPitch+(e.clientY-mapDrag[1])*.008,-1.52,1.52);
  mapDrag=[e.clientX,e.clientY];drawMap();};mc.onpointerup=mc.onpointercancel=()=>mapDrag=null;
mc.addEventListener("wheel",e=>{e.preventDefault();mapScale=clamp(mapScale*Math.exp(-e.deltaY*.0014),.45,4);drawMap();},{passive:false});
for(const [id,isMove] of [["movePad",true],["turnPad",false]]){
  const pad=$(id);let own=null;
  const change=e=>{if(e.pointerId!==own)return;const r=pad.getBoundingClientRect(),v=[
    clamp((e.clientX-r.left-r.width/2)/(r.width*.40),-1,1),clamp((e.clientY-r.top-r.height/2)/(r.height*.40),-1,1)];
    if(isMove)touchMove=v;else touchTurn=v;pad.firstElementChild.style.transform="translate("+v[0]*22+"px,"+v[1]*22+"px)";};
  pad.onpointerdown=e=>{own=e.pointerId;pad.setPointerCapture(own);change(e);};pad.onpointermove=change;
  pad.onlostpointercapture=()=>{own=null;if(isMove)touchMove=[0,0];else touchTurn=[0,0];pad.firstElementChild.style.transform="";};
}
document.querySelectorAll("[data-hold]").forEach(b=>{
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.hold);};
  b.onlostpointercapture=()=>keys.delete(b.dataset.hold);
});
const stored=read(PREF);if(stored){modern=stored.modern!==false;soundOn=stored.soundOn!==false;skill=clamp(Number(stored.skill)||0,0,2);}
setStyle(modern);$("soundlabel").textContent=soundOn?"Audio on":"Audio off";
homeMenu();requestAnimationFrame(frame);
