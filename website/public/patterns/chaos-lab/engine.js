/* Coordinates in the model are fractions of the unit square. */
(() => {
  "use strict";
  const modes = ["darts", "needles", "chaos", "carpet", "race"];
  const names = { darts: "Dartboard", needles: "Buffon’s needles", chaos: "Chaos game", carpet: "Fractal surveyor", race: "Race to π" };
  const colors = { darts: "#6be2c7", chaos: "#ffd37b", needles: "#ff987f" };
  const raceMethods = ["darts", "chaos", "needles"];
  const square = [[0,0], [1,0], [1,1], [0,1]];
  const triangle = [[.5,.047], [.985,.887], [.015,.887]];
  function preset(name) {
    if (name === "pentagon") return Array.from({length:5}, (_,i) => [.5+.485*Math.sin(i*2*Math.PI/5),.5-.485*Math.cos(i*2*Math.PI/5)]);
    return (name === "square" ? square : triangle).map(p => [...p]);
  }
  function options() {
    return { shape: "triangle", pegs: preset("triangle"), fraction: .5, forbidRepeat: false, depth: 3, length: 1 };
  }
  // FNV-1a hashes the editable seed and stream name; Mulberry32 supplies the samples.
  function randomStream(key) {
    let state=2166136261;
    for(const c of String(key)) state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
    return () => {
      state = (state+0x6d2b79f5)>>>0;
      let z = Math.imul(state^(state>>>15),state|1);
      z ^= z+Math.imul(z^(z>>>7),z|61);
      return ((z^(z>>>14))>>>0)/4294967296;
    };
  }
  function inCarpet(x,y,depth) {
    for(let i=0;i<depth;i++){
      x*=3; y*=3;
      const col=Math.floor(x),row=Math.floor(y);
      if(col===1 && row===1)return false;
      x-=col; y-=row;
    }
    return true;
  }
  function squareRule(o) {
    if(o.pegs.length!==4 || o.fraction!==.5 || o.forbidRepeat)return false;
    return square.every(([x,y])=>o.pegs.some(p=>p[0]===x && p[1]===y));
  }
  function insideDisk(x,y) { return (x-.5)**2+(y-.5)**2<=.25; }
  // Rejection from the unit disk supplies an isotropic direction without using π as an input.
  function direction(rng) {
    let x,y,q;
    do{x=2*rng()-1;y=2*rng()-1;q=x*x+y*y;}while(q>1||q===0);
    const inv=1/Math.sqrt(q);
    return [x*inv,y*inv];
  }
  function jump(s) {
    const k=s.opts.pegs.length,exclude=s.opts.forbidRepeat&&s.lastPeg>=0;
    let j=Math.floor(s.rng()*(exclude?k-1:k));
    if(exclude&&j>=s.lastPeg)j++;
    s.lastPeg=j;s.prevX=s.x;s.prevY=s.y;
    const [px,py]=s.opts.pegs[j];
    s.x+=(px-s.x)*s.opts.fraction;
    s.y+=(py-s.y)*s.opts.fraction;
    return j;
  }
  function makeSeries(method,seed,opts) {
    const limit=method==="needles"?180:method==="chaos"?10000:4800;
    const s={method,opts,rng:randomStream(String(seed)+"|"+method),n:0,hits:0,occupied:0,grid:new Uint8Array(4096),x:.5,y:.5,lastPeg:-1,
      square:method==="chaos"&&squareRule(opts),limit,marks:new Float32Array(limit*5),history:[]};
    if(method==="chaos")for(let i=0;i<32;i++)jump(s);
    return s;
  }
  function make(mode,seed,opts) {
    const series=mode==="race"?raceMethods.map(m=>makeSeries(m,seed,{...options(),shape:"square",pegs:preset("square")})):[makeSeries(mode,seed,opts)];
    return {mode,seed,opts,series};
  }
  function estimate(s){
    if(!s.n)return null;
    if(s.method==="needles")return s.hits?2*s.opts.length*s.n/s.hits:null;
    if(s.method==="carpet")return s.hits/s.n;
    if(s.method==="chaos"&&!s.square)return s.occupied/4096;
    return 4*s.hits/s.n;
  }
  function trial(s) {
    const rand=s.rng,m=s.method,k=(s.n%s.limit)*5;
    let x,y,dx=0,dy=0,tag;
    if(m==="needles"){
      x=rand(); y=rand();
      const unit=direction(rand);
      // Six horizontal floorboards; endpoints may extend past the cropped window.
      dx=unit[0]*s.opts.length/12; dy=unit[1]*s.opts.length/12;
      tag=Math.floor((y-dy)*6)!==Math.floor((y+dy)*6)?1:0;
      s.hits+=tag;
    }else if(m==="chaos"){
      tag=jump(s);x=s.x;y=s.y;
      if(insideDisk(x,y))s.hits++;
      const col=Math.min(63,Math.floor(64*x)),row=Math.min(63,Math.floor(64*y)),cell=64*row+col;
      if(s.grid[cell]===0){s.grid[cell]=1;s.occupied++;}
    }else{
      x=rand();y=rand();
      tag=(m==="carpet"?inCarpet(x,y,s.opts.depth):insideDisk(x,y))?1:0;
      s.hits+=tag;
    }
    s.marks[k]=x;s.marks[k+1]=y;s.marks[k+2]=dx;s.marks[k+3]=dy;s.marks[k+4]=tag;
    s.n++;
    // Keep the complete time span with a bounded number of points per doubling of N.
    const stride=2**Math.max(0,Math.floor(Math.log2(s.n))-4);
    if(s.n%stride===0)s.history.push([s.n,estimate(s)]);
  }
  function advance(run,n){
    for(const s of run.series)for(let j=0;j<n;j++)trial(s);
  }
  globalThis.ChaosEngine={modes,names,colors,raceMethods,options,preset,make,advance,estimate,inCarpet,squareRule,insideDisk};
})();
