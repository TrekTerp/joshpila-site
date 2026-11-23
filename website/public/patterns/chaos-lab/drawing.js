(() => {
  "use strict";
  const E=ChaosEngine;
  const palette=["#6ce4c4","#ffba79","#c9a8ff","#f5dc86","#f1a5ba"];
  const gold="#ffe09d",mint="#76dfc7",coral="#ff9b7f",soft="#a8c1b5",dark="#0d2929";
  const digits=new Intl.NumberFormat("en");
  const compact=n=>n>=1e6?(n/1e6).toFixed(n%1e6?1:0)+"M":n>=1e3?(n/1e3).toFixed(n%1e3?1:0)+"k":String(n);
  let carpetImage=null,carpetDepth=-1;
  function prepare(canvas){
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
    if(!w||!h)return null;
    const dpi=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpi)||canvas.height!==Math.round(h*dpi)){
      canvas.width=Math.round(w*dpi);canvas.height=Math.round(h*dpi);
    }
    const c=canvas.getContext("2d");
    c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    c.clearRect(0,0,w,h);
    return {c,w,h};
  }
  function label(c,str,x,y,color=soft,size=12,align="left",family="monospace"){
    c.fillStyle=color;c.font=size+"px "+family;c.textAlign=align;c.textBaseline="middle";c.fillText(str,x,y);
  }
  function stroke(c,color,width,draw){
    c.beginPath();draw();c.strokeStyle=color;c.lineWidth=width;c.stroke();
  }
  function ring(c,x,y,r,color,width=1){
    stroke(c,color,width,()=>c.arc(x,y,r,0,2*Math.PI));
  }
  function line(c,x,y,x2,y2,color,width=1){
    stroke(c,color,width,()=>{c.moveTo(x,y);c.lineTo(x2,y2);});
  }
  function carpetTile(depth){
    if(carpetImage&&depth===carpetDepth)return carpetImage;
    let tile=document.createElement("canvas");tile.width=tile.height=1;
    const start=tile.getContext("2d");start.fillStyle="#2a6456";start.fillRect(0,0,1,1);
    for(let k=0;k<depth;k++){
      const next=document.createElement("canvas");const s=tile.width;next.width=next.height=s*3;
      const ctx=next.getContext("2d");for(let x=0;x<3;x++)for(let y=0;y<3;y++)if(x!==1||y!==1)ctx.drawImage(tile,x*s,y*s);
      tile=next;
    }
    carpetDepth=depth;carpetImage=tile;return tile;
  }
  function latest(s){
    if(!s.n)return null;
    const i=((s.n-1)%s.limit)*5;
    return [s.marks[i],s.marks[i+1]];
  }
  function field(c,s,box,mini,activePeg){
    const {x,y,size}=box,m=s.method;
    c.save();c.translate(x,y);
    c.fillStyle=dark;c.fillRect(0,0,size,size);
    if(m==="carpet"){
      c.imageSmoothingEnabled=false;c.drawImage(carpetTile(s.opts.depth),0,0,size,size);c.imageSmoothingEnabled=true;
    }else if(m==="needles"){
      for(let k=0;k<6;k++){
        c.fillStyle=k%2?"#253936":"#30433a";c.fillRect(0,k*size/6,size,size/6);
        if(!mini)for(let g=0;g<4;g++){
          const y0=(k+(g+1)/5)*size/6;
          stroke(c,"#b6ad8122",.75,()=>{c.moveTo(0,y0);c.bezierCurveTo(size*.34,y0-4,size*.58,y0+5,size,y0-1);});
        }
      }
    }else{
      for(let k=1;k<8;k++){
        const u=size*k/8;line(c,u,0,u,size,"#385850",.5);line(c,0,u,size,u,"#385850",.5);
      }
    }
    if(m==="darts"||s.square){
      c.beginPath();c.arc(size/2,size/2,size/2,0,2*Math.PI);c.fillStyle="#448b741c";c.fill();
      ring(c,size/2,size/2,size/2,"#c6bd88",mini?.8:1.3);
      line(c,size*.47,size/2,size*.53,size/2,"#d9dab373");line(c,size/2,size*.47,size/2,size*.53,"#d9dab373");
    }
    if(m==="needles")for(let i=0;i<=6;i++)line(c,0,i*size/6,size,i*size/6,"#cdbb89",mini?.8:1.25);
    if(m==="chaos"&&!mini){
      stroke(c,"#6f988289",.9,()=>{s.opts.pegs.forEach(([px,py],i)=>i===0?c.moveTo(px*size,py*size):c.lineTo(px*size,py*size));c.closePath();});
    }
    c.save();c.beginPath();c.rect(0,0,size,size);c.clip();
    const total=Math.min(s.n,s.limit,mini?(m==="needles"?70:1600):s.limit);
    const data=s.marks,first=s.n-total;
    const markSize=mini?1.1:m==="chaos"?Math.max(.95,Math.min(1.6,size/225)):Math.max(1.35,Math.min(2.45,size/165));
    const bins=m==="chaos"?s.opts.pegs.length:2;
    for(let j=0;j<bins;j++){
      const color=m==="chaos"?palette[j]:j?(m==="needles"?gold:mint):coral;
      c.fillStyle=color;c.strokeStyle=color;c.globalAlpha=m==="needles"?.85:.8;c.lineWidth=mini?.9:1.4;c.beginPath();
      for(let n=first;n<s.n;n++){
        const i=(n%s.limit)*5;if(data[i+4]!==j)continue;
        const px=data[i]*size,py=data[i+1]*size;
        if(m==="needles"){
          const dx=data[i+2]*size,dy=data[i+3]*size;c.moveTo(px-dx,py-dy);c.lineTo(px+dx,py+dy);
        }else{c.fillRect(px-markSize/2,py-markSize/2,markSize,markSize);}
      }
      if(m==="needles")c.stroke();
    }
    c.restore();
    c.strokeStyle="#8ca693";c.lineWidth=.8;c.strokeRect(0,0,size,size);
    if(!mini){
      const mark=latest(s);
      if(m==="chaos"&&mark&&s.opts.showJump!==false){
        const origin=[s.prevX*size,s.prevY*size],target=s.opts.pegs[s.lastPeg];
        c.setLineDash([3,5]);line(c,...origin,target[0]*size,target[1]*size,"#e1e5bb80");c.setLineDash([]);
        line(c,...origin,mark[0]*size,mark[1]*size,"#fff2b6",1.5);
        ring(c,...origin,2.8,"#f6f1d7",1.15);
      }
      if(mark){const [px,py]=mark;ring(c,px*size,py*size,4.5,"#fff5d3",1.15);}
      for(let k=0;k<=10;k++)line(c,k*size/10,size,k*size/10,size+(k%5===0?5:2.5),"#96ad99",.7);
      if(m==="chaos"){
        s.opts.pegs.forEach(([px,py],i)=>{
          const cx=px*size,cy=py*size;
          c.beginPath();c.arc(cx,cy,activePeg===i?8:6.5,0,2*Math.PI);
          c.fillStyle=palette[i];c.fill();ring(c,cx,cy,activePeg===i?10:7.5,"#122c29",2);
          label(c,String(i+1),cx,cy+.6,"#0a2926",10,"center");
        });
      }
    }
    c.restore();
  }
  const outcome=s=>s.method==="needles"?["Crossings","Clear",gold,coral]:s.method==="carpet"?["Retained","Holes",mint,coral]:["Inside","Outside",mint,coral];
  function stage(canvas,run,activePeg) {
    const g=prepare(canvas);if(!g)return null;
    const {c,w,h}=g;
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#173c36");bg.addColorStop(1,"#0c2629");c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.fillStyle="#9bbda11a";for(let y=11;y<h;y+=16)for(let x=11;x<w;x+=16)c.fillRect(x,y,1,1);
    if(run.mode==="race"){
      const stacked=w<495,pad=stacked?12:16;
      run.series.forEach((s,i)=>{
        const cw=stacked?w-2*pad:(w-2*pad-20)/3,ch=stacked?(h-2*pad-12)/3:h-2*pad;
        const x=stacked?pad:pad+i*(cw+10),y=stacked?pad+i*(ch+6):pad;
        c.fillStyle="#0d2d2ad6";c.fillRect(x,y,cw,ch);c.strokeStyle="#697e686e";c.strokeRect(x+.5,y+.5,cw-1,ch-1);
        const side=stacked?Math.min(ch-12,86):Math.min(cw-20,ch-102);
        const bx=stacked?x+8:x+(cw-side)/2,by=stacked?y+(ch-side)/2:y+(ch-side)/2-2;
        field(c,s,{x:bx,y:by,size:side},true);
        const vals=E.estimate(s),name=s.method==="chaos"?"Square walk":s.method==="darts"?"Dartboard":"Needles";
        const align=stacked?"left":"center",lx=stacked?bx+side+14:x+cw/2;
        label(c,name,lx,stacked?y+ch*.32:by-21,E.colors[s.method],stacked?15:18,align,"Georgia");
        label(c,vals===null?"—":vals.toFixed(5),lx,stacked?y+ch*.66:by+side+24,"#f7edd0",stacked?22:Math.min(33,cw/6),align,"Georgia");
      });
      return null;
    }
    const s=run.series[0],wide=w/h>=1.48&&w>=535;
    const side=Math.max(1,Math.min(h-48,wide?w*.59-26:w-44));
    const x=wide?(w*.61-side)/2:(w-side)/2,y=(h-side)/2;
    field(c,s,{x,y,size:side},false,activePeg);
    if(wide){
      const tx=w*.655,end=w-22,tw=end-tx;
      line(c,w*.625,24,w*.625,h-24,"#a2bb952f");
      const free=s.method==="chaos"&&!s.square,area=s.method==="carpet";
      const top=h*.29,est=E.estimate(s);
      label(c,free?"GRID COVERAGE":area?"AREA ESTIMATE":"π ESTIMATE",tx,top,soft,11);
      label(c,est===null?"—":(area||free)?(100*est).toFixed(2)+"%":est.toFixed(5),tx,top+33,"#f5e6bb",Math.min(39,tw/4),"left","Georgia");
      const [nameA,nameB,inkA,inkB]=free?["Visited","Unvisited",mint,"#54716d"]:outcome(s);
      const fraction=free?s.occupied/4096:s.n?s.hits/s.n:0,by=top+72;
      c.fillStyle=inkB;c.fillRect(tx,by,tw,6);c.fillStyle=inkA;c.fillRect(tx,by,tw*fraction,6);
      label(c,nameA,tx,by+20,inkA,11);label(c,nameB,end,by+20,inkB,11,"right");
      label(c,digits.format(s.n),tx,by+55,"#e9efda",19,"left","Georgia");
      label(c,s.method==="chaos"?"counted jumps":"trials",tx,by+74,soft,11);
    }
    return {x,y,size:side};
  }
  function graph(canvas,run,recent=false){
    const g=prepare(canvas);if(!g)return;const {w,h,c}=g;
    const s=run.series[0],frac=s.method==="carpet"||s.method==="chaos"&&!s.square;
    const ref=s.method==="carpet"?(8/9)**s.opts.depth:frac?null:Math.PI;
    const left=recent?52:w<400?40:48,right=w-12,top=13,bottom=h-28;
    const n=s.n,first=recent?Math.max(1,Math.ceil(n/2)):1,lines=run.series.map(v=>{
      const pts=[...v.history];if(n&&pts.at(-1)?.[0]!==n)pts.push([n,E.estimate(v)]);return pts.filter(p=>p[0]>=first);
    });
    const vals=lines.flat().map(p=>p[1]).filter(Number.isFinite);
    let low=frac?0:Math.floor(Math.min(3,...vals)*2)/2,high=frac?1:Math.ceil(Math.max(3.5,...vals)*2)/2;
    if(recent&&vals.length){
      const hits=ref===null?vals:[...vals,ref],lo=Math.min(...hits),hi=Math.max(...hits);
      const pad=Math.max((hi-lo)*.12,.00015);low=Math.max(0,lo-pad);high=frac?Math.min(1,hi+pad):hi+pad;
    }
    const X=i=>left+(right-left)*(recent?(i-first)/Math.max(1,n-first):Math.log10(Math.max(1,i))/Math.log10(Math.max(n,10)));
    const Y=v=>bottom-(v-low)/(high-low)*(bottom-top);
    for(let j=0;j<=4;j++){
      const v=low+(high-low)*j/4,y=Y(v);line(c,left,y,right,y,"#c5ccb9",.75);
      const precision=recent&&high-low<.1?(high-low<.01?4:3):2;
      label(c,frac?(v*100).toFixed(recent&&high-low<.1?2:0)+"%":v.toFixed(precision),left-6,y,"#47625a",10,"right");
    }
    const lastPow=Math.floor(Math.log10(Math.max(n,10))),interval=lastPow>5&&w<430?2:1;
    const ticks=recent?[...new Set([first,Math.round((first+Math.max(n,first))/2),Math.max(n,first)])]:
      Array.from({length:1+Math.floor(lastPow/interval)},(_,p)=>10**(p*interval));
    for(const i of ticks){
      const x=X(i);line(c,x,top,x,bottom,"#d6dbcd",.7);label(c,compact(i),x,bottom+13,"#47625a",10,x>right-5?"right":"center");
    }
    if(ref!==null){c.setLineDash([3,4]);line(c,left,Y(ref),right,Y(ref),"#414e44",1.2);c.setLineDash([]);}
    const inks=run.mode==="race"?["#147568","#996724","#a04435"]:["#216d63"];
    for(let j=0;j<lines.length;j++){
      const pts=lines[j];c.setLineDash(run.mode==="race"?[[],[6,3],[2,2]][j]:[]);
      stroke(c,inks[j],1.7,()=>{
        let first=true;for(const [count,value] of pts){
          if(value===null){first=true;continue;}
          if(first)c.moveTo(X(count),Y(value));else c.lineTo(X(count),Y(value));first=false;
        }
      });c.setLineDash([]);
      const end=pts.at(-1);if(end&&end[1]!==null){c.fillStyle=inks[j];c.beginPath();c.arc(X(end[0]),Y(end[1]),2.4,0,Math.PI*2);c.fill();}
    }
    if(!n)label(c,"Run or step to plot samples",(left+right)/2,(top+bottom)/2,"#3d5c53",12,"center");
  }
  globalThis.ChaosDrawing={stage,graph};
})();
