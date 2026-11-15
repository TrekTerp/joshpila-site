/* Controlled Evolved rope geometry. No game-state writes or visual randomness. */
const RopeGeometry=(()=>{
  const height=34.65,width=15,radius=10,collar=1.5,period=152*160/1254;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function create(gap){
    let lo=.01,hi=Math.PI/2;
    const inner=height-2*collar;
    for(let i=0;i<50;i++){
      const a=(lo+hi)/2;
      const length=(gap-2*radius*(1-Math.cos(a)))/Math.sin(a);
      if(2*radius*Math.sin(a)+length*Math.cos(a)>inner)lo=a;else hi=a;
    }
    const angle=(lo+hi)/2,sin=Math.sin(angle),cos=Math.cos(angle);
    const diagonal=(gap-2*radius*(1-cos))/sin;
    const arc=radius*angle,length=2*collar+2*arc+diagonal;
    const ax=radius*(1-cos),ay=collar+radius*sin;
    const bx=ax+diagonal*sin,by=ay+diagonal*cos;
    function at(s){
      if(s<=collar)return {x:0,y:s,a:0};
      s-=collar;
      if(s<=arc){const a=s/radius;return{x:radius*(1-Math.cos(a)),y:collar+radius*Math.sin(a),a};}
      s-=arc;
      if(s<=diagonal)return{x:ax+s*sin,y:ay+s*cos,a:angle};
      s-=diagonal;
      if(s<=arc){const a=angle-s/radius;return{x:bx+radius*(Math.cos(a)-cos),y:by+radius*(sin-Math.sin(a)),a};}
      return{x:gap,y:height-collar+s-arc,a:0};
    }
    function nearest(x,y){
      let best={distance:Infinity,n:0,s:0};
      function test(s){const p=at(s),dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);
        if(d<best.distance)best={distance:d,n:dx*Math.cos(p.a)-dy*Math.sin(p.a),s};}
      // Extend endpoint collars through the one-unit sampling gutter.
      test(clamp(y,-2,collar));
      test(collar+radius*clamp(Math.atan2(y-collar,radius-x),0,angle));
      test(collar+arc+clamp((x-ax)*sin+(y-ay)*cos,0,diagonal));
      const a=clamp(Math.atan2(height-collar-y,x-(gap-radius)),0,angle);
      test(collar+arc+diagonal+radius*(angle-a));
      test(length+clamp(y-height,-collar,2));
      return best;
    }
    return {gap,height,width,length,angle,at,nearest};
  }
  return {create,height,width,period};
})();

