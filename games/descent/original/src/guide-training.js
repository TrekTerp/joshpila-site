import * as THREE from 'three';

// Use the flight meshes and the same tile coordinates as the training renderer.
async function loadSource(name) {
    const script=document.createElement('script');script.src=new URL('../../'+name+'.js',import.meta.url);
    await new Promise((resolve,reject)=>{
        script.onload=resolve;script.onerror=()=>reject(Error('Could not load '+name+'.'));document.head.append(script);
    });
}
async function sheet(name) {
    const image=new Image();image.src=new URL('../../art/'+name+'.webp',import.meta.url);
    try {await image.decode();return image;} catch {return null;}
}
export async function trainingCatalog(useModern) {
    for (const name of ['missions','training-art','render','game','models']) await loadSource(name);
    const atlas=makeAtlas(), ctx=atlas.getContext('2d',{willReadFrequently:true}), textures=new Map();
    const [armor,pickups]=useModern?await Promise.all([sheet('robot-materials'),sheet('pickups')]):[];
    function paint(key,image,i,cols,size) {
        const n=atlasInfo.get(key),x=n%8*256,y=Math.floor(n/8)*256;
        ctx.clearRect(x,y,256,256);
        ctx.drawImage(image,i%cols*size,Math.floor(i/cols)*size,size,size,x,y,256,256);
    }
    if (armor) robotTiles.forEach((key,i)=>paint(key,armor,i,3,256));
    if (pickups) for (const [key,i] of Object.entries(pickupTiles)) paint('pickup-'+key,pickups,i,6,192);
    function texture(n,sprite=false) {
        const key=n+(sprite?'s':'m');
        if (!textures.has(key)) {
            const data=ctx.getImageData(n%8*256,Math.floor(n/8)*256,256,256).data;
            const t=new THREE.DataTexture(new Uint8Array(data.buffer),256,256);
            t.flipY=sprite;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;
            t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;textures.set(key,t);
        }
        return textures.get(key);
    }
    function mesh(vertices) {
        const tiles=new Map(),group=new THREE.Group();
        for (let i=0;i<vertices.length;i+=13) {
            const tile=vertices[i+8];
            if (!tiles.has(tile)) tiles.set(tile,{position:[],uv:[],color:[]});
            const attr=tiles.get(tile), light=Math.min(1.35,.74-.16*vertices[i+3]+.24*vertices[i+4]+.14*vertices[i+5]+.55*vertices[i+12]);
            attr.position.push(...vertices.slice(i,i+3));attr.uv.push(vertices[i+6],vertices[i+7]);
            for(let j=9;j<12;j++) attr.color.push(vertices[i+j]*light);
        }
        for (const [n,attr] of tiles) {
            const geom=new THREE.BufferGeometry();
            for (const [name,data] of Object.entries(attr)) geom.setAttribute(name,new THREE.Float32BufferAttribute(data,name==='uv'?2:3));
            group.add(new THREE.Mesh(geom,new THREE.MeshBasicMaterial({map:texture(n),vertexColors:true,side:THREE.DoubleSide})));
        }
        return group;
    }
    function pickup(type) {
        if (pickups && type in pickupTiles) {
            const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture(atlasInfo.get('pickup-'+type),true),transparent:true}));
            sprite.scale.set(2,2,1);return sprite;
        }
        return mesh(itemModel(type));
    }
    function projectile(type) {
        const v=[];
        if(type==='missile'||type==='flare') {
            const missile=type==='missile';
            diamond(v,[0,0,0],missile?[.15,.15,.35]:[.12,.12,.16],missile?'body':'lamp',missile?white:amber,missile?0:1);
        } else {
            const col=type==='spread'?[.75,.39,1]:cyan;
            face(v,[-.074,0,-.34],[.148,0,0],[0,0,.68],'lamp',col,1);
            face(v,[0,-.074,-.34],[0,.148,0],[0,0,.68],'lamp',col,1);
        }
        return mesh(v);
    }
    const names=['Cadet','Pilot','Ace'];
    function first(type,robot=false) {
        const n=MINES.findIndex(m=>m.rooms.some(r=>robot?(r[6]||[]).includes(type):r[5]===type||(r[7]||[]).includes(type)));
        return n<0?null:{label:'Training '+(n+1),mine:MINES[n].name};
    }
    const robots=[
        ['scout','Scout','Skirmisher','Strafes across your aim while trying to stay seven units from the ship.'],
        ['gunner','Gunner','Ranged','Holds the longest firing distance of the training robots. Its plasma bolts do the most damage per hit.'],
        ['hunter','Hunter','Pursuit','Closes to short range and can keep following after you round a corner.']
    ].map(([id,name,classification,notes])=>{
        const cfg=robotTypes[id];
        return {id,name,classification,notes,first:first(id,true),attack:'Plasma bolt',damageLabel:'Damage per hit',
            damage:d=>Number((cfg.damage*difficulty[d].dmg).toFixed(2)),shields:cfg.hp,points:cfg.points,
            makeModel:()=>mesh(armor?evolvedBot(id):botModel(id))};
    });
    const arms=[
        ['laser','Twin Lasers','Primary','Two forward bolts fire together from opposite sides of the ship.','1','Left click / Z','1 energy','5 per bolt'],
        ['spread','Spread Cannon','Primary','Fires two forward bolts and two angled bolts. With only one energy left, the ship fires twin lasers.','2','Left click / Z','2 energy','6 forward / 7 angled'],
        ['missile','Concussion Missile','Secondary','Explodes on impact. Blast damage falls with distance.','Always equipped','Right click / X','1 missile','Up to 48'],
        ['flare','Flare','Utility','Illuminates the tunnel for up to 12 seconds.','F','F','1 energy','0']
    ].map(([id,name,classification,notes,key,fire,cost,damage])=>({id,name,classification,notes,preview:'Projectile',
        first:id==='spread'?first('spread'):{label:'Standard loadout'},makeModel:()=>projectile(id),
        fields:()=>[['Select',key],['Fire',fire],['Cost per use',cost],['Damage',damage]]}));
    const supplies=[
        ['energy','Energy Cells','Recovery','Restores energy for primary weapons and flares.','Energy','+32 (max 160)'],
        ['shields','Shield Boost','Recovery','Repairs the ship on contact.','Shields','+35 (max 160)'],
        ['missiles','Missile Pack','Ammunition','Loads four concussion missiles into the secondary rack.','Missiles','+4'],
        ['spread','Spread Cannon','Upgrade','Equips the spread cannon immediately. Use 1 and 2 to switch primary weapons.','Select','2'],
        ...['blue','yellow','red'].map(color=>[color,color[0].toUpperCase()+color.slice(1)+' Access Key','Access',
            'Opens matching '+color+' doors for the rest of the mine.','Score','100 points']),
        ['hostage','Stranded Miner','Rescue','Fly into the miner to bring them aboard your ship.','Score','400 points']
    ].map(([id,name,classification,notes,key,value])=>({id,name,classification,notes,first:first(id),
        preview:id==='hostage'?'Rescue model':'Pickup',makeModel:()=>pickup(id),fields:()=>[[key,value],['Collected by','Flying through it']]}));
    return {Robots:robots,Weapons:arms,Powerups:supplies,difficulty:names,edition:'Training mines'};
}
