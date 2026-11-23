"use strict";
const robotTiles = Array.from({length:6}, (_, i) => "armor-"+i);
const pickupTiles = {energy:1, shields:2, blue:3, red:4, yellow:5, spread:9, missiles:13};
const extraTiles = [...robotTiles, ...Object.keys(pickupTiles).map(type=>"pickup-"+type)];
let flightArtReady = false;
const newSignCopy = {
  "EXTRACTION":"EXIT AIRLOCK", "AIRLOCK":"TO AIRLOCK", "PRESSURE SEAL":"RELIEF BYPASS",
  "BLUE ACCESS":"BLUE KEY REQUIRED", "YELLOW ACCESS":"YELLOW KEY REQUIRED", "RED ACCESS":"RED KEY REQUIRED",
  "REACTOR ONE":"REACTOR 1", "REACTOR TWO":"REACTOR 2", "FOUNDRY HEART":"FOUNDRY REACTOR"
};

function paintTrainingSign(name, carriers) {
  const canvas=document.createElement("canvas");
  canvas.width=768;canvas.height=144;
  const g=canvas.getContext("2d"), label=newSignCopy[name]||name;
  const keyColors={"BLUE ACCESS":"#7abfff","RED ACCESS":"#ff8676","YELLOW ACCESS":"#ffe073"};
  const key=keyColors[name], exit=name==="EXTRACTION"||name==="AIRLOCK", hazard=name==="PRESSURE SEAL";
  const reactor=label.includes("REACTOR");
  const cell=exit?0:hazard?1:reactor?2:3;
  g.drawImage(carriers,cell%2*256,Math.floor(cell/2)*256,256,256,0,0,768,144);
  let left=29;
  if (key||exit||hazard||reactor) {
    const ink=key||(exit?"#9fe3b8":hazard?"#ffd364":"#ff9474");
    g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=8;g.lineJoin="round";g.lineCap="round";
    g.beginPath();
    if (key) {
      g.arc(54,60,14,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(64,71);g.lineTo(88,95);
      g.lineTo(98,85);g.moveTo(77,83);g.lineTo(85,75);g.stroke();
    } else if (exit) {
      g.strokeRect(40,41,52,61);g.beginPath();g.moveTo(66,42);g.lineTo(66,100);g.stroke();
      g.fillRect(49,61,9,8);g.fillRect(74,61,9,8);
    } else {
      g.moveTo(66,36);g.lineTo(99,99);g.lineTo(33,99);g.closePath();g.stroke();
      g.fillRect(62,56,8,20);g.fillRect(62,82,8,7);
    }
    left=112;
  }
  let px=94;
  g.font="800 "+px+"px Arial, sans-serif";
  while (g.measureText(label).width>canvas.width-left-34 && px>20) {
    g.font="800 "+(--px)+"px Arial, sans-serif";
  }
  g.fillStyle="#fbf4d9";g.textAlign="center";g.textBaseline="middle";
  g.fillText(label,(left+canvas.width-34)/2,76);
  return canvas;
}

function loadTrainingAtlas(classic, upload) {
  let painted;
  const load=(name)=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src="art/"+name+".webp";
  });
  let pending=false;
  function select() {
    upload(modern&&painted?painted:classic);
    if (!modern||painted||pending) return;
    pending=true;
    Promise.all(["sign-carriers","robot-materials","pickups"].map(load)).then(([carriers,armor,pickups])=>{
      painted=document.createElement("canvas");painted.width=painted.height=2048;
      const g=painted.getContext("2d");
      g.drawImage(classic,0,0);
      function place(name,im,x=0,y=0,sz=null) {
        const tile=atlasInfo.get(name),u=tile%8*256,v=Math.floor(tile/8)*256;
        g.clearRect(u,v,256,256);
        g.drawImage(im,x,y,sz||im.width,sz||im.height,u,v,256,256);
      }
      for (const name of tileList.slice(tileNames.length)) place(name,paintTrainingSign(name,carriers));
      robotTiles.forEach((name,i)=>place(name,armor,i%3*256,Math.floor(i/3)*256,256));
      for (const [type,i] of Object.entries(pickupTiles)) place("pickup-"+type,pickups,i%6*192,Math.floor(i/6)*192,192);
      flightArtReady=true;
      if (modern) upload(painted);
    }).catch(()=>{pending=false;});
  }
  select();
  return select;
}
