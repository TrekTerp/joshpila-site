"use strict";
const STEP=1/90, playerRadius=.56, shipSpeed=14.2;
const robotTypes={
  scout:{hp:20,speed:2.3,wait:2.4,damage:6,size:.83,points:100},
  gunner:{hp:42,speed:1.1,wait:2.8,damage:9,size:1.17,points:225},
  hunter:{hp:34,speed:4.3,wait:1.85,damage:8,size:.98,points:300}
};
const difficulty=[
  {dmg:.62,cadence:1.28,time:1.28},{dmg:1,cadence:1,time:1},{dmg:1.35,cadence:.80,time:.83}
];
let world,S,phase="menu",modern=true,soundOn=true,level=0,skill=1;
let bullets=[],sparks=[],flares=[],events=[],elapsed=0,acc=0;
let styleDirty=true,renderer,notice="",noticeEnd=0,screenFlash=0,fireFlash=0,lastAlarm=0;
const keys=new Set(),buttons=new Set();
let look=[0,0],touchTurn=[0,0],touchMove=[0,0],action={primary:false,secondary:false},randomSeed=0;
let lastKeyNotice=-20;
function random(){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;}
const dist=(a,b)=>len(sub(a,b));
function notify(msg,seconds=2.5){notice=msg;noticeEnd=elapsed+seconds;}
function prepareLevel(i,diff=1,carry=null){
  level=i;skill=diff;world=makeMine(i);elapsed=0;randomSeed=731+i*97;
  const pickup=[],bots=[];
  for(const r of world.rooms){
    const all=[...r.loot];
    if(["red","blue","yellow"].includes(r.type))all.unshift(r.type);
    all.forEach((type,k)=>pickup.push({type,room:r.id,taken:false,
      p:add(r.c,[[0,.15,0],[-3,-.3,2.1],[2.8,.65,-2]][k%3])}));
    r.bots.forEach((type,j)=>{
      const cfg=robotTypes[type],p=add(r.c,[j?3:-2.6,j?.4:1,j?-2.9:1]);
      bots.push({type,p,origin:[...p],room:r.id,hp:cfg.hp,wait:1.3+random()*1.3,spin:random()*6,awake:false,flash:0,heading:0});
    });
  }
  S={p:[0,0,3.7],q:[...identity],v:vec(),shield:carry?Math.max(85,carry.shield):100,
    energy:carry?Math.max(85,carry.energy):100,missiles:carry?Math.max(5,carry.missiles):8,
    spread:carry?.spread||false,weapon:carry?.weapon||1,keys:[],room:"dock",visited:["dock"],bots,pickup,
    core:95+i*35,countdown:null,escaped:false,hostages:0,runHostages:carry?.runHostages||0,
    score:carry?.score||0,entry:carry?{...carry}:null,kills:0,fire:0,missile:0,flare:0,age:0};
  bullets=[];sparks=[];flares=[];events=[];screenFlash=fireFlash=0;lastAlarm=0;lastKeyNotice=-20;
  notice="";noticeEnd=0;acc=0;clearControls();if(renderer)renderer.setWorld(world);
}
function clearControls(){keys.clear();buttons.clear();action.primary=action.secondary=false;look=[0,0];touchMove=[0,0];touchTurn=[0,0];}
function roomAt(p){
  return world.rooms.find(r=>Math.abs(p[0]-r.c[0])<=r.half[0]+.001&&Math.abs(p[1]-r.c[1])<=r.half[1]+.001&&Math.abs(p[2]-r.c[2])<=r.half[2]+.001);
}
function needKey(e){return e.lock==="breach"?S.countdown!==null:S.keys.includes(e.lock);}
function contains(p){
  if(roomAt(p))return true;
  return world.edges.some(e=>{
    const a=Math.abs(p[e.d]-e.c[e.d]);if(a>e.half[e.d]+.009)return false;
    const i=(e.d+1)%3,j=(e.d+2)%3,x=Math.abs(p[i]-e.c[i]),y=Math.abs(p[j]-e.c[j]);
    if(x>portal||y>portal||x+y>2*portal-cornerBevel)return false;
    if(!e.lock||a>.23||e.open>=1)return true;
    const across=e.d===0?2:0; // Horizontal panel axis, including vertical passages.
    return Math.abs(p[across]-e.c[across])<portal*e.open;
  });
}
function fits(p,r){
  if(!contains(p))return false;
  for(let d=0;d<3;d++)for(const sg of [-1,1])if(!contains(add(p,axis(d,sg*r))))return false;
  return true;
}
function slide(obj,delta,r){
  for(let i=0;i<3;i++){
    const next=add(obj.p,axis(i,delta[i]));
    if(fits(next,r)){obj.p=next;}else if(obj.v)obj.v[i]=0;
  }
}
function clearLine(a,b){
  const v=sub(b,a),n=Math.max(1,Math.ceil(len(v)/.55));
  for(let i=1;i<=n;i++)if(!contains(add(a,mul(v,i/n))))return false;
  return true;
}
function burst(p,col,count=11){
  for(let j=0;j<count;j++){const v=mul(unit([random()-.5,random()-.5,random()-.5]),2+random()*6);
    sparks.push({p:[...p],v,col,ttl:.22+random()*.52});}
  if(sparks.length>170)sparks.splice(0,sparks.length-170);
}
function shoot(owner,p,dir,type,speed,damage){
  bullets.push({owner,p:[...p],dir:unit(dir),type,speed,damage,ttl:type==="missile"?3.9:2.6});
}
const pressed=(...codes)=>codes.some(k=>keys.has(k));
function weapons(f,right,up,dt){
  const fire=action.primary||buttons.has(0)||pressed("KeyZ","ControlLeft","ControlRight");
  const missile=action.secondary||buttons.has(2)||pressed("KeyX");
  if(fire&&S.fire<=0&&S.energy>=1){
    const wide=S.weapon===2&&S.spread&&S.energy>=2;
    S.energy-=wide?2:1;S.fire=wide?.245:.155;
    for(const sg of [-1,1]){
      const start=add(add(add(S.p,mul(f,.70)),mul(right,.36*sg)),mul(up,-.18));
      shoot("player",fits(start,.05)?start:S.p,f,"laser",49,wide?6:5);
    }
    if(wide)for(const sg of [-1,1])shoot("player",add(S.p,mul(f,.60)),add(f,mul(right,sg*.19)),"spread",47,7);
    fireFlash=.13;sfx(wide?"spread":"laser");
  }
  if(missile&&S.missile<=0){
    S.missile=.6;
    if(S.missiles>0){S.missiles--;shoot("player",S.p,f,"missile",27,48);sfx("missile");}
    else notify("Missile rack empty",1);
  }
}
function flare(){
  if(phase!=="flight"||S.flare>0||S.energy<1)return;
  const f=rotate(S.q,[0,0,-1]);flares.push({p:[...S.p],v:mul(f,22),ttl:12});
  if(flares.length>9)flares.shift();S.energy--;S.flare=.35;sfx("flare");
}
function collect(item){
  const t=item.type;item.taken=true;
  if(["blue","yellow","red"].includes(t)){
    S.keys.push(t);notify(t.toUpperCase()+" ACCESS KEY recovered");sfx("key");S.score+=100;
  }else if(t==="hostage"){S.hostages++;S.score+=400;notify("Miner rescued • aboard ship");sfx("rescue");}
  else if(t==="spread"){
    S.spread=true;S.weapon=2;notify("Spread cannon online • 1 / 2 to switch");sfx("key");
  }else if(t==="energy"){S.energy=Math.min(160,S.energy+32);notify("Energy cells +32");sfx("pickup");}
  else if(t==="shields"){S.shield=Math.min(160,S.shield+35);notify("Shields +35");sfx("pickup");}
  else{S.missiles+=4;notify("Concussion missiles +4");sfx("pickup");}
  events.push("save");
}
function hurt(n){
  if(phase!=="flight")return;S.shield=Math.max(0,S.shield-n*difficulty[skill].dmg);screenFlash=.37;sfx("hit");
  if(S.shield<=0){phase="lost";events.push("lost");}
}
function damageBot(b,n){
  if(b.hp<=0)return;b.hp-=n;b.flash=.15;b.awake=true;
  if(b.hp<=0){S.kills++;S.score+=robotTypes[b.type].points;burst(b.p,amber,22);sfx("boom");}
  else sfx("tick");
}
function coreHit(n){
  if(S.core<=0)return;S.core=Math.max(0,S.core-n);
  if(S.core===0){
    S.countdown=Math.ceil(world.spec.time*difficulty[skill].time);
    burst(world.rooms.find(r=>r.type==="core").c,red,42);S.score+=1000;
    notify("REACTOR DESTROYED • Return to the green extraction airlock",5);
    sfx("core");events.push("save");
  }else sfx("tick");
}
function hitMissile(p){
  burst(p,amber,22);sfx("boom");
  for(const b of S.bots){const d=dist(p,b.p);if(b.hp>0&&d<5.5&&clearLine(p,b.p))damageBot(b,48*(1-d/7));}
  const c=world.rooms.find(r=>r.type==="core").c;
  if(S.core>0&&dist(c,p)<5&&clearLine(p,c))coreHit(42);
  if(dist(S.p,p)<2.8&&clearLine(p,S.p))hurt(7*(1-dist(S.p,p)/3));
}
function stepShots(dt){
  const core=world.rooms.find(r=>r.type==="core").c;
  bullets=bullets.filter(b=>{
    b.ttl-=dt;if(b.ttl<=0)return false;
    const n=Math.ceil(dt*b.speed/.28);
    for(let k=0;k<n;k++){
      const next=add(b.p,mul(b.dir,dt*b.speed/n));
      let impact=!contains(next);
      if(!impact&&b.owner==="player"){
        if(b.type==="missile")impact=S.bots.some(e=>e.hp>0&&dist(e.p,next)<robotTypes[e.type].size+.18)||
          (S.core>0&&dist(core,next)<2.15);
        else{
          const bot=S.bots.find(e=>e.hp>0&&dist(e.p,next)<robotTypes[e.type].size+.13);
          if(bot){damageBot(bot,b.damage);impact=true;}
          else if(S.core>0&&dist(core,next)<2.05){coreHit(b.damage);impact=true;}
        }
      }else if(!impact&&b.owner==="bot"&&dist(next,S.p)<playerRadius+.19){hurt(b.damage);impact=true;}
      if(impact){if(b.type==="missile")hitMissile(b.p);
        else burst(b.p,b.owner==="bot"?red:cyan,3);
        return false;
      }
      b.p=next;
    }
    return true;
  });
}
function nextLink(from,to){
  if(!from||!to||from===to)return null;
  const queue=[[from,null]],seen=new Set([from]);
  for(let i=0;i<queue.length;i++){
    const [r,first]=queue[i];
    for(const l of r.links){
      if(seen.has(l.other)||(l.edge.lock&&l.edge.open<=.98))continue;
      const step=first||l;if(l.other===to)return step;
      seen.add(l.other);queue.push([l.other,step]);
    }
  }
  return null;
}
function ai(dt){
  const playerRoom=roomAt(S.p);
  for(const b of S.bots){
    if(b.hp<=0)continue;b.flash=Math.max(0,b.flash-dt);
    const cfg=robotTypes[b.type],delta=sub(S.p,b.p),d=len(delta);b.wait-=dt;
    if(d>42)continue;
    const see=clearLine(b.p,S.p),r=roomAt(b.p);
    if(r)b.room=r.id;
    if(see&&d<30)b.awake=true;
    if(!b.awake)continue;
    let desire=vec();
    if(see){
      b.heading=Math.atan2(delta[0],delta[2]);
      const seek=unit(delta),side=unit(cross(seek,[0,1,0]));
      const preferred=b.type==="hunter"?5:b.type==="scout"?7:11;
      desire=add(mul(seek,clamp((d-preferred)*.38,-.7,1)),mul(side,Math.sin(elapsed*1.1+b.spin)*.64));
      desire[1]+=.23*Math.sin(elapsed*1.4+b.spin);
      if(b.wait<=0&&d<32){
        const muzzle=add(b.p,mul(seek,cfg.size+.18));
        const aim=unit(sub(add(S.p,mul(S.v,b.type==="hunter"?.16:.06)),muzzle));
        shoot("bot",muzzle,aim,"plasma",b.type==="hunter"?15:11,cfg.damage);sfx("enemy",clamp(1-d/38,.1,1));
        b.wait=cfg.wait*difficulty[skill].cadence*(.87+random()*.29);
      }
    }else if(b.type==="hunter"&&playerRoom){
      const l=nextLink(world.byId[b.room],playerRoom);
      if(l){const tar=r?l.edge.c:l.other.c;desire=unit(sub(tar,b.p));}
    }
    slide(b,mul(desire,cfg.speed*dt),cfg.size*.72);
    const sep=sub(b.p,S.p);
    if(len(sep)<cfg.size+.55)slide(b,mul(unit(sep),Math.min(.18,cfg.size+.55-len(sep))),cfg.size*.72);
  }
  const core=world.rooms.find(r=>r.type==="core");
  if(S.core>0&&dist(S.p,core.c)<24&&clearLine(core.c,S.p)){
    S.coreWait=(S.coreWait??1.7)-dt;
    if(S.coreWait<=0){const dir=unit(sub(S.p,core.c));shoot("bot",add(core.c,mul(dir,2.12)),dir,"plasma",11.6,8);
      S.coreWait=2.05*difficulty[skill].cadence;}
  }
}
function update(dt){
  elapsed+=dt;S.age+=dt;screenFlash=Math.max(0,screenFlash-dt);fireFlash=Math.max(0,fireFlash-dt);
  for(const k of ["fire","missile","flare"])S[k]=Math.max(0,S[k]-dt);
  const input=(a,b)=>Number(keys.has(a))-Number(keys.has(b));
  const yaw=-input("KeyL","KeyJ")*1.72*dt-look[0]-touchTurn[0]*dt*2.4;
  const pitch=input("KeyI","KeyK")*1.55*dt-look[1]-touchTurn[1]*dt*1.9;
  const roll=input("KeyQ","KeyE")*2.45*dt;
  look=[0,0];if(yaw||pitch||roll)S.q=unit(qmul(S.q,orientation(yaw,pitch,roll)));
  const forward=rotate(S.q,[0,0,-1]),right=rotate(S.q,[1,0,0]),up=rotate(S.q,[0,1,0]);
  const vertical=Number(pressed("Space"))-Number(pressed("ShiftLeft","ShiftRight","KeyC"));
  let thrust=add(add(mul(forward,Number(pressed("KeyW","ArrowUp"))-Number(pressed("KeyS","ArrowDown"))-touchMove[1]),mul(right,Number(pressed("KeyD","ArrowRight"))-Number(pressed("KeyA","ArrowLeft"))+touchMove[0])),mul(up,vertical));
  if(len(thrust)>1)thrust=unit(thrust);
  const target=mul(thrust,shipSpeed);
  S.v=lerp(S.v,target,1-Math.exp(-dt*(len(thrust)>.02?3.5:2.55)));
  for(const e of world.edges)if(e.lock){
    const allowed=needKey(e);
    if(allowed)e.open=Math.min(1,e.open+dt*2.3);
    else if(dist(S.p,e.c)<8&&elapsed-lastKeyNotice>3){
      notify(e.lock==="breach"?"Pressure seal • opens on reactor failure":e.lock.toUpperCase()+" access key required",1.8);
      lastKeyNotice=elapsed;
    }
  }
  slide(S,mul(S.v,dt),playerRadius);
  const coreRoom=world.rooms.find(r=>r.type==="core");
  if(S.core>0&&dist(S.p,coreRoom.c)<2.35){
    let away=unit(sub(S.p,coreRoom.c));if(!len(away))away=[0,0,1];
    S.p=add(coreRoom.c,mul(away,2.35));S.v=vec();
  }
  const r=roomAt(S.p);
  if(r){if(S.room!==r.id){S.room=r.id;events.push("save");}
    if(!S.visited.includes(r.id))S.visited.push(r.id);
    if(r.type==="charge"&&dist(r.c,S.p)<4.3&&S.energy<100)S.energy=Math.min(100,S.energy+19*dt);
  }
  if(S.energy<15)S.energy=Math.min(15,S.energy+2.6*dt);
  for(const item of S.pickup)if(!item.taken&&dist(item.p,S.p)<2.03)collect(item);
  weapons(forward,right,up,dt);
  ai(dt);stepShots(dt);
  sparks=sparks.filter(x=>{x.ttl-=dt;x.p=add(x.p,mul(x.v,dt));return x.ttl>0;});
  flares=flares.filter(x=>{x.ttl-=dt;const p=add(x.p,mul(x.v,dt));if(contains(p))x.p=p;else x.v=vec();return x.ttl>0;});
  if(S.countdown!==null&&phase==="flight"){
    S.countdown-=dt;
    if(S.countdown<=0){S.shield=0;phase="lost";events.push("lost");}
    else if(r?.type==="exit"&&S.p[2]-r.c[2]>r.half[2]-2.4&&Math.abs(S.p[0]-r.c[0])<3.6&&Math.abs(S.p[1]-r.c[1])<3.8){
      S.escaped=true;S.score+=500;phase="clear";events.push("clear");sfx("win");
    }else if(elapsed-lastAlarm>(S.countdown<15?.78:2.6)){lastAlarm=elapsed;sfx("alarm");}
  }
}
