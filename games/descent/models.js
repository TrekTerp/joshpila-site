"use strict";
let modelCache=new Map();
function model(key,build){
  if(!modelCache.has(key)){const m=[];build(m);modelCache.set(key,m);}return modelCache.get(key);
}
function instance(out,m,p,angle=0,scale=1,flash=0){
  const s=Math.sin(angle),c=Math.cos(angle);
  for(let i=0;i<m.length;i+=13){
    const x=m[i]*scale,y=m[i+1]*scale,z=m[i+2]*scale;
    out.push(p[0]+c*x+s*z,p[1]+y,p[2]-s*x+c*z,
      c*m[i+3]+s*m[i+5],m[i+4],-s*m[i+3]+c*m[i+5],
      m[i+6],m[i+7],m[i+8],m[i+9],m[i+10],m[i+11],m[i+12]+flash);
  }
}
function botModel(type){
  return model("bot"+type,o=>{
    const scout=type==="scout",hunter=type==="hunter";
    const shell=scout?[1,.64,.23]:hunter?[.85,.29,.21]:[.62,.48,.80];
    diamond(o,[0,.09,0],[.75,.68,.88],"body",shell);
    box(o,[0,-.04,.54],[.74,.35,.60],"trim",[.33,.39,.41]);
    box(o,[0,.05,.88],[.52,.13,.07],"lamp",hunter?red:cyan,1.0);
    for(const side of [-1,1]){
      const x=side*(scout?.65:.78);
      box(o,[x,-.10,.02],[.44,hunter?.36:.58,1.05],"body",shell);
      box(o,[x,-.17,.59],[.26,.27,.48],"vent",metal);
      box(o,[x,-.17,.83],[.14,.15,.03],"lamp",red,.8);
      box(o,[x,-.1,-.53],[.29,.29,.08],"lamp",cyan,.8);
      tri(o,[x,.18,-.5],[side*(hunter?1.30:1.07),hunter?.48:.68,-.82],[x,.19,.36],"body",shell);
      if(!scout)box(o,[x*.87,.32,-.17],[.32,.23,.47],"hazard",white);
    }
  });
}
function itemModel(type){
  return model(type,o=>{
    if(colors[type]&&["blue","yellow","red"].includes(type)){
      ring(o,[0,0,0],.73,.42,.17,"lamp",colors[type],.85,8);
      box(o,[0,0,.82],[.23,.16,.75],"lamp",colors[type],.8);box(o,[.13,0,1.05],[.33,.16,.18],"lamp",colors[type],.8);
      diamond(o,[0,0,0],[.16,.23,.16],"lamp",white,.8);
    }else if(type==="missiles"){
      for(const x of [-.22,.22]){
        box(o,[x,0,0],[.24,.95,.26],"body",[.74,.76,.68]);
        diamond(o,[x,.50,0],[.15,.22,.15],"body",amber);
      }box(o,[0,-.22,0],[.81,.18,.45],"hazard",white);
    }else if(type==="hostage"){
      box(o,[0,0,0],[.56,.68,.38],"body",[.97,.55,.18]);
      for(const x of [-.16,.16])box(o,[x,-.53,0],[.20,.51,.26],"body",[.45,.52,.54]);
      diamond(o,[0,.59,0],[.29,.31,.28],"glass",[.63,.96,1],.45);
      for(const x of [-.39,.39])box(o,[x,.03,0],[.17,.58,.21],"body",[1,.68,.27]);
      ring(o,[0,-.87,0],.71,.61,.09,"lamp",green,.8,12);
    }else{
      const col=type==="energy"?amber:type==="shields"?[.22,.57,1]:[.82,.36,1];
      diamond(o,[0,0,0],[.56,.73,.56],"glass",col,.52);
      ring(o,[0,0,0],.82,.65,.13,"trim",white,0,8);
      ring(o,[0,.05,0],.82,.77,.07,"lamp",col,.8,8);
    }
  });
}
function drawObjects(view){
  const obj=[],glows=[];
  const glow=(p,size,col)=>{
    if(view.modern&&dot(sub(p,view.p),view.f)>.05)
      centered(glows,p,mul(view.r,size),mul(view.u,size),"halo",col,.55,[.999,.999]);
  };
  const t=elapsed;
  let near=world.rooms.find(r=>r.type==="core").c,lightCol=red;
  let lightDistance=dist(view.p,near);
  const setLight=(p,c)=>{const d=dist(view.p,p);if(d<lightDistance){near=p;lightCol=c;lightDistance=d;}};
  for(const e of world.edges){
    if(!e.lock||e.open>=1)continue;
    const col=colors[e.lock]||amber;
    const {u,v,n}=orthoFace(e.d,e.sg);
    for(const sign of [-1,1]){
      const w=portal*(1-e.open);if(w<.01)continue;
      const mid=add(e.c,mul(u,sign*(portal-w*.5)));
      const size=vec();size[e.d]=.43;size[u.findIndex(x=>x!==0)]=w;size[v.findIndex(x=>x!==0)]=2*portal;
      box(obj,mid,size,"exitplate",mul(col,.78));
      for(const faceSign of [-1,1]){
        const p=add(mid,mul(n,.228*faceSign));
        surface(obj,p,u,v,Math.max(.08,w*.68),.28,"lamp",col,.82);
      }
    }
  }
  for(const b of S.bots){
    if(b.hp<=0||dist(b.p,view.p)>78)continue;
    instance(obj,botModel(b.type),b.p,b.heading,robotTypes[b.type].size,b.flash*3.3);
    const eye=add(b.p,[Math.sin(b.heading)*.91,.08,Math.cos(b.heading)*.91]);
    glow(eye,1.13,b.type==="hunter"?red:cyan);
  }
  const cr=world.rooms.find(r=>r.type==="core").c;
  const complex=model("corebase",o=>{
    ring(o,[0,-2.2,0],2.35,1.7,.43,"body",metal,0,12);
    ring(o,[0,2.2,0],2.18,1.72,.39,"hazard",metal,0,12);
    for(let j=0;j<4;j++){const a=j*Math.PI/2+.4;box(o,[2*Math.cos(a),0,2*Math.sin(a)],[.34,4.4,.38],"trim",metal);}
  });
  instance(obj,complex,cr);
  if(S.core>0){
    const rot=model("rotor",o=>{
      diamond(o,[0,0,0],[1.15,1.83,1.15],"lamp",[1,.33,.09],.9);
      for(const y of [-1.27,0,1.27])ring(o,[0,y,0],1.82,1.35,.25,"body",[.91,.48,.18],.11,9);
      for(let i=0;i<3;i++){const a=i*2*Math.PI/3;box(o,[Math.cos(a)*1.43,0,Math.sin(a)*1.43],[.17,2.7,.17],"lamp",amber,.9);}
    });instance(obj,rot,cr,t*.8);glow(cr,5,red);
  }
  for(const a of S.pickup){
    if(a.taken||dist(a.p,view.p)>72)continue;
    const p=add(a.p,[0,.18*Math.sin(t*2+a.p[0]),0]);
    instance(obj,itemModel(a.type),p,t*(a.type==="hostage"?.35:1.15));
    glow(p,1.9,colors[a.type]||(a.type==="hostage"?green:amber));
  }
  for(const b of bullets){
    const p=b.p,col=b.owner==="bot"?red:b.type==="missile"?amber:b.type==="spread"?[.75,.39,1]:cyan;
    if(b.type==="missile"){diamond(obj,p,[.15,.15,.35],"body",white);glow(p,1.2,amber);}
    else{const back=add(p,mul(b.dir,-.68)),side=mul(view.r,.074),vert=mul(view.u,.074);
      face(obj,sub(back,side),mul(side,2),sub(p,back),"lamp",col,1);
      face(obj,sub(back,vert),mul(vert,2),sub(p,back),"lamp",col,1);glow(p,b.owner==="bot"?.97:.69,col);}
    setLight(p,col);
  }
  for(const p of sparks){const s=Math.min(.12,p.ttl*.26);surface(obj,p.p,view.r,view.u,s,s,"lamp",p.col,1);glow(p.p,s*3,p.col);}
  for(const f of flares){diamond(obj,f.p,[.12,.12,.16],"lamp",amber,1);glow(f.p,1.9,amber);setLight(f.p,mul(amber,2.5));}
  if(fireFlash>.06)setLight(add(view.p,mul(view.f,1)),mul(cyan,1.2));
  view.light=near;view.lightCol=lightCol;return [obj,glows];
}
function softwareRenderer(canvas){
  // Perspective-correct texture mapping and a depth buffer keep the original
  // silhouettes, portal labels and overlapping decks visible without WebGL.
  const atlas=makeAtlas(),g=canvas.getContext("2d",{alpha:false});
  const tex=atlas.getContext("2d").getImageData(0,0,atlas.width,atlas.height).data;
  let stat=[],image,depth,W,H,pixels;
  const vertex=(data,i,v)=>{
    const x=data[i]-v.p[0],y=data[i+1]-v.p[1],z=data[i+2]-v.p[2];
    return [x*v.r[0]+y*v.r[1]+z*v.r[2],x*v.u[0]+y*v.u[1]+z*v.u[2],x*v.f[0]+y*v.f[1]+z*v.f[2],data[i+6],data[i+7]];
  };
  function raster(a,b,c,m,ghost,v){
    const ax=a[0],ay=a[1],bx=b[0],by=b[1],cx=c[0],cy=c[1];
    const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
    if(Math.abs(det)<.025)return;
    const left=Math.max(0,Math.floor(Math.min(ax,bx,cx))),right=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx)));
    const top=Math.max(0,Math.floor(Math.min(ay,by,cy))),bottom=Math.min(H-1,Math.ceil(Math.max(ay,by,cy)));
    if(left>right||top>bottom)return;
    const ux=(by-cy)/det,uy=(cx-bx)/det,vx=(cy-ay)/det,vy=(ax-cx)/det;
    const ix=ux*(a[2]-c[2])+vx*(b[2]-c[2]),iy=uy*(a[2]-c[2])+vy*(b[2]-c[2]);
    const tx=ux*(a[3]-c[3])+vx*(b[3]-c[3]),ty=uy*(a[3]-c[3])+vy*(b[3]-c[3]);
    const sx=ux*(a[4]-c[4])+vx*(b[4]-c[4]),sy=uy*(a[4]-c[4])+vy*(b[4]-c[4]);
    const l=left+.5-cx,h=top+.5-cy;
    let rowZ=c[2]+ix*l+iy*h,rowT=c[3]+tx*l+ty*h,rowS=c[4]+sx*l+sy*h;
    let rowU=ux*l+uy*h,rowV=vx*l+vy*h;
    const offset=m.base,cr=m.cr,cg=m.cg,cb=m.cb,q=v.modern?256:48;
    for(let Y=top;Y<=bottom;Y++){
      let u=rowU,t=rowV,z=rowZ,uu=rowT,vv=rowS,p=Y*W+left;
      for(let X=left;X<=right;X++,p++,u+=ux,t+=vx,z+=ix,uu+=tx,vv+=sx){
        if(u<-.0001||t<-.0001||u+t>1.0001||z<=depth[p])continue;
        const inv=1/z,uu0=uu*inv,vv0=vv*inv;
        const x=Math.min(255,Math.floor((uu0-Math.floor(uu0))*q)*256/q)|0;
        const y=Math.min(255,Math.floor((vv0-Math.floor(vv0))*q)*256/q)|0;
        const h=offset+((y*2048+x)<<2),j=p*4;
        if(ghost){const alpha=tex[h+3]/255;if(alpha<=.01)continue;
          pixels[j]+=tex[h]*cr*alpha;pixels[j+1]+=tex[h+1]*cg*alpha;pixels[j+2]+=tex[h+2]*cb*alpha;continue;}
        const fog=1/(1+inv*.009);
        pixels[j]=tex[h]*cr*fog+7*(1-fog);pixels[j+1]=tex[h+1]*cg*fog+12*(1-fog);
        pixels[j+2]=tex[h+2]*cb*fog+19*(1-fog);pixels[j+3]=255;depth[p]=z;
      }
      rowZ+=iy;rowT+=ty;rowS+=sy;rowU+=uy;rowV+=vy;
    }
  }
  function triangles(data,v,ghost){
    const focal=H*.68,clip=.12;
    for(let i=0;i<data.length;i+=39){
      const a=vertex(data,i,v),b=vertex(data,i+13,v),c=vertex(data,i+26,v);
      const far=Math.max(a[2],b[2],c[2]);if(far<clip||Math.min(a[2],b[2],c[2])>94)continue;
      if([a,b,c].every(p=>p[0]*focal>p[2]*W*.51)||[a,b,c].every(p=>-p[0]*focal>p[2]*W*.51)||
        [a,b,c].every(p=>Math.abs(p[1])*focal>p[2]*H*.51&&p[1]>0)||[a,b,c].every(p=>-p[1]*focal>p[2]*H*.51))continue;
      let list=[a,b,c];
      if(Math.min(a[2],b[2],c[2])<clip){
        const clipped=[];for(let j=0;j<3;j++){
          const p=list[j],r=list[(j+1)%3];if(p[2]>=clip)clipped.push(p);
          if((p[2]>=clip)!==(r[2]>=clip))clipped.push(lerp(p,r,(clip-p[2])/(r[2]-p[2])));
        }list=clipped;
      }
      const points=list.map(p=>{const iz=1/p[2];return [W*.5+p[0]*iz*focal,H*.5-p[1]*iz*focal,iz,p[3]*iz,p[4]*iz];});
      const tile=data[i+8],emit=data[i+12];
      const ambient=(v.modern?.84:.77)+.16*Math.abs(data[i+4])+.09*Math.abs(data[i+5])+emit*1.22;
      const pos=[data[i],data[i+1],data[i+2]],delta=sub(pos,v.light),intensity=v.modern?1/(1+.12*dot(delta,delta)):0;
      const lit=[0,1,2].map(k=>data[i+9+k]*(ambient+intensity*v.lightCol[k])+(v.alert&&k===0?.07+.07*Math.sin(v.time*6):0));
      const m={base:((Math.floor(tile/8)*256*2048+(tile%8)*256)<<2),cr:lit[0],cg:lit[1],cb:lit[2]};
      for(let j=1;j<points.length-1;j++)raster(points[0],points[j],points[j+1],m,ghost,v);
    }
  }
  return {software:true,setWorld(w){stat=new Float32Array(buildWorld(w));},render(v,objects,glows){
    if(W!==canvas.width||H!==canvas.height){W=canvas.width;H=canvas.height;image=g.createImageData(W,H);pixels=image.data;depth=new Float32Array(W*H);}
    new Uint32Array(pixels.buffer).fill(0xff100c08);depth.fill(0);
    triangles(stat,v,false);triangles(objects,v,false);triangles(glows,v,true);g.putImageData(image,0,0);
  }};
}
