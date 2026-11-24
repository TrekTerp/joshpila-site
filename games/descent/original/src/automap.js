import {buildSurvey} from './survey-geometry.js';

const kinds = {
    ship:['Ship','▲','#ffcc78'], exit:['Exit','↗','#a9f28c'], secretExit:['Secret exit','↗','#c4a4ff'],
    outlet:['Exit tunnel','↗','#a9f28c'], blueDoor:['Blue door','B','#80b8ff'],
    goldDoor:['Yellow door','Y','#f8d869'], redDoor:['Red door','R','#ff928b'],
    blueKey:['Blue key','◇','#80b8ff'], goldKey:['Yellow key','◇','#f8d869'], redKey:['Red key','◇','#ff928b'],
    reactor:['Reactor','✳','#ffac76'], hostage:['Hostage','+','#a5e9bb'], fuel:['Energy center','ϟ','#95d9ee'],
    factory:['Robot center','×','#d9a3dc'], start:['Mine entry','○','#a8b9c5']
};
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const $ = id => document.getElementById(id);
let survey, ship, forward, selected, canvas, ctx, drag, resize, closeMap;
let startSegment = -1, levelTitle = '', levelNumber = 0;
let center, scale, yaw, pitch, frame = 0, dirtyFit = false;
let right, up, near, minScale, maxScale;

export function getIsAutomap() { return Boolean(survey); }
export function automap_set_level(start, name, number) {
    startSegment=start; levelTitle=name; levelNumber=number;
}
function updateAxes() {
    const c=Math.cos(yaw), s=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
    right={x:c,y:0,z:-s}; up={x:-sp*s,y:cp,z:-sp*c}; near={x:s*cp,y:sp,z:c*cp};
}
const dot = (p,v) => p.x*v.x + p.y*v.y + p.z*v.z;
const along = (p,v) => (p.x-center.x)*v.x + (p.y-center.y)*v.y + (p.z-center.z)*v.z;
function project(p,width,height) {
    p.px=width/2 + scale*along(p,right); p.py=height/2 - scale*along(p,up);
}
function redraw() {
    if (survey && !frame) frame=requestAnimationFrame(() => { frame=0; if (survey) draw(); });
}
function fit() {
    updateAxes();
    const lo=[Infinity,Infinity,Infinity], hi=[-Infinity,-Infinity,-Infinity];
    const axes=[right,up,near];
    for (const p of survey.points) for (let i=0;i<3;i++) {
        const v=dot(p,axes[i]); lo[i]=Math.min(lo[i],v); hi[i]=Math.max(hi[i],v);
    }
    center={x:0,y:0,z:0};
    for (let i=0;i<3;i++) {
        const m=(lo[i]+hi[i])/2;
        for (const coord of ['x','y','z']) center[coord]+=m*axes[i][coord];
    }
    scale=Math.min(canvas.clientWidth*.80/Math.max(34,hi[0]-lo[0]),canvas.clientHeight*.72/Math.max(34,hi[1]-lo[1]));
    const extent=Math.max(20,Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]));
    minScale=Math.min(scale,Math.min(canvas.clientWidth,canvas.clientHeight)*.33/extent);
    maxScale=Math.max(scale,Math.min(canvas.clientWidth,canvas.clientHeight)/15);
    dirtyFit=true; redraw();
}
function zoom(factor) {
    scale=clamp(scale*factor,minScale,maxScale); dirtyFit=false; redraw();
}
function pan(dx,dy) {
    for (const k of ['x','y','z']) center[k]+=(-dx*right[k]+dy*up[k])/scale;
    dirtyFit=false; redraw();
}
function orbit(dx,dy) {
    yaw-=dx*.008; pitch=clamp(pitch+dy*.008,-1.54,1.54); dirtyFit=false; redraw();
}

