"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const {alphabet, index, mod, transform, counts, power} = CipherMath;
  const modes = {
    caesar:["Caesar wheel","Turn the inner alphabet. Every letter moves the same distance, so repeated letters still leave a trail.","Alphabet dial","Drag the wheel to set the shift, or use the slider.","The two profiles have the same shape, shifted around the alphabet."],
    vigenere:["Vigenère square","Repeat a word beneath the message. Its letters determine how far each letter shifts.","Vigenère square · detail","The highlighted key row and plaintext column meet at the ciphertext letter.","Different key positions can send the same input letter to different outputs."],
    rail:["Rail fence","Lay the letters out in a zigzag, then read across each rail. Follow one letter to its new address.","Rail diagram","The highlighted letter keeps its identity as its position changes.","Each letter keeps its count, even when its position changes."],
    exchange:["Diffie–Hellman key exchange","Alice and Bob start with private numbers. Follow the two public values across the channel and see what each person can compute.","Key exchange diagram","A small worked example using arithmetic modulo 23.",""]
  };
  const s={mode:"caesar",shift:3,rails:3,key:"LEMON",decode:false,i:0,alice:6,bob:15,phase:0};
  const svg=$("instrument");
  const set=(id,value)=>{$(id).textContent=value};
  const show=(id,visible)=>{$(id).hidden=!visible};
  function element(tag,value){const el=document.createElement(tag);if(value!==undefined)el.textContent=value;return el}
  function optionButton(button,on){button.setAttribute("aria-pressed",String(on))}
  let data;
  function currentData(){return transform($("message").value,s.mode,s)}
  function description(step){
    if(!data) return "Enter at least one A–Z letter in the key.";
    if(!step) return "Type an A–Z letter to follow its path.";
    const a=step.input.toUpperCase(), b=step.output.toUpperCase();
    if(s.mode==="rail") return a+" travels on rail "+(step.rail+1)+", from position "+(step.source+1)+" to "+(step.target+1)+".";
    const by=s.decode?"back":"forward";
    const prefix=s.mode==="vigenere"?"Key "+alphabet[step.shift]+" moves ":"Move ";
    return prefix+a+" "+by+" "+step.shift+" "+(step.shift===1?"place":"places")+" to "+b+".";
  }
  function instrument(step,desc){
    svg.replaceChildren();
    svg.classList.toggle("dial",s.mode==="caesar");
    svg.setAttribute("aria-label",modes[s.mode][2]+". "+desc);
    window.CipherInstruments[s.mode](svg,s,step,data);
  }
  function drawTrace(){
    const steps=data?.steps||[];
    s.i=Math.min(Math.max(0,s.i),Math.max(0,steps.length-1));
    const step=steps[s.i],caption=description(step);
    instrument(step,caption);set("trace-caption",caption);
    set("step-count",steps.length?(s.i+1)+"/"+steps.length:"0/0");
    $("prev").disabled=!steps.length||s.i===0;
    $("next").disabled=!steps.length||s.i>=steps.length-1;
    const tape=$("tape"), hadFocus=tape.contains(document.activeElement);
    const start=Math.max(0,Math.min(steps.length-21,s.i-10));
    tape.replaceChildren();
    for(const one of steps.slice(start,start+21)){
      const item=element("button",one.input);
      item.type="button";item.dataset.i=one.source;
      item.setAttribute("aria-label","Input position "+(one.source+1)+", "+one.input+" to "+one.output+", output position "+(one.target+1));
      optionButton(item,one.source===s.i);
      if(s.mode==="vigenere"){const key=element("small",alphabet[one.shift]);key.className="key-letter";item.append(key)}
      item.append(element("small",s.mode==="rail"?"#"+(one.target+1):one.output));
      tape.append(item);
    }
    const selected=tape.querySelector('[aria-pressed="true"]');
    if(selected){
      if(hadFocus)selected.focus({preventScroll:true});
      const delta=selected.getBoundingClientRect().left-tape.getBoundingClientRect().left;
      if(delta<0||delta+selected.offsetWidth>tape.clientWidth)tape.scrollLeft+=delta-tape.clientWidth/2+selected.offsetWidth/2;
    }
    set("trace-legend",s.mode==="rail"?"Input letter / output position":s.mode==="vigenere"?"Input / key / output":"Input / output");
    show("trace-legend",!!steps.length);
  }
  function frequency(){
    const input=counts(data?.letters||[]),output=counts(data?.result||[]),max=Math.max(1,...input,...output);
    const chart=$("chart");chart.replaceChildren();chart.setAttribute("aria-hidden","true");
    const table=element("table");table.setAttribute("aria-label","Exact letter counts for the input and output");
    const rows=["Letter","Input","Output"].map(name=>{const tr=element("tr");tr.append(element("th",name));table.append(tr);return tr});
    [...alphabet].forEach((a,i)=>{
      const bin=element("div");bin.className="bin";bin.title=a+" · Input "+input[i]+" · Output "+output[i];
      const bars=element("div");bars.className="bars";
      for(const n of [input[i],output[i]]){const bar=element("i");bar.style.height=(100*n/max)+"%";bars.append(bar)}
      bin.append(bars,element("b",a));chart.append(bin);
      [a,input[i],output[i]].forEach((v,r)=>rows[r].append(element(r===0?"th":"td",v)));
    });
    $("count-table").replaceChildren(table);
  }
  function exchange(){
    const A=power(5,s.alice,23),B=power(5,s.bob,23),common=power(B,s.alice,23);
    const titles=["Choose private numbers","Exchange the public values","Both arrive at "+common];
    const copy=["Move either slider. Alice and Bob each keep their own exponent and agree on the base and prime shown above.","Each person raises 5 to their private exponent and sends the remainder after division by 23.","Each raises the number they received to their own private exponent. Both calculations give 5 raised to the product of the two exponents, modulo 23."];
    set("exchange-step",titles[s.phase]);set("exchange-copy",copy[s.phase]);
    set("advance",["Publish numbers →","Compute shared number →","Start again ↺"][s.phase]);
    $("equations").replaceChildren();
    const pair=s.phase===1?[[5,s.alice,A],[5,s.bob,B]]:[[B,s.alice,common],[A,s.bob,common]];
    if(s.phase)pair.forEach(([base,exp,res],i)=>{const span=element("span",i===0?"Alice  ":"Bob  ");span.append(String(base),element("sup",exp)," mod 23 = "+res);$("equations").append(span)});
    instrument(null,titles[s.phase]+". "+copy[s.phase]);
  }
  function render(){
    const ex=s.mode==="exchange";
    const [name,desc,stage,footer,note]=modes[s.mode];
    set("experiment-title",name);set("experiment-desc",desc);set("stage-heading",stage);set("stage-footer",footer);
    document.querySelectorAll("[data-mode]").forEach(button=>optionButton(button,button.dataset.mode===s.mode));
    show("message-controls",!ex);show("trace-panel",!ex);show("frequencies",!ex);show("exchange-controls",ex);show("exchange-notes",ex);
    if(ex){set("alice-value",s.alice);set("bob-value",s.bob);exchange();return}
    for(const [box,mode] of [["shift","caesar"],["key","vigenere"],["rails","rail"]])show(box+"-box",s.mode===mode);
    set("msg-label",s.decode?"Ciphertext":"Plaintext");set("result-label",s.decode?"Plaintext":"Ciphertext");
    optionButton($("enc"),!s.decode);optionButton($("dec"),s.decode);
    set("shift-value","+"+s.shift);set("rails-value",s.rails);
    data=currentData();
    set("result",data?data.text||"…":"Enter a key containing A–Z.");
    $("key").setAttribute("aria-invalid",String(s.mode==="vigenere"&&!data));
    set("frequency-note",data?note:"Add a key to compare the letter counts.");
    drawTrace();frequency();
  }
  $("experiments").addEventListener("click",e=>{
    const btn=e.target.closest("[data-mode]");if(!btn||btn.dataset.mode===s.mode)return;
    if(s.decode&&s.mode!=="exchange"&&data){$("message").value=data.text;s.decode=false}
    s.mode=btn.dataset.mode;s.i=0;render();
  });
  for(const [id,dec] of [["enc",false],["dec",true]])$(id).addEventListener("click",()=>{
    if(s.decode===dec)return;
    if(data){$("message").value=data.text;s.i=data.steps[s.i]?.target||0}
    s.decode=dec;render();
  });
  $("message").addEventListener("input",render);
  $("fox").addEventListener("click",()=>{s.decode=false;s.i=0;$("message").value="The quick brown fox jumps over the lazy dog.";render()});
  for(const id of ["shift","rails","key","alice","bob"])$(id).addEventListener("input",()=>{
    s[id]=id==="key"?$(id).value:Number($(id).value);if(id==="alice"||id==="bob")s.phase=0;render();
  });
  $("advance").addEventListener("click",()=>{s.phase=(s.phase+1)%3;exchange()});
  $("prev").addEventListener("click",()=>{s.i--;drawTrace()});$("next").addEventListener("click",()=>{s.i++;drawTrace()});
  $("tape").addEventListener("click",e=>{const b=e.target.closest("button");if(b){s.i=Number(b.dataset.i);drawTrace()}});
  function coords(e){
    const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    const local=p.matrixTransform(svg.getScreenCTM().inverse());
    return {x:local.x-270,y:local.y-161};
  }
  let drag=null;
  svg.addEventListener("pointerdown",e=>{
    if(s.mode!=="caesar"||e.button!==0)return;
    const {x,y}=coords(e),r=Math.hypot(x,y);if(r<20||r>154)return;
    drag={id:e.pointerId,angle:Math.atan2(y,x),shift:s.shift};svg.setPointerCapture(e.pointerId);e.preventDefault();
  });
  svg.addEventListener("pointermove",e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const {x,y}=coords(e);const shift=mod(drag.shift-Math.round((Math.atan2(y,x)-drag.angle)*13/Math.PI),26);
    if(s.shift!==shift){s.shift=shift;$("shift").value=shift;render()}
  });
  svg.addEventListener("lostpointercapture",()=>{drag=null});
  svg.addEventListener("pointerup",e=>{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)});
  render();
})();
