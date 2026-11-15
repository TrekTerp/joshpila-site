const assert=require('node:assert/strict');
const {RopeGeometry,RopePainter}=require('../src/rope-renderer.js');
const {Game}=require('../src/engine.js');
for(const gap of [76,71.25,570/9]){
 const g=RopeGeometry.create(gap);
 for(const [s,x,y] of [[0,0,0],[g.length,gap,34.65]]){
  const p=g.at(s);assert(Math.abs(p.x-x)<1e-8&&Math.abs(p.y-y)<1e-8);assert(Math.abs(p.a)<1e-8);
 }
 // Independent perpendicular transects recover width and arclength on the bends.
 for(let i=1;i<100;i++){
  const s=g.length*i/100,p=g.at(s);
  for(const n of [-7.5,0,7.5]){
   const q=g.nearest(p.x+n*Math.cos(p.a),p.y-n*Math.sin(p.a));
   assert(Math.abs(q.distance-Math.abs(n))<1e-7);assert(Math.abs(q.s-s)<1e-7);
  }
 }
 assert(g.length>34.65);
}
let draws=0;
function context(){return new Proxy({
 createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
 getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4).fill(180)}),
 drawImage:()=>draws++
},{get:(o,k)=>k in o?o[k]:(()=>{})});}
const previous=global.document;
global.document={createElement:()=>({width:0,height:0,getContext:()=>context()})};
try{
 const painter=new RopePainter({width:600,height:152}),ctx=context();
 const originalRandom=Math.random;Math.random=()=>{throw Error('Visual RNG used');};
 try{
  for(const level of [1,4,7,9,12]){
   const game=new Game(150);game.level=level;game.newLevel();
   const before=JSON.stringify(game);painter.draw(ctx,game);
   assert.equal(JSON.stringify(game),before);
   const builds=painter.builds;painter.draw(ctx,game);assert.equal(painter.builds,builds);
   game.direction*=-1;game.column=(game.column+1)%Math.max(1,game.ropes.length-1);
   painter.draw(ctx,game);assert.equal(painter.builds,builds,'Cursor change rebuilt rope layer');
   game.ropes[0].color=(game.ropes[0].color+1)%5;painter.draw(ctx,game);
   assert.equal(painter.builds,builds+1,'Repaint failed to invalidate rope layer');
  }
 }finally{Math.random=originalRandom;}
 // Consecutive crossings of the same ropes must carry their accumulated phase.
 const game={ropes:[{id:0,color:0},{id:1,color:0}],knots:[{row:1,col:0,dir:1},{row:2,col:0,dir:-1}]};
 painter.key=null;painter.draw(ctx,game);
 const g=RopeGeometry.create(76),expected=(70+2*39.375+g.height/2-64)+2*(g.length-g.height);
 for(const distance of painter.distances.values())assert(Math.abs(distance-expected)<1e-8);
 assert(draws>0);assert(painter.tiles.size<=128);
}finally{global.document=previous;}
console.log('PASS: controlled geometry at all3 gaps, immutable render, cache invalidation, successive same-color crossings and continuous phase');
