"use strict";
const cornerBevel=0.74, portal=3.7, white=[1,1,1], metal=[.68,.72,.76];
const amber=[1,.58,.16], cyan=[.17,.83,1], green=[.21,1,.6], red=[1,.23,.13];
const tileNames=["iron","deck","vent","trim","hazard","lamp","body","rock","black","halo","glass","exitplate"];
let tileList=[],atlasInfo=new Map();
function makeAtlas(){
  tileList=[...tileNames,...new Set(["AIRLOCK","EXTRACTION","REACTOR","PRESSURE SEAL","BLUE ACCESS","YELLOW ACCESS",
    "RED ACCESS","ENERGY CENTER","EVACUATION",...MINES.flatMap(m=>m.rooms.map(r=>r[4].toUpperCase()))])];
  atlasInfo=new Map(tileList.map((s,i)=>[s,i]));
  const a=document.createElement("canvas");a.width=a.height=2048;
  const g=a.getContext("2d"),sz=256;
  let seed=381921;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const rect=(x,y,w,h,fill)=>{g.fillStyle=fill;g.fillRect(x,y,w,h);};
  function line(x,y,X,Y,c,w=1){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.stroke();}
  for(let n=0;n<tileList.length;n++){
    const name=tileList[n];g.save();g.translate((n%8)*sz,Math.floor(n/8)*sz);
    g.beginPath();g.rect(0,0,sz,sz);g.clip();
    if(n>=tileNames.length){
      rect(0,0,256,256,"#101a21");rect(7,14,242,5,"#91aaaa");rect(7,232,242,5,"#75898f");
      g.save();g.scale(1,6.15);g.fillStyle="#e0f3f0";g.font="bold 32px Arial";
      g.textAlign="center";g.textBaseline="middle";g.fillText(name,128,21.4,230);g.restore();
    }else if(name==="halo"){
      const grad=g.createRadialGradient(128,128,0,128,128,125);
      grad.addColorStop(0,"rgba(255,255,255,.67)");grad.addColorStop(.22,"rgba(255,255,255,.32)");
      grad.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=grad;g.fillRect(0,0,256,256);
    }else if(name==="lamp"){rect(0,0,256,256,"#ffffff");}
    else{
      const base={iron:[102,116,126],deck:[99,101,104],vent:[76,84,88],trim:[120,132,137],
        body:[170,177,178],hazard:[176,160,114],rock:[106,91,82],black:[42,47,50],glass:[105,147,156],
        exitplate:[95,112,112]}[name]||[120,122,125];
      const pix=g.createImageData(sz,sz);
      for(let y=0;y<sz;y++)for(let x=0;x<sz;x++){
        const v=(rnd()-.5)*13+3*Math.sin(x*.1)+2*Math.cos(y*.18);
        const j=(y*sz+x)*4;base.forEach((c,k)=>pix.data[j+k]=c+v);pix.data[j+3]=255;
      }
      g.putImageData(pix,(n%8)*sz,Math.floor(n/8)*sz);
      if(name==="hazard"){
        for(let x=-320;x<640;x+=72){g.fillStyle="#272b2b";g.beginPath();g.moveTo(x,0);g.lineTo(x+37,0);
          g.lineTo(x+165,256);g.lineTo(x+128,256);g.fill();}
      }else if(name==="vent"){
        for(let y=12;y<250;y+=15){rect(8,y,240,8,"#263139");rect(8,y+8,240,2,"#a4afb0");}
        rect(123,0,9,256,"#697983");
      }else if(name==="deck"){
        for(let y=-50;y<320;y+=25)for(let x=-10;x<260;x+=24){
          line(x,y,x+9,y+7,"rgba(255,255,255,.20)",3);line(x+9,y+7,x+13,y+4,"rgba(0,0,0,.38)",3);}
        rect(4,4,248,4,"#465259");rect(4,4,4,248,"#4e5c61");
      }else if(name==="iron"||name==="body"||name==="exitplate"){
        for(const [x,y,w,h] of [[4,4,156,118],[164,4,88,118],[4,126,85,126],[93,126,159,126]]){
          g.strokeStyle="rgba(20,31,40,.88)";g.lineWidth=4;g.strokeRect(x,y,w,h);
          line(x+2,y+2,x+w-2,y+2,"rgba(218,226,225,.52)",2);
          for(const xx of [x+7,x+w-7])for(const yy of [y+7,y+h-7]){
            rect(xx,yy,3,3,"#34454d");rect(xx,yy+3,3,1,"#b0b9b9");}
        }
        for(let k=0;k<6;k++)rect(185,17+k*7,40,3,"#536270");
        rect(15,102,18,3,"#d4cbb0");rect(15,108,30,2,"#bcc5c4");
      }else if(name==="trim"){for(const x of [6,12,229,239])rect(x,0,4,256,"#59656a");}
      for(let k=0;k<60;k++){
        const x=rnd()*256,y=rnd()*256;
        line(x,y,x+rnd()*21,y+rnd()*2,"rgba(235,236,218,.14)",1);
      }
    }
    g.restore();
  }
  return a;
}
function vertex(out,p,n,uv,t,col,em){out.push(...p,...n,...uv,t,...col,em);}
function face(out,p,u,v,t="iron",col=white,em=0,uv=null){
  const a=add(p,u),b=add(a,v),c=add(p,v),n=unit(cross(u,v)),ti=atlasInfo.get(t)??0;
  const uvx=uv?uv[0]:len(u)/5,uvy=uv?uv[1]:len(v)/5;
  const pts=[p,a,b,p,b,c],uvs=[[0,0],[uvx,0],[uvx,uvy],[0,0],[uvx,uvy],[0,uvy]];
  for(let i=0;i<6;i++)vertex(out,pts[i],n,uvs[i],ti,col,em);
}
function tri(out,a,b,c,t="body",col=white,em=0){
  const n=unit(cross(sub(b,a),sub(c,a))),ti=atlasInfo.get(t)??0;
  vertex(out,a,n,[0,0],ti,col,em);vertex(out,b,n,[1,0],ti,col,em);vertex(out,c,n,[.5,1],ti,col,em);
}
function centered(out,c,u,v,t,col=white,em=0,uv=null){
  face(out,sub(c,mul(add(u,v),.5)),u,v,t,col,em,uv);
}
function box(out,c,s,t="body",col=white,em=0){
  for(let i=0;i<3;i++)for(const sg of [-1,1]){
    const j=(i+1)%3,k=(i+2)%3;
    centered(out,add(c,axis(i,sg*s[i]/2)),axis(j,s[j]*sg),axis(k,s[k]),t,col,em);
  }
}
function diamond(out,c,s,t,col,em=0){
  const belt=[[s[0],0,0],[0,0,s[2]],[-s[0],0,0],[0,0,-s[2]]].map(p=>add(c,p));
  for(let j=0;j<4;j++){
    tri(out,belt[j],add(c,[0,s[1],0]),belt[(j+1)%4],t,col,em);
    tri(out,belt[(j+1)%4],add(c,[0,-s[1],0]),belt[j],t,col,em);
  }
}
function ring(out,c,outer,inner,height,t,col,em=0,segments=12){
  for(let i=0;i<segments;i++){
    const theta=i*Math.PI*2/segments,end=(i+1)*Math.PI*2/segments;
    const pt=(a,r,h)=>add(c,[r*Math.cos(a),h,r*Math.sin(a)]);
    const a=pt(theta,outer,-height/2),b=pt(end,outer,-height/2);
    face(out,a,sub(b,a),[0,height,0],t,col,em);
    for(const h of [-height/2,height/2]){
      const x=pt(theta,outer,h),y=pt(end,outer,h),z=pt(end,inner,h),w=pt(theta,inner,h);
      tri(out,x,y,z,t,col,em);tri(out,x,z,w,t,col,em);
    }
  }
}
function orthoFace(d,sg){
  // Right and down vectors from the viewpoint of a pilot facing the wall.
  const n=axis(d,sg),up=d===1?[0,0,sg]:[0,1,0];
  return {u:unit(cross(n,up)),v:mul(up,-1),n};
}
function surface(out,c,u,v,w,h,t,col=white,em=0,uv=null){
  if(w>.001&&h>.001)centered(out,c,mul(u,w),mul(v,h),t,col,em,uv);
}
function buildWorld(world){
  const out=[];
  for(const r of world.rooms){
    for(let d=0;d<3;d++)for(const sg of [-1,1]){
      const {u,v,n}=orthoFace(d,sg),w=Math.abs(dot(r.half,u)),h=Math.abs(dot(r.half,v));
      const c=add(r.c,axis(d,sg*r.half[d]));
      const pos=(x,y,inset=0)=>add(add(add(c,mul(u,x)),mul(v,y)),mul(n,-inset));
      const plane=(x,y,wi,he,t,col=white,em=0,depth=0,uv=null)=>surface(out,pos(x,y,depth),u,v,wi,he,t,col,em,uv);
      const conn=r.links.find(l=>l.edge.d===d&&l.sg===sg);
      const floor=d===1&&sg<0,ceil=d===1&&sg>0;
      const mat=floor?"deck":ceil?"vent":"iron";
      const tone=r.type==="core"?[.80,.62,.53]:r.type==="charge"?[.61,.78,.79]:
        floor?[.68,.70,.71]:d===2?[.82,.86,.88]:[.72,.80,.85];
      if(!conn){plane(0,0,w*2,h*2,mat,tone);}
      else{
        const p=portal;
        plane(-(w+p)/2,0,w-p,h*2,mat,tone);plane((w+p)/2,0,w-p,h*2,mat,tone);
        plane(0,-(p+h)/2,p*2,h-p,mat,tone);plane(0,(p+h)/2,p*2,h-p,mat,tone);
        for(const x of [-1,1])for(const y of [-1,1]){
          tri(out,pos(x*p,y*p),pos(x*(p-cornerBevel),y*p),pos(x*p,y*(p-cornerBevel)),"trim",metal);
        }
        for(const x of [-1,1]){
          plane(x*(p+.21),0,.40,p*2+.58,"trim",white,0,.055);
          plane(x*(p+.23),0,.10,3.3,"lamp",colors[conn.edge.lock]||[.38,.83,.90],.84,.065);
        }
        plane(0,p+.17,p*2+.9,.32,"hazard",[.88,.77,.52],0,.06,[3,.6]);
        if(!floor&&!ceil){
          const label=conn.edge.lock==="breach"?"PRESSURE SEAL":conn.edge.lock?conn.edge.lock.toUpperCase()+" ACCESS":
            conn.other.type==="core"?"REACTOR":conn.other.type==="exit"?"AIRLOCK":conn.other.name.toUpperCase();
          plane(0,-p-.65,6.2,.94,label,white,.35,.07,[.999,.999]);
        }
      }
      if(!floor&&!ceil){
        for(const x of [-1,1]){
          plane(x*(w-.50),0,.55,h*2,"trim",[.60,.67,.69],0,.08);
          plane(x*(w-.5),-h*.56,.21,2.5,"lamp",colors[r.type]||cyan,.95,.10);
        }
        plane(0,h-.50,2*w-.6,.22,"hazard",[.54,.53,.45],0,.025,[7,1]);
        if(!conn){
          if(r.type==="exit"&&d===2&&sg===1){
            plane(0,0,8.0,7.0,"exitplate",[.31,.47,.45],0,.08,[1,1]);
            for(const x of [-1,1]){
              plane(x*3.8,0,.22,6.9,"lamp",green,1,.14);
              plane(x*.13,0,.16,6.95,"trim",metal,0,.16);
            }
            plane(0,-2.35,6.65,1.08,"EXTRACTION",green,.85,.20,[.999,.999]);
          }else{
            plane(0,-h*.42,w*.95,.86,r.name.toUpperCase(),[.81,.89,.89],.16,.07,[.999,.999]);
            for(const x of [-1,1])plane(x*w*.55,h*.18,2.0,1.5,"vent",[.73,.79,.8],0,.04,[1,1]);
          }
        }
      }else if(!conn){
        for(const x of [-1,1]){
          plane(x*w*.65,0,.30,h*1.75,"trim",[.52,.58,.60],0,.04);
          if(ceil)plane(x*w*.65,0,.13,h*.94,"lamp",[.75,.9,1],.85,.06);
        }
      }
    }
    if(r.type==="charge"){
      ring(out,add(r.c,[0,-r.half[1]+.2,0]),3.9,3.5,.15,"lamp",cyan,.8,16);
    }
  }
  for(const e of world.edges){
    const {u,v,n}=orthoFace(e.d,e.sg),p=portal,b=cornerBevel;
    const shape=[[-p+b,-p],[p-b,-p],[p,-p+b],[p,p-b],[p-b,p],[-p+b,p],[-p,p-b],[-p,-p+b]];
    const at=(x,y,z)=>add(add(add(e.c,mul(u,x)),mul(v,y)),mul(n,z));
    const length=e.half[e.d]*2,half=length/2;
    for(let i=0;i<8;i++){
      const [x,y]=shape[i],[X,Y]=shape[(i+1)%8];
      const start=at(x,y,-half),side=sub(at(X,Y,-half),start),forward=mul(n,length);
      const wall=i%2===1?"trim":i===4?"deck":"iron";
      face(out,start,side,forward,wall,i%2===1?[.55,.62,.66]:[.73,.78,.80]);
      const bays=Math.ceil(length/5.7);
      for(let k=0;k<=bays;k++){
        const z=-half+.1+(length-.3)*k/bays;
        const a=at(x*.974,y*.974,z);
        face(out,a,mul(side,.974),mul(n,.24),"trim",[.60,.66,.67]);
        if((i===1||i===7||i===3||i===5)&&k<bays){
          const l=at((x*.42+X*.58)*.97,(y*.42+Y*.58)*.97,z+.35);
          face(out,l,mul(side,.18),mul(n,Math.min(2.2,length/bays-.6)),"lamp",colors[e.lock]||[.45,.81,.91],.84);
        }
      }
    }
  }
  return out;
}
const vertexShader=`
attribute vec3 position,normal,tint;
attribute vec2 uv;
attribute float tile,emission;
uniform vec3 eye,camR,camU,camF;
uniform vec2 projection;
varying vec3 N,P,C;
varying vec2 U;
varying float T,E,Z;
void main(){
  vec3 rel=position-eye;
  float f=dot(rel,camF);
  gl_Position=vec4(dot(rel,camR)*projection.x,dot(rel,camU)*projection.y,f*1.00125-.20013,f);
  N=normal;P=position;C=tint;U=uv;T=tile;E=emission;Z=f;
}`;
const fragmentShader=`
precision highp float;
varying vec3 N,P,C;
varying vec2 U;
varying float T,E,Z;
uniform sampler2D atlas;
uniform float evolved,alarm,clock;
uniform vec3 eye,lightAt,lightColor;
void main(){
  vec2 tuv=fract(U);
  if(evolved<.5)tuv=(floor(tuv*48.)+.5)/48.;
  vec2 tid=vec2(mod(floor(T+.5),8.),floor((T+.5)/8.));
  vec4 tex=texture2D(atlas,(tid+(tuv*254.+1.)/256.)/8.);
  if(tex.a<.013)discard;
  vec3 view=normalize(eye-P),n=normalize(N);
  float dist=length(eye-P);
  float facing=abs(dot(n,view));
  float lighting=.49+.22*abs(n.y)+.08*abs(n.z)+.43*facing/(1.+dist*.027);
  vec3 dyn=lightColor/(1.+.10*dot(P-lightAt,P-lightAt));
  vec3 color=tex.rgb*C*(lighting+E*1.15);
  if(evolved>.5){
    color+=tex.rgb*C*dyn*.85;
    color+=vec3(.025,.065,.095)*pow(1.-facing,3.);
    color+=C*max(0.,E-.45)*.45;
    color*=1.+.028*sin(P.y*1.5+P.z*.6);
    color+=vec3(.17,.013,0.)*alarm*(.5+.5*sin(clock*6.));
    color=mix(vec3(.025,.038,.055),color,exp(-max(Z,0.)*.009));
    color=pow(max(color,vec3(0.)),vec3(.89));
  }else{
    color=mix(vec3(.035,.038,.052),color,exp(-max(Z,0.)*.010));
    color=floor(color*30.+.5)/30.;
  }
  gl_FragColor=vec4(color,tex.a);
}`;
function initRenderer(canvas){
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true,powerPreference:"high-performance"});
  if(!gl) return softwareRenderer(canvas);
  const compile=(type,src)=>{
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
  };
  const prog=gl.createProgram();
  gl.attachShader(prog,compile(gl.VERTEX_SHADER,vertexShader));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,fragmentShader));
  gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,makeAtlas());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
  const stat=gl.createBuffer(),dynamic=gl.createBuffer(),halo=gl.createBuffer();
  const loc={};for(const key of ["eye","camR","camU","camF","projection","evolved","alarm","clock","lightAt","lightColor"])
    loc[key]=gl.getUniformLocation(prog,key);
  const attributes=[["position",3,0],["normal",3,3],["uv",2,6],["tile",1,8],["tint",3,9],["emission",1,12]]
    .map(([name,size,offset])=>[gl.getAttribLocation(prog,name),size,offset]);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  let count=0;
  function draw(buf,n){
    if(!n)return;gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    for(const [id,size,off] of attributes){gl.enableVertexAttribArray(id);gl.vertexAttribPointer(id,size,gl.FLOAT,false,52,off*4);}
    gl.drawArrays(gl.TRIANGLES,0,n);
  }
  function put(buf,data,usage){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),usage);}
  return {
    setWorld(w){const data=buildWorld(w);put(stat,data,gl.STATIC_DRAW);count=data.length/13;},
    render(view,objects,glows){
      const {r,u,f,p,modern,time,alert,light,lightCol}=view;
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.02,.032,.048,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      for(const [name,val] of Object.entries({eye:p,camR:r,camU:u,camF:f,lightAt:light,lightColor:lightCol}))gl.uniform3fv(loc[name],val);
      gl.uniform2f(loc.projection,1.36*canvas.height/canvas.width,1.36);
      gl.uniform1f(loc.evolved,modern?1:0);gl.uniform1f(loc.alarm,alert?1:0);gl.uniform1f(loc.clock,time);
      draw(stat,count);put(dynamic,objects,gl.DYNAMIC_DRAW);draw(dynamic,objects.length/13);
      if(glows.length){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
        put(halo,glows,gl.DYNAMIC_DRAW);draw(halo,glows.length/13);gl.depthMask(true);gl.disable(gl.BLEND);}
    }
  };
}