function drawFace(f) {
    const p=f.points;
    ctx.beginPath(); ctx.moveTo(p[0].px,p[0].py);
    for (let i=1;i<4;i++) ctx.lineTo(p[i].px,p[i].py);
    ctx.closePath();
    if (f.style === 'wall' || f.style === 'door' || f.style === 'grate') {
        const lighting=(1+f.ny*.72-f.nx*.32+f.nz*.35)/2;
        const l=Math.round(14+15*lighting);
        ctx.fillStyle=f.style==='door'?'hsl(167 27% '+l+'%)':'hsl(195 33% '+l+'%)';
        ctx.fill();
    }
    if (f.style==='frontier') {
        ctx.strokeStyle='#99bfbd'; ctx.lineWidth=1.4; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]); return;
    }
    for (let i=0;i<4;i++) {
        const e=f.rims[i], ridge=e.ridge || e.uses===1, b=p[(i+1)%4];
        ctx.lineWidth=ridge?1.3:.65;
        ctx.strokeStyle=f.style==='door'?'#80aca7':ridge?'#79a8b2':'#44616c';
        ctx.beginPath(); ctx.moveTo(p[i].px,p[i].py); ctx.lineTo(b.px,b.py); ctx.stroke();
    }
    if (f.style==='grate') {
        ctx.strokeStyle='#67848b'; ctx.lineWidth=.85; ctx.beginPath();
        ctx.moveTo(p[0].px,p[0].py); ctx.lineTo(p[2].px,p[2].py);
        ctx.moveTo(p[1].px,p[1].py); ctx.lineTo(p[3].px,p[3].py); ctx.stroke();
    }
}
function drawMarker(m) {
    const x=m.pos.px, y=m.pos.py, [label,glyph,color]=kinds[m.kind];
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='#0b1820'; ctx.strokeStyle=color; ctx.lineWidth=m===selected?2.2:1.5;
    if (m.kind==='ship') {
        const dx=dot(forward,right),dy=-dot(forward,up);
        ctx.beginPath(); ctx.arc(0,0,13,0,2*Math.PI); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.rotate(Math.atan2(dy,dx)); ctx.fillStyle=color; ctx.beginPath();
        if (Math.hypot(dx,dy)<.1) ctx.arc(0,0,4,0,2*Math.PI);
        else {ctx.moveTo(10,0);ctx.lineTo(-6,-6);ctx.lineTo(-3,0);ctx.lineTo(-6,6);ctx.closePath();}
        ctx.fill(); ctx.restore();
    } else {
        ctx.fillRect(-8,-8,16,16); ctx.strokeRect(-8,-8,16,16);
        ctx.fillStyle=color; ctx.font='bold 12px ui-monospace,monospace'; ctx.textAlign='center';
        ctx.textBaseline='middle';ctx.fillText(glyph,0,.5);
    }
    if (m===selected || (!selected && m.kind==='ship')) {
        ctx.font='600 12px system-ui,sans-serif'; ctx.textAlign='left';ctx.textBaseline='middle';
        const w=ctx.measureText(label).width+12, left=x+w+18>canvas.clientWidth?-w-15:15;
        const top=y<16?8:-10;
        ctx.fillStyle='#0a171fee';ctx.fillRect(left,top,w,20);ctx.fillStyle=color;ctx.fillText(label,left+6,top+10);
    }
    ctx.restore();
}
function draw() {
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
    if (!w || !h) return;
    const width=Math.round(w*dpr),height=Math.round(h*dpr);
    if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h); updateAxes();
    for (const p of survey.points) project(p,w,h);
    for (const f of survey.faces) f.depth=along(f.pos,near);
    survey.faces.sort((a,b)=>a.depth-b.depth);
    for (const f of survey.faces) drawFace(f);
    for (const m of survey.markers) {
        project(m.pos,w,h);
        if (m!==ship && m!==selected) drawMarker(m);
    }
    drawMarker(ship);
    if (selected && selected!==ship) drawMarker(selected);
}
function syncSelection() {
    const i=survey.markers.indexOf(selected);
    $('survey-picker').value=String(i);
    for (const b of $('survey-list').children) b.setAttribute('aria-pressed',String(Number(b.value)===i));
}
function focusMarker(m) {
    if (!m) return;
    selected=m; center={...m.pos};
    scale=clamp(Math.max(scale,Math.min(canvas.clientWidth,canvas.clientHeight)/140),minScale,maxScale);
    dirtyFit=false;syncSelection();redraw();
}
function makeList() {
    const list=$('survey-list'),picker=$('survey-picker');
    list.replaceChildren(); picker.replaceChildren(new Option('Landmarks…','-1'));
    survey.markers.forEach((m,i)=>{
        const [label,glyph,color]=kinds[m.kind], distance=Math.round(Math.hypot(m.pos.x-ship.pos.x,m.pos.y-ship.pos.y,m.pos.z-ship.pos.z));
        const b=document.createElement('button'); b.type='button'; b.value=String(i);
        const icon=document.createElement('span'); icon.className='survey-symbol';icon.style.color=color;
        icon.setAttribute('aria-hidden','true');icon.textContent=glyph;b.append(icon,label);
        if (m!==ship) {
            const span=document.createElement('span');span.className='survey-distance';span.textContent=distance+' u';
            b.append(span);
        }
        list.append(b);picker.add(new Option(label+(m===ship?'':' · '+distance+' u'),String(i)));
    });
    syncSelection();
}
function command(name) {
    if (name==='in' || name==='out') zoom(name==='in'?1.25:.8);
    else if (name==='ship') focusMarker(ship);
    else if (name==='fit') { selected=null;syncSelection();fit(); }
}
export function automap_key(e) {
    if (e.target?.tagName==='SELECT') return;
    const code=e.code;
    if (code==='Equal'||code==='NumpadAdd'||code==='KeyW') zoom(1.13);
    else if (code==='Minus'||code==='NumpadSubtract'||code==='KeyS') zoom(1/1.13);
    else if (code==='BracketLeft' || code==='BracketRight') {
        const step=code==='BracketLeft'?-1:1, n=survey.markers.length;
        const current=selected?survey.markers.indexOf(selected):(step<0?0:-1);
        focusMarker(survey.markers[(current+step+n)%n]);
    }
    else if (code==='Home') command('ship');
    else if (code==='KeyF') command('fit');
    else if (code==='ArrowLeft'||code==='ArrowRight') orbit(code==='ArrowLeft'?-12:12,0);
    else if (code==='ArrowUp'||code==='ArrowDown') orbit(0,code==='ArrowUp'?-12:12);
    else if (code==='KeyA'||code==='KeyD') pan(code==='KeyA'?24:-24,0);
    else if (code==='Space'||code==='ShiftLeft'||code==='ShiftRight') {
        if (e.target?.tagName==='BUTTON' && code==='Space') return;
        pan(0,code==='Space'?24:-24);
    } else return;
    e.preventDefault();
}
function bind() {
    canvas=$('survey-canvas');ctx=canvas.getContext('2d');
    $('survey-close').onclick=()=>closeMap();
    $('survey-tools').onclick=e=>command(e.target.closest('button')?.dataset.view);
    $('survey-list').onclick=e=>{const b=e.target.closest('button');if(b) focusMarker(survey.markers[Number(b.value)]);};
    $('survey-picker').onchange=e=>focusMarker(survey.markers[Number(e.target.value)]);
    canvas.oncontextmenu=e=>e.preventDefault();
    canvas.onwheel=e=>{
        e.preventDefault();e.stopPropagation();
        const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
        zoom(Math.exp(-clamp(delta,-240,240)*.0018));
    };
    canvas.onpointerdown=e=>{
        if (drag || ![0,1,2].includes(e.button)) return;
        e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0,pan:e.shiftKey||e.button!==0};
    };
    canvas.onpointermove=e=>{
        if (drag?.id!==e.pointerId) return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        drag.travel+=Math.hypot(dx,dy);drag.x=e.clientX;drag.y=e.clientY;
        if (drag.pan) pan(dx,dy);else orbit(dx,dy);
    };
    canvas.onpointerup=e=>{
        if (drag?.id!==e.pointerId) return;
        if (drag.travel<4 && !drag.pan) {
            const rect=canvas.getBoundingClientRect(), x=e.clientX-rect.left,y=e.clientY-rect.top;
            const m=[ship,...survey.markers.filter(m=>m!==ship)].find(m=>Math.hypot(m.pos.px-x,m.pos.py-y)<=12);
            if (m) focusMarker(m);
        }
        drag=null;
    };
    canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null;};
    resize=new ResizeObserver(()=>{if(survey){if(dirtyFit) fit();else redraw();}});
    resize.observe(canvas);
}

