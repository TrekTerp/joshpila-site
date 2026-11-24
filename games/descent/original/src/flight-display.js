// Presentation layer for the original campaign. Gameplay never reads these values.
import * as THREE from 'three';
import {boundKeys} from './pilot-panel.js';
import {config_set_texture_filtering} from './config.js';

const selection = new URLSearchParams(location.search).get('mode');
let saved;
try { saved = localStorage.getItem('descent_display_mode'); } catch {}
const state = {value: (selection || saved) === 'evolved' ? 1 : 0};
const count = 4;
const positions = {value:Array.from({length:count}, () => new THREE.Vector3())};
const colors = {value:Array.from({length:count}, () => new THREE.Color(0))};
const paint = new THREE.Color();
const tint = [0xff573b,0xffad38,0x6db5ff,0xd77bff];
const active = [];
let halos, noticeTimer;
const modeButton = document.getElementById('mode');

function showMode(announce) {
    const label = state.value ? 'Evolved' : 'Classic';
    modeButton.textContent = label + ' · F8';
    modeButton.setAttribute('aria-label', 'Graphics mode ' + label + '. Switch graphics');
    modeButton.setAttribute('aria-pressed', String(Boolean(state.value)));
    document.body.dataset.mode = label.toLowerCase();
    config_set_texture_filtering(state.value ? 'linear' : 'nearest');
    if (announce) {
        const msg = document.getElementById('notice');
        msg.textContent = label + ' graphics';
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => {msg.textContent='';},1500);
    }
}
export function showDirectFlightHint() {
    const notice = document.getElementById('notice');
    const hint = 'Click to aim · Z / X fire · ' + boundKeys('pause_game') + ' opens saves and controls';
    notice.textContent = hint;
    const dismiss = () => {
        if (notice.textContent === hint) notice.textContent = '';
        document.removeEventListener('pointerlockchange',dismiss);
        window.removeEventListener('keydown',dismiss);
    };
    document.addEventListener('pointerlockchange',dismiss);
    window.addEventListener('keydown',dismiss);
    setTimeout(dismiss,12000);
}
function toggle() {
    state.value = 1 - state.value;
    try {localStorage.setItem('descent_display_mode', state.value ? 'evolved':'classic');} catch {}
    showMode(true);
}
modeButton.addEventListener('click', toggle);
window.addEventListener('keydown', e => {
    if (e.code !== 'F8') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) toggle();
},true);
document.addEventListener('pointerlockchange', () =>
    document.body.classList.toggle('locked', Boolean(document.pointerLockElement)));
showMode(false);

