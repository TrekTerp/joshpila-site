"use strict";
// Coordinates are mine-grid positions. Connections are explicit so adjacent decks
// can pass each other without creating an unintended route around a locked door.
const MINES = [
  {
    name:"Orpheus Cut", region:"Lunar near side", code:"OC-01", time:74,
    briefing:"A blue access key unlocks the reactor wing. The escape airlock is in the launch bay.",
    rooms:[
      ["dock",0,0,0,"Launch bay","exit"],
      ["hub",0,0,-1,"Transfer hall","hub",["scout"]],
      ["tool",-1,0,-1,"Tool crib","blue",["scout"],["missiles"]],
      ["well",1,0,-1,"Lift well","shaft",[],["shields"]],
      ["charge",1,1,-1,"Capacitor loft","charge",["gunner"],["hostage","spread"]],
      ["mill",0,0,-2,"Ore mill","mill",["gunner","scout"],["energy"]],
      ["core",0,0,-3,"Reactor one","core",["scout"]]
    ],
    edges:[["dock","hub"],["hub","tool"],["hub","well"],["well","charge"],["hub","mill","blue"],["mill","core"]]
  },
  {
    name:"Morrow Shaft", region:"Farside highlands", code:"MS-02", time:83,
    briefing:"Find the blue key below the survey junction. The yellow key opens the upper reactor deck. Return to the arrival airlock.",
    rooms:[
      ["dock",0,0,0,"Survey dock","exit",[],["missiles"]],
      ["cross",0,0,-1,"Survey junction","hub",["scout","scout"]],
      ["pump",-1,0,-1,"Pump house","mill",["gunner"],["energy"]],
      ["deep",-1,-1,-1,"Sump vault","blue",["hunter"],["hostage"]],
      ["lift",1,0,-1,"Hoist base","shaft",["scout"]],
      ["loft",1,1,-1,"Hoist crown","shaft",["gunner"]],
      ["stores",2,1,-1,"Survey stores","yellow",["hunter"],["spread","shields"]],
      ["coil",1,1,-2,"Capacitor bank","charge",["scout"],["missiles"]],
      ["stack",0,1,-2,"Flue gallery","mill",["gunner","scout"]],
      ["core",0,1,-3,"Reactor two","core",["hunter"]],
      ["return",0,0,-2,"Bypass well","shaft"]
    ],
    edges:[["dock","cross"],["cross","pump"],["pump","deep"],["cross","lift","blue"],["lift","loft"],
      ["loft","stores"],["loft","coil"],["coil","stack","yellow"],["stack","core"],
      ["stack","return","breach"],["return","cross","breach"]]
  },
  {
    name:"Umbra Foundry", region:"South polar basin", code:"UF-03", time:95,
    briefing:"Three interlocks protect the foundry. The red key is on the slag deck. Watch for a pressure relief passage when the core fails.",
    rooms:[
      ["dock",0,0,0,"Freight airlock","exit",[],["missiles"]],
      ["atrium",0,0,-1,"Foundry atrium","hub",["gunner","scout"]],
      ["strut",-1,0,-1,"West gantry","shaft",["hunter"],["energy"]],
      ["upper",-1,1,-1,"Watch station","blue",["gunner"],["spread"]],
      ["store",1,0,-1,"Converter hall","charge",["hunter"],["hostage","shields"]],
      ["pit",1,-1,-1,"Slag elevator","shaft",["scout"],["missiles"]],
      ["cool",1,-1,-2,"Coolant works","yellow",["hunter","gunner"]],
      ["forge",0,0,-2,"Casting floor","mill",["scout","hunter"],["energy"]],
      ["drop",0,-1,-2,"Slag deck","red",["gunner"],["hostage","missiles"]],
      ["tower",-1,0,-2,"Induction tower","shaft",["gunner"],["shields"]],
      ["switch",-1,1,-2,"Switch gallery","mill",["scout","hunter"]],
      ["core",-1,1,-3,"Foundry heart","core",["gunner","hunter"]]
    ],
    edges:[["dock","atrium"],["atrium","strut"],["strut","upper"],["atrium","store","blue"],
      ["store","pit"],["pit","cool"],["atrium","forge","yellow"],["forge","drop"],["forge","tower","red"],
      ["tower","switch"],["switch","core"],["switch","upper","breach"]]
  }
];
const vec=(x=0,y=0,z=0)=>[x,y,z];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(len(a)||1));
const lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const axis=(i,k=1)=>[i===0?k:0,i===1?k:0,i===2?k:0];
const identity=[0,0,0,1];
function qmul([x,y,z,w],[a,b,c,d]){
  return [w*a+x*d+y*c-z*b,w*b-x*c+y*d+z*a,w*c+x*b-y*a+z*d,w*d-x*a-y*b-z*c];
}
function qaxis(n,a){return [...mul(n,Math.sin(a/2)),Math.cos(a/2)];}
function rotate(q,v){
  const t=mul(cross(q,v),2);
  return add(v,add(mul(t,q[3]),cross(q,t)));
}
const orientation=(yaw,pitch,roll)=>qmul(qmul(qaxis([0,1,0],yaw),qaxis([1,0,0],pitch)),qaxis([0,0,1],roll));
const colors={blue:[0.16,.53,1],yellow:[1,.76,.11],red:[1,.19,.18],breach:[.94,.41,.12],
  exit:[.22,1,.64],charge:[.12,.88,.78],core:[1,.36,.16],hub:[.3,.73,.89],shaft:[.83,.62,.24],mill:[.86,.46,.22]};
function makeMine(i){
  const spec=MINES[i], rooms=spec.rooms.map(([id,x,y,z,name,type,bots=[],loot=[]],n)=>({
    id,c:[x*36,y*28,z*36],half:type==="core"?[9,7.2,10]:type==="shaft"?[7,6,7]:
      type==="hub"?[10,6.3,10]:[8.6,5.7,8.6],name,type,bots,loot,n,links:[]
  }));
  const byId=Object.fromEntries(rooms.map(r=>[r.id,r]));
  const edges=spec.edges.map(([from,to,lock],n)=>{
    const a=byId[from],b=byId[to],diff=sub(b.c,a.c),d=diff.findIndex(v=>v!==0),sg=Math.sign(diff[d]);
    if(diff.filter(v=>v!==0).length!==1)throw Error("Non-axial passage: "+from);
    const c=mul(add(a.c,b.c),.5);
    const edge={a,b,d,sg,c,lock,n,half:[3.7,3.7,3.7],open:lock?0:1};
    const first=a.c[d]+sg*a.half[d],last=b.c[d]-sg*b.half[d];
    edge.c[d]=(first+last)*.5;edge.half[d]=Math.abs(last-first)*.5+.015;
    a.links.push({other:b,edge,sg});b.links.push({other:a,edge,sg:-sg});return edge;
  });
  return {rooms,byId,edges,spec};
}
