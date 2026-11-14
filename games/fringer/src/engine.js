/* Fringer remake engine. Renderer-independent, deterministic for a supplied seed. */
(function (root) {
'use strict';
const LIMIT = 16;
function random(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n,1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
class Game {
  constructor(seed = Date.now(), practice = false, startLevel = 1) {
    this.seed = seed >>> 0; this.practice = practice;
    this.level = Math.max(1,Math.min(9,Math.floor(Number(startLevel)||1)));this.screen=1;this.bonusLevel=0;
    this.score = 0; this.bonuses = 2; this.totalFreed = 0; this.moves = 0;
    this.newLevel();
  }
  newLevel() {
    const stageSeed=(this.seed+this.level*7919+(this.screen-1)*104729+this.bonusLevel*1047299)>>>0;
    const rng = random(stageSeed);this.effectSeed=stageSeed^0x5a17c9e3;
    const n = Math.min(10, 6 + Math.floor((this.level - 1) / 2));
    const colors = Math.min(5, 1 + Math.ceil(this.level / 2));this.colorCount=colors;
    this.ropes = Array.from({length:n}, (_,id) => ({id, color: this.level === 1 ? (id === n-1 ? 1 : 0) : id % colors}));
    this.knots = []; this.nextId = 0; this.direction = 1; this.column = 0;
    this.elapsed = 0; this.bar = -1.2; this.state = 'playing'; this.levelScore = this.score;
    this.cleared = 0; this.startRopes = n; this.lastEvent = null;
    this.events=[];this.powerUp=null;this.stageBonus=0;this.timeBonus=0;
    this.nextPowerAt=this.level>=2&&!this.practice?14:Infinity;
    this.nextPowerType=this.level>=3&&this.screen%2?'paint':'fire';
    // Build by legal twists. Reversing the construction always gives a solution.
    const heights = Array(n).fill(0);
    let dir = 1; let lastCol = 0;
    const target = Math.min(50,7+this.level*3+(this.screen-1)*2+this.bonusLevel*2);
    for (let step=0;step<target;step++) {
      const choices = Array.from({length:n-1},(_,i)=>i).filter(i=>Math.max(heights[i],heights[i+1])<Math.min(12,4+Math.floor(this.level/2)+Math.floor(this.bonusLevel/3)));
      if(!choices.length) break;
      // Prefer shallow columns to keep the first board broad and readable.
      const minHeight = Math.min(...choices.map(i=>Math.max(heights[i],heights[i+1])));
      const pool = step < n ? choices.filter(i=>Math.max(heights[i],heights[i+1])===minHeight) : choices;
      const coverPairs=Math.floor(n/2);
      const c = step<coverPairs ? step*2 : (n%2 && step===coverPairs ? n-2 : pool[Math.floor(rng()*pool.length)]);
      const row = Math.max(heights[c],heights[c+1])+1;
      dir *= -1;
      this.knots.push({id:this.nextId++,col:c,row,dir,spark:step%5===3,original:true});
      heights[c]=heights[c+1]=row; lastCol=c;
    }
    this.direction=dir; this.column=lastCol;
    this.startKnots=this.knots.length;
    this.release();
  }
  get stageLabel(){return this.bonusLevel?`BONUS ${this.bonusLevel}`:`${this.level}-${this.screen}`;}
  effectRandom(){this.effectSeed=(Math.imul(this.effectSeed,1664525)+1013904223)>>>0;return this.effectSeed/4294967296;}
  drainEvents(){return this.events.splice(0);}
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
      const [rope]=this.ropes.splice(c,1);
      if(this.powerUp?.type==='fire'){
        if(this.powerUp.topId===rope.id){this.powerUp=null;this.events.push({type:'fireReleased'});}
        else if(c<this.powerUp.bottomCol)this.powerUp.bottomCol--;
        else if(c===this.powerUp.bottomCol)this.powerUp.bottomCol=Math.min(c,this.ropes.length-1);
      }
      for(const k of this.knots) if(k.col>c) k.col--;
      freed++;
    }
    this.score+=freed*100; this.cleared+=freed; this.totalFreed+=freed;
    this.select(this.column); return freed;
  }
  win() {
    if(this.state!=='playing')return;
    this.state='won';
    this.powerUp=null;
    this.timeBonus=this.practice?0:Math.max(0,Math.round((LIMIT-this.bar)*20));
    this.stageBonus=!this.practice&&this.bonusLevel?1000*(this.bonusLevel+1):0;
    this.score+=this.timeBonus+this.stageBonus;
  }
  startPower(type,duration=12){
    if(this.state!=='playing'||this.powerUp||this.ropes.length<2||!['fire','paint'].includes(type))return false;
    duration=Math.max(1,Number(duration)||12);
    this.powerUp={type,duration,remaining:duration,queued:false};
    if(type==='fire'){
      const bottom=this.trace().bottom;
      this.powerUp.topId=this.ropes[Math.floor(this.effectRandom()*this.ropes.length)].id;
      // A route must be changed: never offer an already-connected free burn.
      const choices=bottom.map((id,col)=>col).filter(col=>bottom[col]!==this.powerUp.topId);
      this.powerUp.bottomCol=choices[Math.floor(this.effectRandom()*choices.length)];
    }
    this.events.push({type:'powerStart',power:type});return true;
  }
  repaint(){
    if(this.state!=='playing'||this.powerUp?.type!=='paint'||this.powerUp.queued)return false;
    this.powerUp.queued=true;this.events.push({type:'paintQueued'});return true;
  }
  fireConnected(){return this.powerUp?.type==='fire'&&this.trace().bottom[this.powerUp.bottomCol]===this.powerUp.topId;}
  burnRope(id){
    if(!this.ropes.some(r=>r.id===id))return 0;
    const {details}=this.trace(),lanes=this.ropes.map(r=>r.id).filter(r=>r!==id),kept=[];
    for(const knot of [...this.knots].sort((a,b)=>a.row-b.row||a.col-b.col)){
      const pair=details.get(knot.id);
      if(pair.left===id||pair.right===id)continue;
      const col=lanes.indexOf(pair.left);
      // Deleting one strand preserves the order and adjacency of all others.
      kept.push({...knot,col});[lanes[col],lanes[col+1]]=[lanes[col+1],lanes[col]];
    }
    this.knots=kept;this.ropes=this.ropes.filter(r=>r.id!==id);
    this.score+=100;this.cleared++;this.totalFreed++;
    const freed=1+this.release();if(!this.knots.length)this.win();return freed;
  }
  finishPower(){
    const p=this.powerUp;if(!p)return;
    const connected=this.fireConnected();this.powerUp=null;this.nextPowerAt=this.elapsed+24;
    if(p.type==='fire'){
      if(connected){const freed=this.burnRope(p.topId);this.events.push({type:'burn',freed});}
      else this.events.push({type:'fireMiss'});
    }else if(p.queued){
      // Repaint the whole scheme, not the selected pair or the knot geometry.
      for(const rope of this.ropes)rope.color=Math.floor(this.effectRandom()*this.colorCount);
      this.events.push({type:'repaint'});
    }else this.events.push({type:'paintSkipped'});
  }
  pressure(seconds){
    // The comb advances continuously and pushes each encountered knot downward.
    this.bar+=seconds*(0.055+Math.min(0.12,(this.level-1)*0.008)+Math.min(.08,this.bonusLevel*.003));
    const heights=Array(this.ropes.length).fill(this.bar);
    for(const k of [...this.knots].sort((a,b)=>a.row-b.row || a.col-b.col)) {
      k.row=Math.max(k.row,heights[k.col]+1,heights[k.col+1]+1);
      heights[k.col]=heights[k.col+1]=k.row;
    }
    if(this.knots.some(k=>k.row>=LIMIT)){this.state='lost';this.powerUp=null;}
  }
  tick(seconds) {
    if(this.state!=='playing'||!Number.isFinite(seconds)||seconds<=0||(this.practice&&!this.powerUp))return;
    let remaining=seconds;
    while(remaining>1e-9&&this.state==='playing'){
      if(this.powerUp){
        const dt=Math.min(remaining,this.powerUp.remaining);
        this.elapsed+=dt;remaining-=dt;this.powerUp.remaining-=dt;
        // The colored special-effect pass replaces the pressure pass temporarily.
        if(this.powerUp.remaining<=1e-9)this.finishPower();
      }else{
        if(this.practice)break;
        const until=this.nextPowerAt-this.elapsed;
        if(until<=1e-9){
          this.startPower(this.nextPowerType);
          this.nextPowerType=this.level>=3?(this.nextPowerType==='fire'?'paint':'fire'):'fire';
          this.nextPowerAt=this.elapsed+36;continue;
        }
        const dt=Math.min(remaining,until);this.elapsed+=dt;remaining-=dt;this.pressure(dt);
      }
    }
  }
  next() {
    if(this.state!=='won')return;
    if(this.bonusLevel)this.bonusLevel++;
    else if(this.screen<3)this.screen++;
    else if(this.level<9){this.level++;this.screen=1;}
    else{this.bonusLevel=1;this.screen=1;}
    this.newLevel();
  }
}
root.Fringer={Game,LIMIT,random};
if(typeof module!=='undefined') module.exports=root.Fringer;
})(typeof globalThis!=='undefined'?globalThis:this);
