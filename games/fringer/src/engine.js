/* Fringer remake engine. Renderer-independent, deterministic for a supplied seed. */
(function (root) {
'use strict';
const LIMIT = 16;
function random(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n,1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
class Game {
  constructor(seed = Date.now(), practice = false) {
    this.seed = seed >>> 0; this.practice = practice; this.level = 1;
    this.score = 0; this.bonuses = 2; this.totalFreed = 0; this.moves = 0;
    this.newLevel();
  }
  newLevel() {
    const rng = random(this.seed + this.level * 7919);
    const n = Math.min(10, 6 + Math.floor((this.level - 1) / 3));
    const colors = Math.min(5, 1 + Math.ceil(this.level / 3));
    this.ropes = Array.from({length:n}, (_,id) => ({id, color: this.level === 1 ? (id === n-1 ? 1 : 0) : id % colors}));
    this.knots = []; this.nextId = 0; this.direction = 1; this.column = 0;
    this.elapsed = 0; this.bar = -1.2; this.state = 'playing'; this.levelScore = this.score;
    this.cleared = 0; this.startRopes = n; this.lastEvent = null;
    // Build by legal twists. Reversing the construction always gives a solution.
    const heights = Array(n).fill(0);
    let dir = 1; let lastCol = 0;
    const target = Math.min(40, 7 + this.level * 3);
    for (let step=0;step<target;step++) {
      const choices = Array.from({length:n-1},(_,i)=>i).filter(i=>Math.max(heights[i],heights[i+1])<Math.min(9,4+Math.floor(this.level/2)));
      if(!choices.length) break;
      // Prefer shallow columns to keep the first board broad and readable.
      const minHeight = Math.min(...choices.map(i=>Math.max(heights[i],heights[i+1])));
      const pool = step < n ? choices.filter(i=>Math.max(heights[i],heights[i+1])===minHeight) : choices;
      const c = pool[Math.floor(rng()*pool.length)];
      const row = Math.max(heights[c],heights[c+1])+1;
      dir *= -1;
      this.knots.push({id:this.nextId++,col:c,row,dir,spark:step%5===3,original:true});
      heights[c]=heights[c+1]=row; lastCol=c;
    }
    this.direction=dir; this.column=lastCol;
    this.startKnots=this.knots.length;
    this.release();
  }
  trace() {
    const lanes=this.ropes.map(r=>r.id), details=new Map();
    for(const k of [...this.knots].sort((a,b)=>a.row-b.row || a.col-b.col)) {
      details.set(k.id,{left:lanes[k.col],right:lanes[k.col+1]});
      [lanes[k.col],lanes[k.col+1]]=[lanes[k.col+1],lanes[k.col]];
    }
    return {details,bottom:lanes};
  }
  target(column=this.column) {
    if(this.ropes.length<2) return {kind:'empty',row:1};
    const hits=this.knots.filter(k=>Math.abs(k.col-column)<=1).sort((a,b)=>b.row-a.row);
    const k=hits[0];
    if(!k) return {kind:'add',row:Math.max(1,this.bar+1),column};
    const pair=this.trace().details.get(k.id);
    const color=id=>this.ropes.find(r=>r.id===id)?.color;
    const same=color(pair.left)===color(pair.right);
    if(k.col===column && (k.dir===this.direction || same)) return {kind:'remove',row:k.row,knot:k,column};
    return {kind:'add',row:k.row+1,column,blocked:k.col===column?'angle':'neighbor'};
  }
  select(column) { this.column=Math.max(0,Math.min(this.ropes.length-2,column)); }
  move(delta) { if(this.state==='playing') this.select(this.column+delta); }
  twist() {
    if(this.state!=='playing') return null;
    const t=this.target(); this.moves++;
    if(t.kind==='remove') {
      const k=t.knot; this.knots=this.knots.filter(x=>x.id!==k.id);
      const points=k.original ? 25 : 0; this.score+=points;
      if(k.spark) this.bonuses++;
      this.direction*=-1;
      const freed=this.release();
      this.lastEvent={type:'untie',row:t.row,col:t.column,freed,points:points+freed*100,spark:k.spark};
      if(!this.knots.length) this.win();
    } else if(t.kind==='add') {
      this.direction*=-1;
      this.knots.push({id:this.nextId++,col:this.column,row:t.row,dir:this.direction,spark:false,original:false});
      this.lastEvent={type:'twist',row:t.row,col:t.column};
      if(t.row>=LIMIT) this.state='lost';
    }
    return this.lastEvent;
  }
  flip() {
    if(this.state!=='playing'||(!this.practice && this.bonuses<=0)) return false;
    if(!this.practice) this.bonuses--;
    this.direction*=-1; this.lastEvent={type:'flip'}; return true;
  }
  release() {
    let freed=0;
    // A strand with no crossing is a straight lane. Remove it and close the gap.
    for(let c=this.ropes.length-1;c>=0;c--) {
      if(this.knots.some(k=>k.col===c||k.col+1===c)) continue;
      this.ropes.splice(c,1);
      for(const k of this.knots) if(k.col>c) k.col--;
      freed++;
    }
    this.score+=freed*100; this.cleared+=freed; this.totalFreed+=freed;
    this.select(this.column); return freed;
  }
  win() {
    this.state='won';
    this.timeBonus=this.practice?0:Math.max(0,Math.round((LIMIT-this.bar)*20));
    this.score+=this.timeBonus;
  }
  tick(seconds) {
    if(this.state!=='playing'||this.practice) return;
    this.elapsed+=seconds;
    // The comb advances continuously and pushes each encountered knot downward.
    this.bar+=seconds*(0.055+Math.min(0.12,(this.level-1)*0.008));
    const heights=Array(this.ropes.length).fill(this.bar);
    for(const k of [...this.knots].sort((a,b)=>a.row-b.row || a.col-b.col)) {
      k.row=Math.max(k.row,heights[k.col]+1,heights[k.col+1]+1);
      heights[k.col]=heights[k.col+1]=k.row;
    }
    if(this.knots.some(k=>k.row>=LIMIT)) this.state='lost';
  }
  next() { if(this.state==='won') {this.level++;this.newLevel();} }
}
root.Fringer={Game,LIMIT,random};
if(typeof module!=='undefined') module.exports=root.Fringer;
})(typeof globalThis!=='undefined'?globalThis:this);
