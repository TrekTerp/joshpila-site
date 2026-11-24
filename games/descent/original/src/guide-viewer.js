import * as THREE from 'three';
import {createFlightRenderer} from './software-renderer.js';

export function inspectStage(canvas, stage, resetButton) {
    const renderer=createFlightRenderer({canvas,alpha:true,antialias:true});
    renderer.setClearColor(0x000000,0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    const scene=new THREE.Scene(), pivot=new THREE.Group(), mount=new THREE.Group();
    scene.add(pivot,new THREE.AmbientLight(0xffffff,1.8));
    const lamp=new THREE.DirectionalLight(0xffedd2,2.4);
    lamp.position.set(-3,4,5); scene.add(lamp); pivot.add(mount);
    const camera=new THREE.PerspectiveCamera(38,1,.01,100);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const cache=new WeakMap();
    let item=null, sprite=false, training=false, zoom=1, pointer=null, lastTime=0, frame=0,texturePass=0;
    function draw(now=performance.now()) {
        if (stage.clientWidth<1 || stage.clientHeight<1) return;
        const vertical=camera.fov*Math.PI/360;
        const limit=Math.min(vertical,Math.atan(Math.tan(vertical)*camera.aspect));
        camera.position.z=1.09/(Math.sin(limit)*zoom);
        item?.userData.animate?.(reduced.matches?0:now/1000);
        renderer.render(scene,camera);
    }
    function animate(now) {
        frame=0;
        if (!item?.userData.animate || document.hidden) return;
        if (now-lastTime>=65) { draw(now); lastTime=now; }
        frame=requestAnimationFrame(animate);
    }
    function schedule() {
        if (!frame && item?.userData.animate && !document.hidden) frame=requestAnimationFrame(animate);
    }
    document.addEventListener('visibilitychange',schedule);
    function reset() {
        zoom=sprite?1:1.12;
        pivot.rotation.set(sprite?0:.14,sprite?0:(training?-.5:Math.PI-.51),0,'YXZ');
        draw();
    }
    function resize() {
        const width=stage.clientWidth,height=stage.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width,height,false);
        camera.aspect=width/height; camera.updateProjectionMatrix(); draw();
    }
    new ResizeObserver(resize).observe(stage);
    resetButton.addEventListener('click',reset);
    function rotate(dx,dy) {
        if (sprite) return;
        pivot.rotation.y+=dx;
        pivot.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,pivot.rotation.x+dy));
        draw();
    }
    function magnify(factor) { zoom=Math.max(.55,Math.min(3.2,zoom*factor)); draw(); }
    canvas.addEventListener('pointerdown',e=>{
        if (!item || sprite || e.button!==0 || pointer) return;
        pointer={id:e.pointerId,x:e.clientX,y:e.clientY};
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
        if (pointer?.id!==e.pointerId) return;
        rotate((e.clientX-pointer.x)*.012,(e.clientY-pointer.y)*.012);
        pointer.x=e.clientX; pointer.y=e.clientY;
    });
    canvas.addEventListener('lostpointercapture',()=>{pointer=null;});
    canvas.addEventListener('wheel',e=>{
        if (!item) return;
        e.preventDefault(); magnify(e.deltaY<0?1.12:1/1.12);
    },{passive:false});
    canvas.addEventListener('keydown',e=>{
        if (!item) return;
        const run={ArrowLeft:()=>rotate(-.16,0),ArrowRight:()=>rotate(.16,0),
            ArrowUp:()=>rotate(0,-.16),ArrowDown:()=>rotate(0,.16),
            '+':()=>magnify(1.12),'=':()=>magnify(1.12),'-':()=>magnify(1/1.12),Home:reset}[e.key];
        if (run) {e.preventDefault();e.stopPropagation();run();}
    });
    return (card,isTraining)=>{
        cancelAnimationFrame(frame);clearTimeout(texturePass);frame=0; mount.clear(); item=null; training=isTraining;
        if (!cache.has(card)) cache.set(card,card.makeModel?.()||null);
        item=cache.get(card);
        if (!item) { draw(); return null; }
        sprite=Boolean(item.isSprite);
        mount.scale.setScalar(1); mount.position.set(0,0,0);
        item.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(item,true);
        const sphere=bounds.getBoundingSphere(new THREE.Sphere());
        // A billboard has transparent corners. Fit its visible square to the inspection window.
        const radius=sprite?Math.max(item.scale.x,item.scale.y)*.58:sphere.radius||1;
        mount.add(item); mount.scale.setScalar(1/radius);
        if (!sprite) mount.position.copy(sphere.center).multiplyScalar(-1/radius);
        reset();resize();schedule();
        if (!sprite) {
            function settle() {draw();if (performance.now()<until) texturePass=setTimeout(settle,250);}
            const until=performance.now()+4000;texturePass=setTimeout(settle,250);
        }
        return sprite?'sprite':'model';
    };
}