class RopePainter {
  constructor(material){
    this.material=material;this.maps=new Map();this.tiles=new Map();this.key=null;
    this.layer=document.createElement('canvas');this.layer.width=1440;this.layer.height=1520;
    this.ctx=this.layer.getContext('2d');this.ctx.scale(2,2);this.builds=0;
    const read=document.createElement('canvas');read.width=material.width;read.height=material.height;
    const r=read.getContext('2d',{willReadFrequently:true});r.drawImage(material,0,0);
    this.pixels=r.getImageData(0,0,read.width,read.height).data;
  }
  map(gap,direction){
    const key=gap.toFixed(6)+':'+direction;
    if(this.maps.has(key))return this.maps.get(key);
    const geometry=RopeGeometry.create(gap),w=gap+24,h=geometry.height+2;
    const nx=Math.ceil(w*3),ny=Math.ceil(h*3),s=new Float32Array(nx*ny),u=new Float32Array(nx*ny),alpha=new Uint8ClampedArray(nx*ny);
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const xx=(x+.5)*w/nx-12,yy=(y+.5)*h/ny-1;
      const p=geometry.nearest(direction===1?xx:gap-xx,yy),i=y*nx+x;
      s[i]=p.s;u[i]=Math.max(0,Math.min(119,((direction===1?p.n:-p.n)/15+.5)*119));
      alpha[i]=Math.max(0,Math.min(255,(7.5-p.distance)*3*255+127.5));
    }
    const result={geometry,w,h,nx,ny,s,u,alpha};this.maps.set(key,result);return result;
  }
  curve(gap,direction,color,phase){
    phase=((phase%RopeGeometry.period)+RopeGeometry.period)%RopeGeometry.period;
    const key=[gap.toFixed(6),direction,color,phase.toFixed(6)].join(':');
    if(this.tiles.has(key))return this.tiles.get(key);
    const m=this.map(gap,direction),out=document.createElement('canvas');out.width=m.nx;out.height=m.ny;
    const ctx=out.getContext('2d'),image=ctx.createImageData(m.nx,m.ny),dst=image.data,src=this.pixels;
    const tw=600,th=152;
    for(let i=0;i<m.s.length;i++){
      if(!m.alpha[i])continue;
      const u=m.u[i],v=((m.s[i]+phase)/RopeGeometry.period*th%th+th)%th;
      const x0=Math.floor(u),x1=Math.min(119,x0+1),y0=Math.floor(v),y1=(y0+1)%th,fx=u-x0,fy=v-y0;
      const a=(y0*tw+color*120+x0)*4,b=(y0*tw+color*120+x1)*4;
      const c=(y1*tw+color*120+x0)*4,d=(y1*tw+color*120+x1)*4;
      for(let k=0;k<3;k++)dst[i*4+k]=(src[a+k]*(1-fx)+src[b+k]*fx)*(1-fy)+(src[c+k]*(1-fx)+src[d+k]*fx)*fy;
      dst[i*4+3]=m.alpha[i];
    }
    ctx.putImageData(image,0,0);
    const result={image:out,w:m.w,h:m.h,length:m.geometry.length};
    if(this.tiles.size>=128)this.tiles.delete(this.tiles.keys().next().value);
    this.tiles.set(key,result);return result;
  }
  straight(color,x,from,to,phase){
    if(to<=from)return;
    const c=this.ctx,p=RopeGeometry.period;
    c.save();c.beginPath();c.rect(x-7.5,from,15,to-from);c.clip();
    const offset=((phase%p)+p)%p;
    for(let y=from-offset;y<to;y+=p)c.drawImage(this.material,color*120,0,120,152,x-7.5,y,15,p+.002);
    c.restore();
  }
  shadow(gap,direction,x,y){
    const c=this.ctx,g=this.map(gap,direction).geometry;
    c.save();c.beginPath();c.rect(x-12,y+4,gap+24,g.height-8);c.clip();
    c.beginPath();
    for(let s=0;s<g.length+.5;s+=.5){const p=g.at(Math.min(s,g.length));
      const px=x+(direction===1?p.x:gap-p.x);if(s===0)c.moveTo(px,y+p.y);else c.lineTo(px,y+p.y);}
    c.strokeStyle='#07171ee6';c.lineWidth=18;c.lineCap='butt';c.stroke();c.restore();
  }
  draw(ctx,game){
    const key=JSON.stringify([game.ropes,game.knots.map(k=>[k.row,k.col,k.dir])]);
    if(this.key!==key){
      const c=this.ctx,n=game.ropes.length,gap=Math.min(76,570/Math.max(1,n-1));
      const x=i=>360+(i-(n-1)/2)*gap;
      const lanes=game.ropes.map(r=>r.id),ends=Array(n).fill(64);
      const colors=new Map(game.ropes.map(r=>[r.id,r.color]));
      const distances=new Map(game.ropes.map(r=>[r.id,0]));
      c.clearRect(0,0,720,760);
      for(const k of [...game.knots].sort((a,b)=>a.row-b.row||a.col-b.col)){
        const l=k.col,r=l+1,cy=70+k.row*39.375,start=cy-RopeGeometry.height/2;
        for(const col of [l,r]){
          const id=lanes[col],phase=distances.get(id);
          this.straight(colors.get(id),x(col),ends[col],start+.25,phase);
          distances.set(id,phase+Math.max(0,start-ends[col]));
        }
        const draw=(direction,col,over)=>{
          const id=lanes[col],tile=this.curve(gap,direction,colors.get(id),distances.get(id));
          if(over)this.shadow(gap,direction,x(l),start);
          c.drawImage(tile.image,x(l)-12,start-1,tile.w,tile.h);
          distances.set(id,distances.get(id)+tile.length);
        };
        if(k.dir===1){draw(-1,r,false);draw(1,l,true);}else{draw(1,l,false);draw(-1,r,true);}
        [lanes[l],lanes[r]]=[lanes[r],lanes[l]];ends[l]=ends[r]=start+RopeGeometry.height;
      }
      for(let col=0;col<n;col++){
        const id=lanes[col];this.straight(colors.get(id),x(col),ends[col]-.25,706,distances.get(id)-.25);
      }
      this.endColors=lanes.map(id=>colors.get(id));this.distances=distances;this.key=key;this.builds++;
    }
    ctx.drawImage(this.layer,0,0,720,760);return this.endColors;
  }
}
if(typeof module!=='undefined')module.exports={RopeGeometry,RopePainter};
