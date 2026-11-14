const assert=require('node:assert/strict');
const {Game,LIMIT}=require('../src/engine.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name);}
function fixture(knots,colors=[0,1,2,3]){
  const g=new Game(123);g.ropes=colors.map((color,id)=>({id,color}));
  g.knots=knots.map((k,i)=>({id:i,spark:false,original:true,...k}));
  g.state='playing';g.direction=1;g.column=0;g.score=0;g.nextId=100;g.bar=-1;g.bonuses=2;return g;
}
test('3,000 generated boards reverse to a complete solution',()=>{
  for(let seed=1;seed<=100;seed++)for(let level=1;level<=30;level++){
    const g=new Game(seed);g.level=Math.min(9,Math.ceil(level/3));g.screen=level>27?1:(level-1)%3+1;g.bonusLevel=Math.max(0,level-27);g.newLevel();
    assert.equal(g.cleared,0,`No free starting ropes: seed=${seed} level=${level}`);
    let safety=100;
    while(g.knots.length&&safety--){
      const knot=g.knots.reduce((a,b)=>a.id>b.id?a:b);
      g.select(knot.col);
      assert.equal(g.target().kind,'remove',`seed=${seed} level=${level} knot=${knot.id}`);
      g.twist();
    }
    assert.equal(g.state,'won');assert.equal(g.ropes.length,0);
  }
});
test('different-color knots require the matching over-strand angle',()=>{
  const g=fixture([{col:0,row:3,dir:-1}],[0,1]);
  assert.equal(g.target().kind,'add');g.flip();assert.equal(g.target().kind,'remove');
});
test('same-color knots accept either angle',()=>{
  const g=fixture([{col:0,row:3,dir:-1}],[0,0]);assert.equal(g.target().kind,'remove');
});
test('a lower neighboring knot blocks access',()=>{
  const g=fixture([{col:0,row:3,dir:1},{col:1,row:5,dir:1}]);
  assert.equal(g.target().kind,'add');assert.equal(g.target().row,6);
});
test('created twists can be undone but never generate points',()=>{
  const g=fixture([{col:0,row:3,dir:-1}],[0,1]);
  for(let i=0;i<100;i++){assert.equal(g.twist().type,'twist');assert.equal(g.twist().type,'untie');}
  assert.equal(g.score,0);assert.equal(g.knots.length,1);assert.equal(g.direction,1);
});
test('freed lanes collapse without changing surviving rope identities',()=>{
  const g=fixture([{col:0,row:3,dir:1},{col:2,row:4,dir:1}]);g.twist();
  assert.deepEqual(g.ropes.map(r=>r.id),[2,3]);assert.equal(g.knots[0].col,0);
  assert.deepEqual(g.trace().details.get(1),{left:2,right:3});assert.equal(g.score,225);
});
test('sparkles award a bonus exactly once',()=>{
  const g=fixture([{col:0,row:3,dir:1,spark:true},{col:2,row:4,dir:1}]);
  g.twist();assert.equal(g.bonuses,3);g.flip();assert.equal(g.bonuses,2);
});
test('empty bonus supply cannot rotate the frame',()=>{
  const g=new Game(123);g.bonuses=0;const dir=g.direction;
  assert.equal(g.flip(),false);assert.equal(g.direction,dir);g.practice=true;assert.equal(g.flip(),true);
});
test('pressure catches and pushes knots, preserving ordering',()=>{
  const g=fixture([{col:0,row:3,dir:1},{col:1,row:5,dir:-1}]);
  g.bar=3;g.tick(1);assert(g.knots[0].row>=g.bar+1);assert(g.knots[1].row>=g.knots[0].row+1);
  g.tick(1000);assert.equal(g.state,'lost');
});
test('a twist below the bottom loses immediately',()=>{
  const g=fixture([{col:0,row:LIMIT-.5,dir:-1}],[0,1]);g.twist();assert.equal(g.state,'lost');
});
test('practice has no pressure, finished games ignore input',()=>{
  const g=new Game(1,true), snapshot=JSON.stringify(g);g.tick(10000);assert.equal(JSON.stringify(g),snapshot);
  g.state='lost';const after=JSON.stringify(g);g.twist();g.flip();g.move(1);g.tick(99);assert.equal(JSON.stringify(g),after);
});
test('seed and level reproduce the same board',()=>{
  const a=new Game(123),b=new Game(123);assert.deepEqual(a,b);
  a.direction*=-1;assert.deepEqual(a.knots,b.knots);
});
test('nine three-screen levels lead to continuing single-screen bonuses',()=>{
  const g=new Game(123);const labels=[];
  for(let i=0;i<35;i++){
    labels.push(g.stageLabel);g.state='won';g.next();
  }
  assert.equal(labels[0],'1-1');assert.equal(labels[2],'1-3');assert.equal(labels[3],'2-1');
  assert.equal(labels[26],'9-3');assert.equal(labels[27],'BONUS 1');assert.equal(labels[34],'BONUS 8');
  assert.equal(g.stageLabel,'BONUS 9');assert.equal(g.level,9);assert.equal(g.screen,1);
});
test('bonus completion awards follow the original table and pay only once',()=>{
  const g=new Game(1);g.level=9;g.bonusLevel=3;g.newLevel();const before=g.score;
  g.win();assert.equal(g.stageBonus,4000);assert.equal(g.score-before,g.timeBonus+4000);
  const score=g.score;g.win();assert.equal(g.score,score);g.next();assert.equal(g.bonusLevel,4);
  g.practice=true;g.win();assert.equal(g.stageBonus,0);assert.equal(g.timeBonus,0);
});
test('fire resolves at pass end, never merely when a route becomes connected',()=>{
  const g=fixture([{col:0,row:3,dir:1},{col:0,row:6,dir:-1}],[0,1]);
  g.startPower('fire',10);g.powerUp.topId=0;g.powerUp.bottomCol=1;g.direction=-1;
  assert.equal(g.fireConnected(),false);g.twist();assert.equal(g.fireConnected(),true);
  const bar=g.bar;g.tick(9.9);assert.equal(g.ropes.length,2);assert.equal(g.bar,bar);
  g.tick(.1);assert.equal(g.state,'won');assert.equal(g.ropes.length,0);assert.equal(g.powerUp,null);
  assert.equal(g.drainEvents().filter(e=>e.type==='burn').length,1);
});
test('missing the candle route preserves the entire braid',()=>{
  const g=new Game(15);g.startPower('fire',1);const before=JSON.stringify(g.knots),ropes=JSON.stringify(g.ropes);
  assert.equal(g.fireConnected(),false);g.tick(1);
  assert.equal(JSON.stringify(g.knots),before);assert.equal(JSON.stringify(g.ropes),ropes);
  assert.equal(g.powerUp,null);assert(g.drainEvents().some(e=>e.type==='fireMiss'));
});
test('500 burns preserve every surviving crossing identity and final permutation',()=>{
  for(let seed=1;seed<=50;seed++)for(let id=0;id<10;id++){
    const g=new Game(seed,false,9),trace=g.trace(),before=g.knots.map(k=>({...k})),bonuses=g.bonuses;
    g.burnRope(id);const after=g.trace(),alive=new Set(g.ropes.map(r=>r.id));
    assert.deepEqual(after.bottom,trace.bottom.filter(r=>alive.has(r)));
    for(const k of g.knots){assert.deepEqual(after.details.get(k.id),trace.details.get(k.id));assert(k.col>=0&&k.col<g.ropes.length-1);assert.equal(k.row,before.find(b=>b.id===k.id).row);}
    for(const k of before){const pair=trace.details.get(k.id);if(pair.left===id||pair.right===id)assert(!g.knots.some(a=>a.id===k.id));}
    assert.equal(g.bonuses,bonuses,'Burning sparkle knots must not mint turn bonuses');
    assert.equal(g.cleared,g.startRopes-g.ropes.length);
  }
});
test('fire markers survive unrelated lane removal and cancel if their source is freed',()=>{
  const g=fixture([{col:0,row:3,dir:1},{col:2,row:3,dir:1},{col:2,row:5,dir:-1}]);
  g.startPower('fire');g.powerUp.topId=2;g.powerUp.bottomCol=3;g.select(0);g.twist();
  assert.equal(g.powerUp.topId,2);assert.equal(g.powerUp.bottomCol,1);
  g.select(0);g.direction=-1;g.twist();g.direction=1;g.twist();assert.equal(g.powerUp,null);
});
test('repaint is optional, queued once, delayed, deterministic, and changes no topology',()=>{
  const a=new Game(543,false,3),b=new Game(543,false,3);
  for(const g of [a,b]){g.startPower('paint',2);assert(g.repaint());assert.equal(g.repaint(),false);}
  const knots=JSON.stringify(a.knots),colors=a.ropes.map(r=>r.color),score=a.score,bonuses=a.bonuses;
  a.tick(1);assert.deepEqual(a.ropes.map(r=>r.color),colors);a.tick(1);b.tick(2);
  assert.deepEqual(a.ropes,b.ropes);assert.notDeepEqual(a.ropes.map(r=>r.color),colors);
  assert.equal(JSON.stringify(a.knots),knots);assert.equal(a.score,score);assert.equal(a.bonuses,bonuses);
  assert(a.ropes.every(r=>r.color>=0&&r.color<a.colorCount));
  const c=new Game(543,false,3),before=JSON.stringify(c.ropes);c.startPower('paint',1);c.tick(1);assert.equal(JSON.stringify(c.ropes),before);
});
test('special scheduling respects stage, elapsed time, restart, and terminal input',()=>{
  const early=new Game(1);early.tick(15);assert.equal(early.powerUp,null);
  const g=new Game(1,false,3);g.tick(14.1);assert.equal(g.powerUp.type,'paint');
  g.repaint();g.tick(12);assert.equal(g.powerUp,null);g.tick(24);assert.equal(g.powerUp.type,'fire');
  g.state='lost';const before=JSON.stringify(g);g.tick(100);g.repaint();g.startPower('paint');assert.equal(JSON.stringify(g),before);
  g.newLevel();assert.equal(g.powerUp,null);assert.equal(g.elapsed,0);assert.equal(g.events.length,0);
});
test('special timing is independent of frame size and pauses when no time advances',()=>{
  const a=new Game(98,false,3),b=new Game(98,false,3);a.tick(55);for(let i=0;i<550;i++)b.tick(.1);
  assert.equal(a.state,b.state);assert.equal(a.powerUp.type,b.powerUp.type);assert(Math.abs(a.powerUp.remaining-b.powerUp.remaining)<1e-7);
  assert.equal(a.effectSeed,b.effectSeed);assert.deepEqual(a.ropes,b.ropes);assert.deepEqual(a.drainEvents(),b.drainEvents());
  const before=JSON.stringify(a);a.tick(0);assert.equal(JSON.stringify(a),before);
});
console.log(`${checks} checks passed.`);
