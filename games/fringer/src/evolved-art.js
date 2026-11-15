/* Painted Evolved view. This module only reads game state; Classic uses its original renderer. */
class EvolvedArt {
  constructor(ctx, data) {
    this.ctx=ctx;this.data=data;this.ready=false;
    this.image=new Image();this.material=new Image();
    document.documentElement.dataset.fringerArt='loading';
    const finish=()=>{
      if(!this.image.complete||!this.image.naturalWidth||!this.material.complete||!this.material.naturalWidth)return;
      this.ropePainter=new RopePainter(this.material);
      this.ready=true;document.documentElement.dataset.fringerArt='ready';
    };
    this.image.onload=finish;this.material.onload=finish;
    const failed=()=>{document.documentElement.dataset.fringerArt='fallback';};
    this.image.onerror=failed;this.material.onerror=failed;
    this.image.src=data.image;this.material.src='assets/rope-material-v2.png';
  }
  sprite(name,x,y,w,h){
    const s=this.data.sprites[name];if(!s)return;
    this.ctx.drawImage(this.image,s.x,s.y,s.w,s.h,x,y,w??s.w,h??s.h);
  }
  beam(prefix,left,right,top,height){
    const c=this.ctx,L=this.data.sprites[prefix+'L'],M=this.data.sprites[prefix+'M'],R=this.data.sprites[prefix+'R'];
    const scale=height/(M.joinBottom-M.joinTop),lw=L.w*scale,rw=R.w*scale;
    this.sprite(prefix+'L',left,top-L.joinTop*scale,lw,L.h*scale);
    this.sprite(prefix+'R',right-rw,top-R.joinTop*scale,rw,R.h*scale);
    // Repeat the center grain instead of stretching it across the whole board.
    const start=left+lw-1,end=right-rw+1;
    c.save();c.beginPath();c.rect(start,top-M.joinTop*scale,end-start,M.h*scale);c.clip();
    for(let x=start;x<end;x+=M.w*scale-0.5)this.sprite(prefix+'M',x,top-M.joinTop*scale,M.w*scale,M.h*scale);
    c.restore();
  }
  render(game,time,flash,reduce){
    if(!this.ready)return false;
    const c=this.ctx,W=720,H=760,top=70,bottom=700,dy=39.375;
    const n=game.ropes.length,gap=Math.min(76,570/Math.max(1,n-1));
    const x=i=>W/2+(i-(n-1)/2)*gap,y=row=>top+row*dy;
    c.clearRect(0,0,W,H);c.fillStyle='#10252a';c.fillRect(0,0,W,H);
    const glow=c.createRadialGradient(360,240,20,360,340,550);
    glow.addColorStop(0,'#53635450');glow.addColorStop(1,'#071418a0');c.fillStyle=glow;c.fillRect(0,0,W,H);
    c.lineWidth=1;c.strokeStyle='#a7bfad08';
    for(let xx=0;xx<W;xx+=5){c.beginPath();c.moveTo(xx,0);c.lineTo(xx,H);c.stroke();}
    for(let yy=0;yy<H;yy+=5){c.beginPath();c.moveTo(0,yy);c.lineTo(W,yy);c.stroke();}
    c.setLineDash([3,7]);c.strokeStyle='#c6b58035';c.strokeRect(17,17,W-34,H-34);c.setLineDash([]);
    this.beam('wood',36,W-36,39,25);
    c.fillStyle='#aeb9a5';c.font='10px system-ui';c.textAlign='left';
    c.fillText(game.practice?'UNTIMED PRACTICE':'THE BAR IS ADVANCING',47,25);
    c.textAlign='right';c.fillText(`${game.knots.length} KNOT${game.knots.length===1?'':'S'}`,W-47,25);
    // Frame goes behind the strands so its decoration never hides over/under order.
    if(n>=2&&game.state==='playing'){
      const target=game.target(),cx=(x(game.column)+x(game.column+1))/2,cy=Math.min(bottom+10,y(target.row));
      c.save();c.shadowColor='#fce1a866';c.shadowBlur=6;
      this.sprite('cursor'+game.direction,cx-(gap+29)/2,cy-27,gap+29,54);c.restore();
    }
    const endColors=this.ropePainter.draw(c,game);
    for(const k of game.knots){
      if(k.spark){
        const p=reduce?1:.94+Math.sin(time/350+k.id)*.06;
        this.sprite('spark',(x(k.col)+x(k.col+1))/2+13,y(k.row)-29,25*p,25*p);
      }
    }
    for(let col=0;col<n;col++){
      const color=endColors[col],s=this.data.sprites['tassel'+color],scale=15/s.neck;
      this.sprite('tassel'+color,x(col)-s.anchor*scale,bottom+5,s.w*scale,s.h*scale);
    }
    // Eyelets sit over the rope starts, with their own painted cord meeting the braid.
    for(let col=0;col<n;col++)this.sprite('socket'+game.ropes[col].color,x(col)-24,29,48,49);
    // Small ivory corner marks keep the brass frame legible against gold rope.
    // Put its angle cue beside the crossing, leaving the over-strand visible.
    if(n>=2&&game.state==='playing'){
      const cy=Math.min(bottom+10,y(game.target().row)),left=x(game.column)-15,right=x(game.column+1)+15;
      c.save();c.strokeStyle='#fff0c7';c.lineWidth=1.5;c.shadowColor='#071418';c.shadowBlur=3;
      c.beginPath();
      for(const [xx,sx] of [[left,1],[right,-1]])for(const [yy,sy] of [[cy-24,1],[cy+24,-1]]){
        c.moveTo(xx+8*sx,yy);c.lineTo(xx,yy);c.lineTo(xx,yy+8*sy);
      }
      c.stroke();c.shadowBlur=0;
      const cue=right+11;c.fillStyle='#10252a';c.beginPath();c.arc(cue,cy,10,0,Math.PI*2);c.fill();c.stroke();
      c.lineWidth=2.5;c.beginPath();c.moveTo(cue-4,cy-game.direction*4);c.lineTo(cue+4,cy+game.direction*4);c.stroke();c.restore();
    }
    const danger=game.knots.some(k=>k.row>13);
    c.strokeStyle=danger?'#ed8c7c':'#bc827255';c.lineWidth=1;c.setLineDash([5,6]);
    c.beginPath();c.moveTo(40,bottom);c.lineTo(W-40,bottom);c.stroke();c.setLineDash([]);
    c.fillStyle=danger?'#f4a797':'#b8a18c';c.textAlign='center';c.font='9px system-ui';
    c.fillText('DO NOT LET A KNOT CROSS THIS LINE',W/2,H-18);
    if(!game.practice&&!game.powerUp&&game.bar>=-.3)this.beam('comb',35,W-35,y(game.bar)-4,12);
    if(flash&&time-flash.time<650){
      const age=(time-flash.time)/650;
      if(!reduce){c.save();c.globalAlpha=(1-age)*.85;const size=36+age*30;
        this.sprite('burst',flash.x-size/2,flash.y-size/2,size,size);c.restore();}
      c.save();c.globalAlpha=1-age;c.fillStyle='#ffdf9b';c.font='bold 18px system-ui';c.textAlign='center';
      c.fillText(flash.text,flash.x,flash.y-(reduce?27:20+age*30));c.restore();
    }
    return true;
  }
}
if(typeof module!=='undefined')module.exports={EvolvedArt};

