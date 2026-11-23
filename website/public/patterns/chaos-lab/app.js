(() => {
  "use strict";
  const E=ChaosEngine,D=ChaosDrawing,$=id=>document.getElementById(id);
  const stage=$("stage"),graph=$("graph"),controls=$("controls"),fmt=new Intl.NumberFormat("en");
  const tabs=[...document.querySelectorAll("[data-mode]")],sessions=new Map();
  const initial={darts:1200,needles:140,chaos:4200,carpet:850,race:320};
  const headers={
    darts:["Dartboard","Throw uniformly across a square. How often does a dart land in its inscribed circle?"],
    needles:["Buffon’s needles","Drop needles across floorboards. Their crossings give a second way to measure π."],
    chaos:["Chaos game","Choose a peg at random, move partway toward it, and mark the landing point. Repeat."],
    carpet:["Fractal surveyor","Cut holes at smaller and smaller scales. Use random points to measure how much carpet survives."],
    race:["Race to π","Give three methods the same number of trials and follow their estimates side by side."]
  };
  const formats={number:n=>n===null?"—":n.toFixed(5),pct:n=>n===null?"—":(n*100).toFixed(2)+"%"};
  let mode="darts",sess=null,run=null,seed="6174",running=false,frame=0,lastTime=null,credit=0,lastDraw=0;
  let box=null,peg=0,drag=null,occupiedRender=false,metrics=[],statusText="";
  const seedField=$("seed"),runButton=$("run"),note=document.createElement("p");
  note.className="run-status";note.setAttribute("role","status");document.querySelector(".transport").after(note);
  function announce(message){if(statusText!==message){note.textContent=message;statusText=message;}}
  const button=(name,call)=>{
    const el=document.createElement("button");el.type="button";el.textContent=name;el.className="aux-button";el.addEventListener("click",call);return el;
  };
  // All user-provided seed text stays in the browser.
  const newSeed=button("New seed",()=>{
    const words=new Uint32Array(1);crypto.getRandomValues(words);
    seedField.value=String(words[0]);applySeed();
  });
  seedField.parentElement.classList.add("seed-setting");seedField.after(newSeed);seedField.maxLength=64;
  const batch=button("+1,000 trials",()=>{pause();E.advance(run,1000);paint();announce("Paused after adding 1,000 trials.");});
  batch.classList.add("batch");$("reset").after(batch);
  function range(label,id,min,max,step,value,show,handle,parent=controls){
    const wrap=document.createElement("div"),lab=document.createElement("label"),out=document.createElement("output"),input=document.createElement("input");
    wrap.className="range-control";lab.htmlFor=id;lab.textContent=label;input.id=id;input.type="range";
    Object.assign(input,{min:String(min),max:String(max),step:String(step),value:String(value)});
    out.htmlFor=id;out.textContent=show(value);input.addEventListener("input",()=>{out.textContent=show(+input.value);handle(+input.value);});
    wrap.append(lab,out,input);parent.append(wrap);return input;
  }
  function select(label,id,choices,value,handle,parent=controls){
    const wrap=document.createElement("div"),lab=document.createElement("label"),select=document.createElement("select");
    lab.htmlFor=id;lab.textContent=label;select.id=id;
    for(const [v,text] of choices){const opt=document.createElement("option");opt.value=v;opt.textContent=text;select.append(opt);}
    select.value=String(value);select.onchange=()=>handle(select.value);wrap.append(lab,select);parent.append(wrap);return select;
  }
  function setupControls(){
    controls.replaceChildren();
    const o=sess.opts;
    if(mode==="needles")range("Needle / board width","needle-length",.1,1,.05,o.length,v=>v.toFixed(2),v=>{o.length=v;changeRule();});
    if(mode==="carpet")range("Carpet depth","carpet-depth",0,6,1,o.depth,v=>String(v),v=>{o.depth=v;changeRule();});
    if(mode==="chaos"){
      select("Peg layout","peg-layout",[["triangle","Triangle · 3 pegs"],["square","Square · 4 pegs"],["pentagon","Pentagon · 5 pegs"]],o.shape,shape=>{
        o.shape=shape;o.pegs=E.preset(shape);peg=0;changeRule();setupControls();
      });
      range("Fraction toward peg","fraction",.1,.9,.05,o.fraction,v=>Math.round(v*100)+"%",v=>{o.fraction=v;changeRule();});
      const lab=document.createElement("label"),cb=document.createElement("input");
      lab.className="check-rule";cb.type="checkbox";cb.checked=o.forbidRepeat;
      cb.onchange=()=>{o.forbidRepeat=cb.checked;changeRule();};lab.append(cb," Forbid consecutive visits to the same peg");controls.append(lab);
      const jumpLabel=document.createElement("label"),jumpToggle=document.createElement("input");
      jumpLabel.className="check-rule";jumpToggle.type="checkbox";jumpToggle.checked=o.showJump!==false;
      jumpToggle.onchange=()=>{o.showJump=jumpToggle.checked;paint();};jumpLabel.append(jumpToggle," Show the most recent jump");controls.append(jumpLabel);
      const edits=document.createElement("details"),summary=document.createElement("summary"),inner=document.createElement("div");
      summary.textContent="Position the pegs";edits.append(summary,inner);controls.append(edits);
      select("Selected peg","which-peg",o.pegs.map((_,i)=>[String(i),"Peg "+(i+1)]),String(peg),v=>{peg=+v;updatePegControls();paint();},inner);
      ["x","y"].forEach((axis,j)=>range(axis==="x"?"Horizontal position":"Vertical position","peg-"+axis,0,100,.1,100*o.pegs[peg][j],v=>v.toFixed(1)+"%",v=>{o.pegs[peg][j]=v/100;changeRule();},inner));
      inner.append(button("Restore peg layout",()=>{o.pegs=E.preset(o.shape);changeRule();updatePegControls();}));
    }
  }
  function updatePegControls(){
    if(!document.getElementById("which-peg"))return;
    $("which-peg").value=peg;
    ["x","y"].forEach((axis,i)=>{const input=$("peg-"+axis),v=100*sess.opts.pegs[peg][i];input.value=v;input.parentElement.querySelector("output").textContent=v.toFixed(1)+"%";});
  }
  function fieldNotes(lines){
    $("facts").replaceChildren();
    for(const text of lines){const p=document.createElement("p");p.textContent=text;$("facts").append(p);}
  }
  function showGraphCaption(){
    const caption=$("graph-caption");
    caption.textContent=caption.dataset.legend+($("graph-window").value==="recent"?" Showing the latest half of trials on a linear scale.":" Horizontal spacing follows powers of ten.");
  }
  function describe(){
    const s=run.series[0],free=mode==="chaos"&&!s.square;
    let cap="",gc="",title="Estimate of π",labels=[],facts=[];
    if(mode==="darts"){
      labels=["Darts thrown","Inside circle","Estimate of π","Absolute error"];
      cap="Mint lands inside the circle. Coral lands outside. The ring marks the latest dart.";
      facts=["The circle has radius ½ inside a unit square. Its area is π/4, so four times the fraction inside estimates π.","Try ten steps after a reset, then add 1,000. More trials usually tighten the estimate, but an individual run can wander away again."];
    }else if(mode==="needles"){
      labels=["Needles dropped","Crossings","Estimate of π","Absolute error"];
      cap="Gold needles cross a seam. Coral needles fall on a single board.";
      facts=["The crossing probability is 2L/(πD), where L is needle length and D is board width. The estimate is 2(L/D) × drops ÷ crossings.","Shorter needles cross fewer seams. A zero-crossing run needs more drops before it can report an estimate. Orientations come from a random direction in a disk."];
    }else if(mode==="chaos"){
      labels=s.square?["Counted jumps","Inside circle","Estimate of π","Absolute error"]:["Counted jumps","Pegs","Grid cells visited","Grid coverage"];
      cap="Color records the chosen peg. Drag a numbered peg, or open Position the pegs to edit its coordinates.";
      if(free){
        title="Grid coverage";
        facts=["Each mark starts from the previous one. Three equally likely pegs at a 50% jump trace the Sierpiński triangle. The first 32 jumps settle the orbit and are excluded.","For the crossover to π, restore the square layout, use 50% jumps, and allow repeated pegs. Other rules are tracked on a 64 × 64 grid."];
        gc="Fraction of the 4,096 grid cells ever visited.";
      }else{
        facts=["With a 50% jump, each corner maps the square into a different quarter. Repeated uniform corner choices fill the square, so 4 × inside ÷ jumps estimates π.","Neighboring points share part of their history. These samples are correlated. The first 32 jumps are excluded."];
      }
    }else if(mode==="carpet"){
      labels=["Survey points","Retained hits","Estimated area","Exact area"];title="Retained area";
      cap="Sea green is retained carpet. Mint points land on it, and coral points land in the holes.";
      facts=["Split every retained square into nine equal squares and remove its center. After d rounds the exact area fraction is (8/9)ᵈ.","The survey picks points across the entire original square. At the deepest settings, some holes are smaller than a screen pixel. The test still checks every level."];
      gc="The dashed line is the exact retained fraction for this depth.";
    }else{
      labels=["Trials per method","Dartboard π","Square walk π","Needles π"];title="Three estimates of π";
      cap="Each method receives one counted trial per round. Only the square walk uses the previous result to choose its next point.";
      facts=["Darts sample independent coordinates. The square walk jumps halfway toward a random corner. Needles use crossing counts with the needle length equal to the board spacing.","All three use separate reproducible streams. Equal trial counts compare progress per observation. The nearest estimate can change on the next round."];
      gc="Solid teal: darts. Dashed ochre: square walk. Dotted rust: needles. The horizontal line marks π.";
    }
    if(!gc)gc="The dashed line marks π.";
    const shown=mode==="race"?"":s.method==="needles"?" Showing up to the latest 180 drops.":s.method==="chaos"?" Showing up to the latest 10,000 marks.":" Showing up to the latest 4,800 points.";
    $("stage-caption").textContent=cap+shown;$("graph-caption").dataset.legend=gc;showGraphCaption();
    $("graph-title").textContent=title;fieldNotes(facts);
    if(mode==="needles"){
      const source=document.createElement("a");source.href="https://mathworld.wolfram.com/BuffonsNeedleProblem.html";source.textContent="Crossing probability derivation · MathWorld";
      const p=document.createElement("p");p.append(source);$("facts").append(p);
    }
    $("stats").replaceChildren();metrics=labels.map(name=>{
      const div=document.createElement("div"),span=document.createElement("span"),strong=document.createElement("strong");
      div.className="metric";span.textContent=name;div.append(span,strong);$("stats").append(div);return strong;
    });
  }
  function paint(){
    if(!run)return;const s=run.series[0],v=E.estimate(s);
    box=D.stage(stage,run,peg);D.graph(graph,run,$("graph-window").value==="recent");
    let stats;
    if(mode==="race")stats=[fmt.format(s.n),...run.series.map(x=>formats.number(E.estimate(x)))];
    else if(mode==="chaos"&&!s.square)stats=[fmt.format(s.n),s.opts.pegs.length,fmt.format(s.occupied),formats.pct(v)];
    else if(mode==="carpet")stats=[fmt.format(s.n),fmt.format(s.hits),formats.pct(v),formats.pct((8/9)**s.opts.depth)];
    else stats=[fmt.format(s.n),fmt.format(s.hits),formats.number(v),formats.number(v===null?null:Math.abs(v-Math.PI))];
    stats.forEach((v,i)=>{if(metrics[i].textContent!==String(v))metrics[i].textContent=v;});
  }
  function makeRun(count=0){
    run=sess.run=E.make(mode,seed,sess.opts);
    if(count)E.advance(run,count);
  }
  function changeRule(){
    const n=Math.min(run.series[0].n,initial[mode]);
    makeRun(n);describe();paint();
    announce((running?"Running":"Paused")+" · fresh samples for this setup.");
  }
  function tick(t){
    if(!running)return;
    if(lastTime!==null){
      credit+=Math.min(150,t-lastTime)*Number($("speed").value)/1000;
      const count=Math.floor(credit);credit-=count;if(count)E.advance(run,count);
    }
    lastTime=t;if(t-lastDraw>=55){paint();lastDraw=t;}
    frame=requestAnimationFrame(tick);
  }
  function pause(){
    if(running){running=false;cancelAnimationFrame(frame);lastTime=null;credit=0;runButton.textContent="Run";runButton.setAttribute("aria-pressed","false");paint();}
  }
  function start(){if(running)return;running=true;lastTime=null;credit=0;runButton.textContent="Pause";runButton.setAttribute("aria-pressed","true");announce("Running");frame=requestAnimationFrame(tick);}
  function applySeed(){
    const next=seedField.value.trim()||"6174";seedField.value=next;if(next===seed)return;
    pause();seed=next;sessions.clear();switchMode(mode,false,true);announce("New seed · ready at zero trials.");
  }
  function switchMode(name,updateHash=true,empty=false){
    pause();if(!E.modes.includes(name))name="darts";
    if(drag&&stage.hasPointerCapture(drag.id))stage.releasePointerCapture(drag.id);drag=null;
    mode=name;peg=0;sess=sessions.get(mode);let fresh=false;
    if(!sess||sess.seed!==seed){fresh=true;sess={opts:E.options(),seed,run:null};sessions.set(mode,sess);makeRun(empty?0:initial[mode]);}
    else run=sess.run;
    tabs.forEach(t=>t.setAttribute("aria-pressed",String(t.dataset.mode===mode)));
    stage.classList.toggle("editable",mode==="chaos");stage.style.cursor="";
    $("mode-title").textContent=headers[mode][0];$("mode-description").textContent=headers[mode][1];
    setupControls();describe();paint();announce(fresh&&run.series[0].n?"Paused · seeded sample. Reset to start at zero.":"Paused");
    if(updateHash&&location.hash!=="#"+mode)history.replaceState(null,"","#"+mode);
  }
  function point(e){
    const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};
  }
  function nearest(p,r){
    if(mode!=="chaos"||!box)return -1;
    let best=-1,distance=r;
    sess.opts.pegs.forEach(([x,y],i)=>{
      const d=Math.hypot(p.x-box.x-x*box.size,p.y-box.y-y*box.size);
      if(d<distance||(d===distance&&i===peg)){best=i;distance=d;}
    });
    return best;
  }
  stage.addEventListener("pointerdown",e=>{
    if(e.button!==0||drag)return;
    const p=point(e),i=nearest(p,e.pointerType==="touch"?25:15);if(i<0)return;
    drag={id:e.pointerId,wasRunning:running,x:p.x,y:p.y,origin:[...sess.opts.pegs[i]]};
    pause();peg=i;stage.setPointerCapture(e.pointerId);stage.style.cursor="grabbing";updatePegControls();paint();
  });
  stage.addEventListener("pointermove",e=>{
    const p=point(e);
    if(!drag){stage.style.cursor=nearest(p,16)>=0?"grab":"";return;}
    if(drag.id!==e.pointerId||!box)return;
    const bounded=v=>Math.max(0,Math.min(1,v));
    const x=bounded(drag.origin[0]+(p.x-drag.x)/box.size),y=bounded(drag.origin[1]+(p.y-drag.y)/box.size);
    if(x===sess.opts.pegs[peg][0]&&y===sess.opts.pegs[peg][1])return;
    sess.opts.pegs[peg]=[x,y];updatePegControls();changeRule();
  });
  function endDrag(e){if(drag&&drag.id===e.pointerId){const resume=drag.wasRunning;drag=null;stage.style.cursor="";if(resume)start();}}
  for(const name of ["pointerup","pointercancel","lostpointercapture"])stage.addEventListener(name,endDrag);
  tabs.forEach(b=>b.onclick=()=>{if(b.dataset.mode!==mode)switchMode(b.dataset.mode);});
  runButton.onclick=()=>{if(running){pause();announce("Paused");}else start();};
  $("step").onclick=()=>{pause();E.advance(run,1);paint();announce("Paused after one trial.");};
  $("reset").onclick=()=>{pause();makeRun();paint();announce("Reset · ready at zero trials.");};
  $("graph-window").onchange=()=>{showGraphCaption();paint();};
  seedField.addEventListener("change",applySeed);seedField.addEventListener("keydown",e=>{if(e.key==="Enter")seedField.blur();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&running){pause();announce("Paused while this tab is hidden.");}});
  window.addEventListener("hashchange",()=>{switchMode(location.hash.slice(1),false);});
  switchMode(location.hash.slice(1),false);
  const resize=new ResizeObserver(()=>{if(!occupiedRender){occupiedRender=true;requestAnimationFrame(()=>{occupiedRender=false;paint();});}});
  resize.observe(stage.parentElement);resize.observe(graph.parentElement);
})();
