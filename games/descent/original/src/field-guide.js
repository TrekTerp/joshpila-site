import {inspectStage} from './guide-viewer.js';

const el=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const training=query.get('set')==='training', custom=query.get('data')==='custom'&&!training;
const source=training?'training':custom?'registered':'shareware';
const sections=['Robots','Weapons','Powerups'];
let section=sections.find(s=>s.toLowerCase()===location.hash.slice(1))||'Robots';
let classic=false;
try {classic=JSON.parse(localStorage.getItem('rr.options.v1'))?.modern===false;} catch {}
document.body.dataset.mode=classic?'classic':'evolved';
document.querySelector('[data-set="'+source+'"]').setAttribute('aria-current','page');
function linkSections() {
    for (const a of document.querySelectorAll('[data-set]')) {
        const url=new URL(a.href);url.hash=section.toLowerCase();a.href=url;
    }
}
linkSections();
if (custom) el('status').hidden=true;

async function openGuide() {
    const cat=training?await (await import('./guide-training.js')).trainingCatalog(!classic)
        :await (await import('./guide-catalog.js')).campaignCatalog();
    el('status').hidden=true;el('guide').hidden=false;
    let inspect;
    try {inspect=inspectStage(el('model'),el('stage'),el('reset'));} catch(error) {console.warn(error);}
    const index=el('index'),difficulty=el('difficulty'),positions={Robots:0,Weapons:0,Powerups:0};
    cat.difficulty.forEach((name,i)=>difficulty.add(new Option(name,i)));
    difficulty.value='1';
    let card;
    function stats() {
        const d=Number(difficulty.value);
        const rows=card.fields?card.fields(d):[['Primary attack',card.attack],[card.damageLabel,card.damage(d)],
            ['Base shields',card.shields],['Score',card.points+' points']];
        const first=card.first;
        rows.push([section==='Robots'?'First encounter':'First available',
            first?[first.label,first.mine].filter(Boolean).join(' · '):'Not recorded in these mines']);
        const varies=card.fields?cat.difficulty.some((_,level)=>JSON.stringify(card.fields(level))!==JSON.stringify(card.fields(0))):cat.difficulty.some((_,level)=>card.damage(level)!==card.damage(0));
        difficulty.closest('label').hidden=!varies;
        el('facts').replaceChildren(...rows.map(([key,value])=>{
            const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
            dt.textContent=key;dd.textContent=value??'Unknown';div.append(dt,dd);return div;
        }));
    }
    function select(i,scroll=true) {
        const deck=cat[section]; i=(i+deck.length)%deck.length;positions[section]=i;card=deck[i];
        el('category').textContent=cat.edition+' / '+card.classification;
        el('robot-name').textContent=card.name;el('field-note').textContent=card.notes;
        el('position').textContent=(i+1)+' / '+deck.length;
        let view=null,failed=false;
        try {view=inspect?.(card,training);} catch(error) {failed=true;console.warn('Field guide preview:',error);}
        el('model-id').textContent=card.preview||(section==='Robots'?'Robot model':'Pickup');
        el('reset').hidden=!view;el('model').hidden=!view;
        el('unpictured').hidden=Boolean(view);
        el('unpictured').textContent=(!inspect||failed)?'The inspection view could not be drawn on this device.':'No artwork for this entry in the selected files.';
        el('skin').textContent=view?(classic?'Classic':'Evolved'):'';
        el('gesture').textContent=view==='model'?'Drag to rotate · Scroll to zoom':view?'Scroll to zoom':'';
        el('model').setAttribute('aria-label',card.name+(view==='model'?'. Drag or use arrows to rotate.':'.')+' Scroll or use plus and minus to zoom.');
        for (const [j,b] of Array.from(index.children).entries()) b.setAttribute('aria-pressed',String(i===j));
        if (scroll) {
            const btn=index.children[i],offset=btn.getBoundingClientRect().left-index.getBoundingClientRect().left;
            if (offset<0 || offset+btn.offsetWidth>index.clientWidth) index.scrollLeft+=offset-(index.clientWidth-btn.offsetWidth)/2;
        }
        stats();
    }
    function openSection(name) {
        section=name;history.replaceState(null,'','#'+name.toLowerCase());linkSections();
        document.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===name)));
        el('index-name').textContent=({Robots:'Robot index',Weapons:'Weapon index',Powerups:'Powerup index'})[name];
        index.replaceChildren(...cat[name].map((record,i)=>{
            const b=document.createElement('button'),tag=document.createElement('small');
            b.type='button';tag.textContent=record.classification;b.append(tag,record.name);
            b.addEventListener('click',()=>select(i));return b;
        }));
        index.scrollLeft=0;select(positions[name]);
    }
    const step=delta=>select(positions[section]+delta);
    el('prev').onclick=()=>step(-1);el('next').onclick=()=>step(1);
    difficulty.onchange=stats;
    document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>openSection(b.dataset.section));
    document.addEventListener('keydown',e=>{
        if(e.defaultPrevented||e.target.matches('input,select,textarea,#model')||e.altKey||e.ctrlKey||e.metaKey) return;
        if (e.key==='ArrowRight'||e.key==='ArrowLeft') {e.preventDefault();step(e.key==='ArrowLeft'?-1:1);}
    });
    index.addEventListener('wheel',e=>{
        if (!e.deltaY || Math.abs(e.deltaX)>Math.abs(e.deltaY)) return;
        const before=index.scrollLeft;index.scrollLeft+=e.deltaY*(e.deltaMode===1?16:1);
        if (before!==index.scrollLeft) e.preventDefault();
    },{passive:false});
    let drag=null,ignoreClick=false;
    index.addEventListener('pointerdown',e=>{
        if (e.pointerType!=='mouse'||e.button!==0) return;
        drag={id:e.pointerId,x:e.clientX,start:index.scrollLeft};ignoreClick=false;
    });
    index.addEventListener('pointermove',e=>{
        if (drag?.id!==e.pointerId || !(e.buttons&1)) return;
        const delta=e.clientX-drag.x;
        if (!ignoreClick && Math.abs(delta)>5) {ignoreClick=true;index.setPointerCapture(e.pointerId);}
        if (ignoreClick) index.scrollLeft=drag.start-delta;
    });
    window.addEventListener('pointerup',()=>{drag=null;setTimeout(()=>ignoreClick=false,0);});
    index.addEventListener('click',e=>{if(ignoreClick){e.preventDefault();e.stopPropagation();}},true);
    openSection(section);
}
openGuide().catch(error=>{
    el('status').hidden=false;el('status').textContent='Could not open the field guide. '+error.message+' ';
    const a=document.createElement('a');a.href=location.href;a.textContent='Try again';el('status').append(a);
});
