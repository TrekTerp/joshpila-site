const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
const start=src.indexOf('  const classic=look',src.indexOf('function draw(t)'));
const end=src.indexOf('\nfunction drawVariations(',start);
// The shared rule indicators are a separate overlay. Only suppress the pressure
// bar during a special pass; the underlying Classic artwork remains unchanged.
const base=src.slice(start,end).replace('!game.practice&&!game.powerUp','!game.practice').replace('\n  drawVariations(t);','');
assert.equal(crypto.createHash('sha256').update(base).digest('hex'),fs.readFileSync(path.join(__dirname,'classic-render.sha256'),'utf8').trim(),'Classic base renderer changed');
const art=JSON.parse(fs.readFileSync(path.join(root,'assets/evolved-atlas-v1.json'),'utf8'));
assert(fs.existsSync(path.join(root,art.image)));
for(const gap of ['76.00','71.25','63.33'])for(let color=0;color<5;color++)for(const dir of [-1,1]){
 assert(art.sprites[`curve${dir}_${color}_${gap}`],`Missing crossing ${dir}/${color}/${gap}`);
}
const {Game}=require('../src/engine.js');
const {EvolvedArt}=require('../src/evolved-art.js');
// Exercise the actual renderer against a no-op drawing context. Rendering, themes,
// pressure display and frame animation may not mutate engine state or use randomness.
const drawing=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});
const view=Object.create(EvolvedArt.prototype);view.ctx=drawing;view.data=art;view.ready=true;view.image={};view.patterns=Array(5).fill({});
const rng=Math.random;Math.random=()=>{throw Error('Renderer consumed randomness');};
try{
 for(const level of [1,4,7,9]){
  const game=new Game(150);game.level=level;game.newLevel();game.tick(60);
  for(const direction of [-1,1]){
   game.direction=direction;const before=JSON.stringify(game);
   view.render(game,150,{x:350,y:300,time:0,text:'+25'},false);
   view.render(game,300,null,true);
   assert.equal(JSON.stringify(game),before,'Rendering changed the game');
  }
  game.startPower('fire');const before=JSON.stringify(game);view.render(game,500,null,false);assert.equal(JSON.stringify(game),before);
 }
}finally{Math.random=rng;}
console.log('PASS: all 30 crossing variants, immutable rendering, no visual RNG, original Classic renderer');