export function coatMine(material) {
    material.userData.rockRelief = true;
    material.onBeforeCompile = shader => {
        shader.uniforms.displayGrade = state;
        shader.uniforms.boltPos = positions;
        shader.uniforms.boltColor = colors;
        shader.vertexShader = shader.vertexShader
            .replace('void main() {','varying vec3 bayView;\nvoid main() {')
            .replace('#include <project_vertex>','#include <project_vertex>\nbayView = mvPosition.xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('void main() {',`
                varying vec3 bayView;
                uniform float displayGrade;
                uniform vec3 boltPos[4], boltColor[4];
                void main() {
            `)
            .replace('#include <opaque_fragment>',`
                #ifdef USE_MAP
                if (displayGrade > 0.5) {
                    // Reuse the original panel texture as a height field. Directional
                    // edge light follows each painted seam as the pilot turns.
                    vec2 texel = 1.0 / vec2(textureSize(map, 0));
                    vec3 weights = vec3(.22, .68, .10);
                    float h = dot(texture2D(map, vMapUv).rgb, weights);
                    vec2 slope = vec2(
                        dot(texture2D(map, vMapUv + vec2(texel.x,0.)).rgb,weights)-h,
                        dot(texture2D(map, vMapUv + vec2(0.,texel.y)).rgb,weights)-h);
                    vec3 dx = dFdx(bayView), dy = dFdy(bayView);
                    vec3 face = normalize(cross(dx,dy));
                    vec2 du = dFdx(vMapUv), dv = dFdy(vMapUv);
                    vec3 t = dx*dv.y - dy*du.y, b = dy*du.x - dx*dv.x;
                    float f = max(max(dot(t,t),dot(b,b)),1e-10);
                    vec3 normal = normalize(face - (t*slope.x+b*slope.y)*inversesqrt(f)*2.8);
                    vec3 viewDir = normalize(-bayView);
                    vec3 lamp = normalize(vec3(-.38,.72,.62));
                    float glint = pow(max(dot(normal,normalize(lamp+viewDir)),0.),16.);
                    float closeLight = 1./(1.+dot(bayView,bayView)*.00048);
                    float source = max(max(outgoingLight.r,outgoingLight.g),outgoingLight.b);
                    float local = smoothstep(.006,.12,source);
                    vec3 brushed = outgoingLight * vec3(.91,1.02,1.12);
                    brushed += local * closeLight * (
                        vec3(.035,.10,.15)*glint + diffuseColor.rgb *
                        (.12*max(dot(normal,lamp),0.)+.25*dot(slope,vec2(-.6,.8))));
                    float lampColor = max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));
                    brushed += diffuseColor.rgb*local*smoothstep(.30,.85,lampColor)*.22;
                    for(int i=0;i<4;++i){
                        vec3 delta = boltPos[i] - bayView;
                        float d2 = dot(delta,delta);
                        float facing = max(dot(normal, delta*inversesqrt(max(.01,d2))),0.);
                        brushed += boltColor[i]*diffuseColor.rgb*facing*max(0.,1.-d2/550.)/(1.+d2*.017);
                    }
                    outgoingLight = max(brushed, vec3(0.));
                }
                #endif
                #include <opaque_fragment>
            `);
    };
}

function makeHalos(scene) {
    const size = 48;
    const rgba = new Uint8Array(size*size*4);
    for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
        const i=(y*size+x)*4;
        const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
        const a=Math.max(0,1-r);
        rgba[i]=rgba[i+1]=rgba[i+2]=255;
        rgba[i+3]=Math.round(200*a*a*a);
    }
    const tex = new THREE.DataTexture(rgba,size,size);
    tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearFilter; tex.needsUpdate=true;
    const group = new THREE.Group();
    for(let i=0;i<24;i++){
        const mat=new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,
            transparent:true,depthTest:true,depthWrite:false,toneMapped:false});
        const sprite=new THREE.Sprite(mat);
        sprite.visible=false;
        group.add(sprite);
    }
    scene.add(group);
    return group;
}

function tintFor(w) {
    if(w.weapon_type===9) return 0xffcc68;
    if(w.parent_type===1) return 0x83ee78;
    if(w.weapon_type<4) return tint[w.weapon_type];
    if(w.weapon_type===13) return 0x74b5ff;
    if(w.weapon_type===14 || w.weapon_type===17 || w.weapon_type===18) return 0xe18bff;
    return 0xff963e;
}

export function lightWeapons(scene,camera,weapons,automap) {
    if (!state.value || automap) {
        if(halos) halos.visible=false;
        return;
    }
    if(!halos || halos.parent!==scene) halos=makeHalos(scene);
    halos.visible=true;
    camera.updateMatrixWorld();
    active.length=0;
    for(const w of weapons) {
        if(w.active && w.weapon_type!==16) active.push(w);
    }
    const eye=camera.position;
    const distance=w=>(w.pos_x-eye.x)**2+(w.pos_y-eye.y)**2+(-w.pos_z-eye.z)**2;
    active.sort((a,b)=>distance(a)-distance(b));
    for(let i=0;i<halos.children.length;i++){
        const sprite=halos.children[i];
        const w=active[i];
        sprite.visible=Boolean(w);
        if(!w){
            if(i<count) colors.value[i].set(0);
            continue;
        }
        const color=tintFor(w);
        sprite.position.set(w.pos_x,w.pos_y,-w.pos_z);
        sprite.scale.setScalar(Math.min(13,Math.max(4,w.size*4.8)));
        sprite.material.color.set(color);
        if(i<count) {
            positions.value[i].copy(sprite.position).applyMatrix4(camera.matrixWorldInverse);
            colors.value[i].copy(paint.set(color)).multiplyScalar(1.45);
        }
    }
}
