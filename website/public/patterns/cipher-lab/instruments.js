"use strict";
window.CipherInstruments = (() => {
  const { alphabet: ABC, mod, index, railAt, power } = CipherMath;
  const cream = "#f5e7c7", gold = "#f3c77e", mint = "#9dd9bf", line = "#55756a", dark = "#193735";
  const ns = "http://www.w3.org/2000/svg";
  function shape(parent, type, attributes, content) {
    const node = document.createElementNS(ns, type);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (content !== undefined) node.textContent = content;
    parent.append(node);
    return node;
  }
  const circle = (p, x, y, r, fill, stroke="none", width=1) => shape(p, "circle", {cx:x,cy:y,r,fill,stroke,"stroke-width":width});
  const rule = (p,x1,y1,x2,y2,stroke=line,width=1) => shape(p,"line",{x1,y1,x2,y2,stroke,"stroke-width":width});
  const box = (p,x,y,w,h,fill,stroke="none",r=2) => shape(p,"rect",{x,y,width:w,height:h,fill,stroke,rx:r});
  function label(p,x,y,value,size=14,fill=cream,weight=500,anchor="middle",serif=false) {
    return shape(p,"text",{x,y,fill,"text-anchor":anchor,"dominant-baseline":"central","font-family":serif?"Georgia,serif":"monospace","font-size":size,"font-weight":weight},value);
  }
  function polar(i,r) {
    const a=i*Math.PI/13-Math.PI/2;
    return [270+r*Math.cos(a),161+r*Math.sin(a)];
  }
  function dial(svg,s,step) {
    const plain = step ? index(s.decode ? step.output : step.input) : -1;
    circle(svg,270,161,153,"#25443e","#8f976c",2);
    circle(svg,270,161,145,"#e7d3a2","#b28c55",2);
    circle(svg,270,161,117,"#936b41","#4f624b",1);
    circle(svg,270,161,113,"#33594e","#ecbd74",2);
    circle(svg,270,161,84,"#203f3a","#b49b68",2);
    circle(svg,270,161,77,"none",line);
    for(let i=0;i<26;i++){
      const edge=polar(i-.5,117), tip=polar(i-.5,145);
      rule(svg,...edge,...tip,"#b3976b");
      const pt=polar(i,132), inner=polar(i,99);
      if(plain===i){circle(svg,...pt,12,"#7c3d26");circle(svg,...inner,12,gold)}
      label(svg,...pt,ABC[i],16,plain===i?cream:"#233b32",700);
      label(svg,...inner,ABC[mod(i+s.shift,26)],15,plain===i?dark:cream,700);
    }
    label(svg,270,129,s.decode?"DECIPHER":"ENCIPHER",10,mint);
    label(svg,270,161,step?step.input.toUpperCase()+" → "+step.output.toUpperCase():"A–Z",29,cream,600,true);
    label(svg,270,193,"SHIFT "+(s.decode?"−":"+")+s.shift,12,gold);
    label(svg,17,57,"OUTER",11,gold,700,"start");label(svg,17,73,"Plaintext",12,cream,400,"start");
    rule(svg,17,87,75,87);rule(svg,75,87,126,121);
    label(svg,523,246,"INNER",11,gold,700,"end");label(svg,523,263,"Ciphertext",12,cream,400,"end");
    rule(svg,461,233,523,233);rule(svg,461,233,376,195);
  }
  function square(svg,s,step) {
    if (!step){label(svg,270,161,"Enter a message and a key.",18,cream);return}
    const plain=index(s.decode?step.output:step.input), key=step.shift, x0=162,y0=93,cell=36;
    label(svg,270,27,"PLAINTEXT COLUMN",12,gold,700);
    label(svg,50,157,"KEY",12,mint,700);label(svg,50,176,"ROW",12,mint,700);
    for(let c=0;c<7;c++){
      const x=x0+c*cell;
      label(svg,x,y0-31,ABC[mod(plain+c-3,26)],16,c===3?gold:cream,700);
      for(let r=0;r<5;r++){
        const y=y0+r*cell;
        const onRow=r===2, onCol=c===3, active=onRow&&onCol;
        box(svg,x-17,y-17,34,34,active?gold:onRow||onCol?"#355c50":"#244540",line);
        label(svg,x,y,ABC[mod(key+r-2+plain+c-3,26)],17,active?dark:cream,active?700:400);
      }
    }
    for(let r=0;r<5;r++) label(svg,x0-36,y0+r*cell,ABC[mod(key+r-2,26)],16,r===2?mint:cream,700);
    label(svg,270,278,ABC[plain]+"  +  "+ABC[key]+"  =  "+ABC[mod(plain+key,26)],22,cream,700);
    label(svg,270,305,"A = 0   ·   B = 1   ·   …   ·   Z = 25",12,mint);
  }
  function rails(svg,s,step,data) {
    if(!step){label(svg,270,161,"Enter letters to lay out the rails.",17,cream);return}
    const plain = s.decode?data.result:data.letters, n=plain.length;
    const shown=Math.min(n,15), start=Math.max(0,Math.min(n-shown,step.plainPos-Math.floor(shown/2)));
    const x=i=>shown===1?270:55+(i-start)*444/(shown-1), y=r=>72+r*170/(s.rails-1);
    label(svg,270,31,"WRITE IN A ZIGZAG  /  READ ONE RAIL AT A TIME",12,gold,700);
    for(let r=0;r<s.rails;r++){rule(svg,42,y(r),515,y(r),line);label(svg,21,y(r),r+1,13,mint,700)}
    const pts=Array.from({length:shown},(_,j)=>[x(start+j),y(railAt(start+j,s.rails))]);
    shape(svg,"polyline",{points:pts.map(p=>p.join(",")).join(" "),fill:"none",stroke:"#c69c68","stroke-width":2});
    pts.forEach(([px,py],j)=>{
      const i=start+j, active=i===step.plainPos;
      circle(svg,px,py,14,active?gold:"#25483f",active?cream:line,active?2:1);
      label(svg,px,py,plain[i],16,active?dark:cream,700);
    });
    label(svg,270,288,"PLAINTEXT POSITIONS "+(start+1)+"–"+(start+shown)+" OF "+n,12,mint);
  }
  function exchange(svg,s) {
    const A=power(5,s.alice,23),B=power(5,s.bob,23),common=power(B,s.alice,23);
    label(svg,270,24,"PUBLIC CHANNEL",12,gold,700);
    for(const [x,name,priv,pub] of [[96,"Alice",s.alice,A],[444,"Bob",s.bob,B]]){
      circle(svg,x,104,49,"#294d43","#a99869",2);circle(svg,x,104,43,"none",line);
      label(svg,x,95,name,25,cream,600,true);label(svg,x,122,"PRIVATE "+priv,12,mint);
      box(svg,x-48,174,96,45,"#294d43",line);
      label(svg,x,188,"PUBLISHES",10,mint);label(svg,x,207,s.phase?pub:"?",17,gold,700);
      rule(svg,x,153,x,173,line);
    }
    for(const [x1,x2,y,t,offset] of [[153,386,86,A,1],[386,153,131,B,-1]]){
      rule(svg,x1,y,x2,y,s.phase?gold:line,2);
      shape(svg,"path",{d:"M "+(x2-9*offset)+" "+(y-5)+" L "+x2+" "+y+" L "+(x2-9*offset)+" "+(y+5),fill:"none",stroke:s.phase?gold:line,"stroke-width":2});
      if(s.phase){box(svg,247,y-14,46,27,dark);label(svg,270,y,t,17,cream,700)}
    }
    rule(svg,96,221,192,255,line);rule(svg,444,221,348,255,line);
    box(svg,182,246,176,58,s.phase===2?"#e8c17c":"#26473f",line,3);
    label(svg,270,263,"SHARED NUMBER",11,s.phase===2?dark:mint,700);
    label(svg,270,284,s.phase===2?common:"?",21,s.phase===2?dark:cream,700);
  }
  return {caesar:dial,vigenere:square,rail:rails,exchange};
})();