export function automap_enter(camera, segment, onClose) {
    if (survey || segment<0) return false;
    if (!canvas) bind();
    survey=buildSurvey(segment,startSegment);
    ship={kind:'ship',pos:{x:camera.position.x,y:camera.position.y,z:camera.position.z}};
    forward=camera.getWorldDirection(camera.position.clone());
    const order=Object.keys(kinds);
    survey.markers.sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));survey.markers.unshift(ship);
    selected=null;closeMap=onClose;drag=null;yaw=.63;pitch=.46;
    $('flight-tools').inert=true;
    $('mine-survey').hidden=false;
    $('survey-title').textContent=levelTitle || 'Mine survey';
    const level=levelNumber<0?'Secret level '+Math.abs(levelNumber):'Level '+levelNumber;
    $('survey-meta').textContent=level+' · '+survey.count+' explored '+(survey.count===1?'segment':'segments')+' · Flight paused';
    makeList();fit();draw();canvas.focus({preventScroll:true});
    return true;
}
export function automap_exit() {
    if (!survey) return;
    if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
    if (frame) cancelAnimationFrame(frame);
    frame=0;drag=null;survey=null;selected=null;ship=null;closeMap=null;
    $('mine-survey').hidden=true;
    $('flight-tools').inert=false;
    $('survey-list').replaceChildren();$('survey-picker').replaceChildren();
}
