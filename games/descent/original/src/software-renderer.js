// A small z-buffered rasterizer for the meshes, indexed textures, billboards,
// automap lines and cockpit overlay produced by this port. All simulation and
// the portal visibility pass run in their original modules.
import * as THREE from 'three';

const unit = n => Math.max(0,Math.min(1,n));
const byte = n => Math.max(0,Math.min(255,n));
const ink = n => byte(Math.sqrt(Math.max(0,n))*255);
const vertex = (x,y,z,u=0,v=0,r=1,g=1,b=1) => ({x,y,z,u,v,r,g,b});
const mix = (a,b,t) => vertex(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t,
    a.u+(b.u-a.u)*t,a.v+(b.v-a.v)*t,a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);
const range = {};
const frustum = new THREE.Frustum(), clip = new THREE.Matrix4(), mv = new THREE.Matrix4();
const sphere = new THREE.Sphere(), scale = new THREE.Vector3();
let gpuAvailable;
export function createFlightRenderer(options={}) {
    const force = new URLSearchParams(location.search).get('renderer') === 'software';
    if (!force && gpuAvailable !== false) {
        const canvas = options.canvas || document.createElement('canvas');
        let context;
        try {
            context = canvas.getContext('webgl2',{alpha:!!options.alpha,antialias:!!options.antialias,
                depth:true,stencil:false,powerPreference:options.powerPreference||'default'});
            if (context) {
                const renderer = new THREE.WebGLRenderer({...options,canvas,context});
                renderer.domElement.dataset.renderer='webgl';
                gpuAvailable=true;
                return renderer;
            }
        } catch(error) { console.warn('WebGL renderer unavailable:',error.message); }
        gpuAvailable=false;
    }
    return new SoftwareRenderer(options);
}
class SoftwareRenderer {
    constructor(options) {
        this.domElement=options.canvas || document.createElement('canvas');
        this.domElement.dataset.renderer='software';
        this.ctx=this.domElement.getContext('2d',{alpha:Boolean(options.alpha)});
        this.autoClear=true;
        this.clearAlpha=options.alpha ? 0 : 255;
        this.sprites=[]; this.lines=[];
        this.w=0; this.h=0;
        this.setSize(this.domElement.width || 320,this.domElement.height || 200,false);
    }
    setSize(w,h,style=true) {
        this.w=w; this.h=h;
        const factor=Math.min(1,448/w,280/h);
        const c=this.domElement;
        c.width=Math.max(1,Math.round(w*factor));
        c.height=Math.max(1,Math.round(h*factor));
        if(style){c.style.width=w+'px';c.style.height=h+'px';}
        c.style.imageRendering='pixelated';
        this.image=this.ctx.createImageData(c.width,c.height);
        this.rgba=this.image.data;
        this.words=new Uint32Array(this.rgba.buffer);
        this.depth=new Float32Array(c.width*c.height);
        this.setViewport(0,0,w,h);
    }
    setPixelRatio() {}
    setClearColor(color,alpha=1){this.clearAlpha=Math.round(alpha*255);}
    getSize(v){return v.set(this.w,this.h);}
    setScissor(){}
    setScissorTest(){}
    setViewport(x,y,w,h){
        const c=this.domElement;
        this.x0=Math.round(x*c.width/this.w);
        this.y0=Math.round((this.h-y-h)*c.height/this.h);
        this.width=Math.max(1,Math.round(w*c.width/this.w));
        this.height=Math.max(1,Math.round(h*c.height/this.h));
        this.x1=Math.min(c.width-1,this.x0+this.width-1);
        this.y1=Math.min(c.height-1,this.y0+this.height-1);
    }
    clear(){this.words.fill(this.clearAlpha<<24);this.depth.fill(0);}
    dispose(){this.sprites.length=this.lines.length=0;}
    project(v) {
        const iz=1/v.z;
        v.sx=this.cx+this.fx*v.x*iz; v.sy=this.cy-this.fy*v.y*iz; v.iz=iz;
        return v;
    }
    render(scene,camera){
        if(camera.isOrthographicCamera){
            const hud=scene.children.find(o=>o.isMesh && o.visible)?.material?.map?.image;
            if(hud){this.ctx.imageSmoothingEnabled=false;this.ctx.drawImage(hud,0,0,this.domElement.width,this.domElement.height);}
            return;
        }
        if(this.autoClear) this.clear();
        scene.updateMatrixWorld();camera.updateMatrixWorld();
        const pm=camera.projectionMatrix.elements;
        this.cx=this.x0+this.width/2;this.cy=this.y0+this.height/2;
        this.fx=this.width*.5*pm[0]; this.fy=this.height*.5*pm[5];
        this.near=Math.max(.1,camera.near);
        this.evolved=document.body.dataset.mode==='evolved';
        this.sprites.length=this.lines.length=0;
        frustum.setFromProjectionMatrix(clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
        scene.traverseVisible(o=>{
            if(o.isLOD && o.autoUpdate) o.update(camera);
            if(o.isSprite){this.sprites.push(o);return;}
            if(o.isLine || o.isPoints){this.lines.push(o);return;}
            if(!o.isMesh || !o.geometry || !o.layers.test(camera.layers)) return;
            if(!o.isBatchedMesh && o.frustumCulled) {
                if(!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
                sphere.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
                if(!frustum.intersectsSphere(sphere)) return;
            }
            mv.multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);
            const geo=o.geometry;
            if(o.isBatchedMesh){
                for(let i=0;i<o.instanceCount;i++){
                    if(!o.getVisibleAt(i)) continue;
                    o.getGeometryRangeAt(o.getGeometryIdAt(i),range);
                    this.drawRange(geo,o.material,range.start,range.count);
                }
            } else if(Array.isArray(o.material)) {
                for(const g of geo.groups) this.drawRange(geo,o.material[g.materialIndex],g.start,g.count);
            } else {
                const lim=geo.index?.count || geo.attributes.position?.count || 0;
                this.drawRange(geo,o.material,geo.drawRange.start,Math.min(lim-geo.drawRange.start,geo.drawRange.count));
            }
        });
        for(const o of this.lines)this.lineGeometry(o,camera);
        // Alpha billboards retain the opaque mine's depth test; sort for overlapping explosions.
        this.sprites.sort((a,b)=>this.spriteDepth(b,camera)-this.spriteDepth(a,camera));
        for(const o of this.sprites) this.drawSprite(o,camera);
        this.ctx.putImageData(this.image,0,0);
    }
    spriteDepth(o,camera){
        const p=o.matrixWorld.elements,m=camera.matrixWorldInverse.elements;
        return -(m[2]*p[12]+m[6]*p[13]+m[10]*p[14]+m[14]);
    }
    mapVertex(index,p,uv,colors,m,material){
        const x=p.getX(index),y=p.getY(index),z=p.getZ(index);
        const rgb=material.color, scaleLight=material.cloakMode ? Math.max(.04,(material.cloakLevel || 2)/34) : 1;
        const shade=material.useObjectLight && !material.userData?.noLighting;
        return vertex(
            m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],
            -(m[2]*x+m[6]*y+m[10]*z+m[14]),uv?.getX(index)||0,uv?.getY(index)||0,
            (colors?colors.getX(index):1)*(rgb?.r??1)*scaleLight*(shade?Math.max(.06,material.objectLightR):1),
            (colors?colors.getY(index):1)*(rgb?.g??1)*scaleLight*(shade?Math.max(.06,material.objectLightG):1),
            (colors?colors.getZ(index):1)*(rgb?.b??1)*scaleLight*(shade?Math.max(.06,material.objectLightB):1));
    }
    drawRange(geo,mat,start,count){
        if(!mat || !mat.visible || !geo.attributes.position) return;
        if(mat.isPolyobjTextureMaterial || mat.robotEmitter) mat.onBeforeRender();
        const p=geo.attributes.position,uv=geo.attributes.uv,colors=mat.vertexColors?geo.attributes.color:null;
        const idx=geo.index?.array,m=mv.elements;
        for(let i=start;i+2<start+count;i+=3){
            const a=this.mapVertex(idx?idx[i]:i,p,uv,colors,m,mat);
            const b=this.mapVertex(idx?idx[i+1]:i+1,p,uv,colors,m,mat);
            const c=this.mapVertex(idx?idx[i+2]:i+2,p,uv,colors,m,mat);
            const near=this.near;
            if(a.z<near && b.z<near && c.z<near) continue;
            if(a.z>=near && b.z>=near && c.z>=near){
                this.triangle(this.project(a),this.project(b),this.project(c),mat);
            } else {
                const src=[a,b,c],clipped=[];
                for(let j=0;j<3;j++){
                    const s=src[j],e=src[(j+1)%3];
                    if(s.z>=near) clipped.push(s);
                    if((s.z>=near)!==(e.z>=near)) clipped.push(mix(s,e,(near-s.z)/(e.z-s.z)));
                }
                for(const v of clipped)this.project(v);
                for(let j=1;j+1<clipped.length;j++)this.triangle(clipped[0],clipped[j],clipped[j+1],mat);
            }
        }
    }
    triangle(a,b,c,mat){
        const minX=Math.max(this.x0,Math.ceil(Math.min(a.sx,b.sx,c.sx)-.5));
        const maxX=Math.min(this.x1,Math.floor(Math.max(a.sx,b.sx,c.sx)-.5));
        const minY=Math.max(this.y0,Math.ceil(Math.min(a.sy,b.sy,c.sy)-.5));
        const maxY=Math.min(this.y1,Math.floor(Math.max(a.sy,b.sy,c.sy)-.5));
        if(minX>maxX || minY>maxY) return;
        const abx=b.sx-a.sx,aby=b.sy-a.sy,acx=c.sx-a.sx,acy=c.sy-a.sy;
        const area=abx*acy-aby*acx;
        if(Math.abs(area)<.0001 || (mat.side===THREE.FrontSide && area>0) || (mat.side===THREE.BackSide && area<0)) return;
        const inv=1/area,dbx=acy*inv,dby=-acx*inv,dcx=-aby*inv,dcy=abx*inv;
        const px=minX+.5-a.sx, py=minY+.5-a.sy;
        let brow=(px*acy-py*acx)*inv,crow=(abx*py-aby*px)*inv;
        const texture=mat.map?.image,t=texture?.data,tw=texture?.width || 1,th=texture?.height || 1;
        const repeat=mat.map?.wrapS===THREE.RepeatWrapping;
        const enhanced=this.evolved && mat.userData?.rockRelief && t;
        const ua=a.u*a.iz,ub=b.u*b.iz-ua,uc=c.u*c.iz-ua;
        const va=a.v*a.iz,vb=b.v*b.iz-va,vc=c.v*c.iz-va;
        const zb=b.iz-a.iz,zc=c.iz-a.iz;
        const r0=ink(a.r)/255,g0=ink(a.g)/255,b0=ink(a.b)/255;
        const r1=ink(b.r)/255-r0,g1=ink(b.g)/255-g0,b1=ink(b.b)/255-b0;
        const r2=ink(c.r)/255-r0,g2=ink(c.g)/255-g0,b2=ink(c.b)/255-b0;
        const colors=this.rgba,depth=this.depth,stride=this.domElement.width;
        const additive=mat.blending===THREE.AdditiveBlending,opacity=mat.opacity??1;
        for(let y=minY;y<=maxY;y++,brow+=dby,crow+=dcy){
            let wb=brow,wc=crow,ip=y*stride+minX;
            for(let x=minX;x<=maxX;x++,ip++,wb+=dbx,wc+=dcx){
                if(wb<-.00001 || wc<-.00001 || wb+wc>1.00001)continue;
                const iz=a.iz+wb*zb+wc*zc;
                if(mat.depthTest && iz<depth[ip])continue;
                let red=255,green=255,blue=255,alpha=opacity;
                if(t){
                    const z=1/iz,u=(ua+wb*ub+wc*uc)*z,v=(va+wb*vb+wc*vc)*z;
                    const fx=(repeat?u-Math.floor(u):unit(u))*tw;
                    const fy=(repeat?v-Math.floor(v):unit(v))*th;
                    const tx=Math.min(tw-1,fx|0),ty=Math.min(th-1,fy|0),n=(ty*tw+tx)*4;
                    red=t[n];green=t[n+1];blue=t[n+2];alpha*=t[n+3]/255;
                    if(enhanced){
                        const right=(ty*tw+((tx+1)%tw))*4,down=(((ty+1)%th)*tw+tx)*4;
                        const blendX=(fx-tx)*.34,blendY=(fy-ty)*.34;
                        const relief=(t[down+1]-t[right+1])*.21;
                        red+=(t[right]-red)*blendX+(t[down]-red)*blendY+relief;
                        green+=(t[right+1]-green)*blendX+(t[down+1]-green)*blendY+relief*1.10;
                        blue+=(t[right+2]-blue)*blendX+(t[down+2]-blue)*blendY+relief*1.25;
                        const rim=1/(1+z*.035);
                        red=red*.98+rim*.8;green=green*1.05+rim*2.5;blue=blue*1.12+rim*4;
                    }
                }
                if(alpha<=0 || (mat.alphaTest && alpha<mat.alphaTest))continue;
                red*=r0+wb*r1+wc*r2;green*=g0+wb*g1+wc*g2;blue*=b0+wb*b1+wc*b2;
                const ci=ip*4,base=additive?1:1-alpha;
                colors[ci]=base*colors[ci]+red*alpha;colors[ci+1]=base*colors[ci+1]+green*alpha;
                colors[ci+2]=base*colors[ci+2]+blue*alpha;colors[ci+3]=Math.min(255,colors[ci+3]+alpha*255);
                if(mat.depthWrite)depth[ip]=iz;
            }
        }
    }
    drawSprite(o,camera){
        if(!o.material.visible || !o.layers.test(camera.layers))return;
        mv.multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);
        const m=mv.elements,z=-m[14];if(z<this.near)return;
        scale.setFromMatrixScale(o.matrixWorld);
        const cx=o.center.x,cy=o.center.y;
        const l=-cx*scale.x,r=(1-cx)*scale.x,bot=-cy*scale.y,top=(1-cy)*scale.y;
        const color=o.material.color,ang=o.material.rotation||0,cs=Math.cos(ang),sn=Math.sin(ang);
        const make=(x,y,u,v)=>this.project(vertex(m[12]+x*cs-y*sn,m[13]+x*sn+y*cs,z,u,v,color.r,color.g,color.b));
        const a=make(l,bot,0,0),b=make(r,bot,1,0),c=make(r,top,1,1),d=make(l,top,0,1);
        this.triangle(a,b,c,o.material);this.triangle(a,c,d,o.material);
    }
    lineGeometry(o,camera){
        const p=o.geometry.attributes.position;
        if(!p || !o.material.visible)return;
        const colors=o.material.vertexColors?o.geometry.attributes.color:null;
        mv.multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld);
        const m=mv.elements,ix=o.geometry.index?.array,count=ix?.length||p.count;
        const step=o.isPoints?1:2;
        for(let i=0;i+step-1<count;i+=step){
            let a=this.mapVertex(ix?ix[i]:i,p,null,colors,m,o.material);
            let b=step===1?a:this.mapVertex(ix?ix[i+1]:i+1,p,null,colors,m,o.material);
            if(a.z<this.near && b.z<this.near)continue;
            if(a.z<this.near)a=mix(a,b,(this.near-a.z)/(b.z-a.z));
            if(b.z<this.near)b=mix(b,a,(this.near-b.z)/(a.z-b.z));
            this.project(a);this.project(b);
            const dx=b.sx-a.sx,dy=b.sy-a.sy;
            let lo=0,hi=1;
            const clipLine=(s,v,min,max)=>{
                if(!v)return s>=min && s<=max;
                let t0=(min-s)/v,t1=(max-s)/v;if(t0>t1)[t0,t1]=[t1,t0];
                lo=Math.max(lo,t0);hi=Math.min(hi,t1);return lo<=hi;
            };
            if(!clipLine(a.sx,dx,this.x0,this.x1) || !clipLine(a.sy,dy,this.y0,this.y1))continue;
            const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*(hi-lo)));
            for(let j=0;j<=steps;j++){
                const t=lo+(hi-lo)*j/steps;
                const id=(Math.round(a.sy+dy*t)*this.domElement.width+Math.round(a.sx+dx*t))*4;
                this.rgba[id]=ink(a.r);this.rgba[id+1]=ink(a.g);this.rgba[id+2]=ink(a.b);this.rgba[id+3]=255;
            }
        }
    }
}
