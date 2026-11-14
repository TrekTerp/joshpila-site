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
    const g=new Game(seed);g.level=level;g.newLevel();
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
console.log(`${checks} checks passed.`);
