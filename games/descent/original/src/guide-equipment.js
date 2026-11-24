import * as THREE from 'three';
import {Powerup_info,Vclips} from './bm.js';
import {Weapon_info,WEAPON_RENDER_POLYMODEL,WEAPON_RENDER_BLOB,WEAPON_RENDER_VCLIP,
    Primary_weapon_to_weapon_info,Secondary_weapon_to_weapon_info,WEAPON_NAMES,SECONDARY_NAMES,Secondary_ammo_max} from './weapon.js';
import {Polygon_models,buildModelMesh,polyobj_set_object_light} from './polyobj.js';
import {powerup_set_externals,buildSpriteTexture} from './powerup.js';
import {showPickupFrame} from './equipment-art.js';
import {config_get_key_binding_codes} from './config.js';

const boost=d=>3+3*(5-d);
const secondaryPickup=[10,18,17,20,21];
const primaryPickup=[3,13,14,15,16];
const primaryNotes=[
    'The ship starts with twin lasers. Laser pickups raise bolt damage through four levels. Quad Laser fires four bolts, each at 75% of its usual damage.',
    'A rapid-fire cannon with its own ammunition reserve. Ammo collected before finding the cannon stays aboard.',
    'Fires three bolts at once. Successive bursts alternate between horizontal and vertical spread.',
    'Fires paired plasma bolts using ship energy.',
    'Hold primary fire to charge and release to fire. Longer charges drain energy and can damage your own shields.'
];
const secondaryNotes=[
    'An unguided missile with a blast radius. Aim ahead of a moving robot.',
    'Tracks a target after launch. An obstruction can break the shot.',
    'Drops a mine behind the ship. Leave room to get clear of its blast.',
    'The initial blast releases homing projectiles. The damage figure covers the blast alone.',
    'A heavy missile with a wide blast radius. Give yourself room before firing.'
];
const pickups=[
    [0,'Extra Life','Recovery','Adds one reserve ship.','Reserve ships','+1'],
    [1,'Energy Boost','Recovery','Recharges the ship’s energy reserve on contact.','Energy gained',d=>'+'+boost(d),'Capacity','200'],
    [2,'Shield Boost','Recovery','Repairs the ship’s shields on contact.','Shields gained',d=>'+'+boost(d),'Capacity','200'],
    [3,'Laser Upgrade','Upgrade','Raises the level of your existing lasers. At maximum level a spare upgrade can replenish energy.','Upgrade','+1 level','Maximum','Level 4'],
    [12,'Quad Laser','Upgrade','Adds two laser bolts to each volley. Each of the four bolts deals 75% of its ordinary damage.','Applies to','Laser · 1','Activation','Automatic'],
    ...[[4,'Blue'],[5,'Red'],[6,'Yellow']].map(([id,color])=>[id,color+' Access Key','Access','Unlocks matching '+color.toLowerCase()+' doors for the rest of this mine. Fly up to the door to use it.','Door color',color,'Duration','Current mine']),
    [13,'Vulcan Cannon','Weapon pickup','Installs the cannon with 196 rounds. A duplicate can add 98 rounds.','Select','2','Ammo capacity','784'],
    [14,'Spreadfire Cannon','Weapon pickup','Installs the three-bolt spread cannon. A spare can replenish energy.','Select','3','Uses','Ship energy'],
    [15,'Plasma Cannon','Weapon pickup','Installs the paired plasma cannon. A spare can replenish energy.','Select','4','Uses','Ship energy'],
    [16,'Fusion Cannon','Weapon pickup','Installs the chargeable fusion cannon. A spare can replenish energy.','Select','5','Uses','Ship energy'],
    [22,'Vulcan Ammo','Ammunition','Adds rounds to the Vulcan reserve, even before you own the cannon.','Rounds','+98','Capacity','784'],
    ...[[10,0,1],[11,0,4],[18,1,1],[19,1,4],[17,2,4],[20,3,1],[21,4,1]].map(([id,slot,amount])=>[
        id,SECONDARY_NAMES[slot]+(amount===4?' Pack':''),'Ammunition','Loads the '+SECONDARY_NAMES[slot].toLowerCase()+' bank. Select '+((slot+6)%10)+' and use secondary fire.',
        'Added',String(amount),'Capacity',String(Secondary_ammo_max[slot])]),
    [23,'Cloaking Device','Temporary effect','Engages immediately. Robots lose their direct fix on the ship and can still fire at an estimated position.','Duration','30 seconds','Activation','Automatic'],
    [25,'Invulnerability','Temporary effect','Protects the ship from damage as soon as it is collected.','Duration','30 seconds','Activation','Automatic']
];
function makeSprite(frames,period,pickup) {
    const texture=buildSpriteTexture(frames[0]);
    if (!texture) return null;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
    sprite.scale.set(2,2,1);
    const pw={sprite,obj:{id:pickup,size:1},frameTime:period,frameTimer:0,frameNum:0};
    sprite.userData.animate=t=>{
        const n=Math.floor(t/period)%frames.length, frame=buildSpriteTexture(frames[n]);
        if (pickup===undefined) sprite.material.map=frame;
        else {
            pw.frameNum=n;pw.frameTimer=period-(t%period);
            showPickupFrame(pw,frame,frames.length);
        }
    };
    return sprite;
}
function clipFactory(clip,id) {
    const v=Vclips[clip];
    if (!v?.num_frames || !v.frames[0]) return null;
    return ()=>makeSprite(v.frames.slice(0,v.num_frames),v.frame_time>0?v.frame_time:.12,id);
}
export function equipmentCards(pig,palette,firstPickup) {
    powerup_set_externals({pigFile:pig,palette});
    const powers=pickups.map(([id,name,classification,notes,label,a,label2,b])=>({
        id,name,classification,notes,first:firstPickup.get(id),
        makeModel:clipFactory(Powerup_info[id]?.vclip_num,id),
        fields:d=>[[label,typeof a==='function'?a(d):a],...(label2?[[label2,b]]:[]),['Collected by','Flying through it']]
    }));
    const byId=new Map(powers.map(p=>[p.id,p]));
    const arms=[];
    function add(slot,bank,id,name,pickup) {
        const w=Weapon_info[id], primary=bank==='Primary', flare=bank==='Utility';
        const placements=[firstPickup.get(pickup)];
        if (!primary && slot===1) placements.push(firstPickup.get(19));
        const first=flare || slot===0?{label:'Standard loadout'}:placements.filter(Boolean).sort((a,b)=>a.order-b.order)[0];
        const key=flare?config_get_key_binding_codes('fire_flare').map(s=>s.replace(/^Key/,'')).join(' / '):String(primary?slot+1:(slot+6)%10);
        const unavailable=pig.isShareware && ((primary&&slot>=3)||(!primary&&!flare&&slot===4));
        let makeModel=null, preview='Pickup';
        if (!unavailable) {
            if (w.render_type===WEAPON_RENDER_POLYMODEL && Polygon_models[w.model_num]?.model_data) {
                preview='Projectile';makeModel=()=>{
                    const obj=buildModelMesh(Polygon_models[w.model_num],pig,palette);
                    if (obj) polyobj_set_object_light(obj,1,1,1);
                    return obj;
                };
            } else if (w.render_type===WEAPON_RENDER_VCLIP) { preview='Projectile';makeModel=clipFactory(w.weapon_vclip); }
            else if (w.render_type===WEAPON_RENDER_BLOB && w.bitmap>0) {
                preview='Projectile';makeModel=()=>makeSprite([w.bitmap],1);
            }
        }
        makeModel ||= byId.get(pickup)?.makeModel;
        const cost=d=>{
            if (primary&&slot===4) return '2 energy to charge, then continuous drain';
            if (primary&&slot===1) return '1 Vulcan round';
            if (!primary&&!flare) return '1 from rack';
            return Number(((w.energy_usage||1)*Math.min(1,(d+2)/4)).toFixed(3))+' energy';
        };
        const notes=flare?'A low-cost light source that sticks to mine walls. It can also damage a target on impact.':(primary?primaryNotes:secondaryNotes)[slot];
        arms.push({id,name,classification:bank,first,preview,makeModel,notes,unavailable,
            fields:d=>[['Select',flare?key:key+(primary?' or mouse wheel':' or Shift + wheel')],['Fire',flare?'Flare key':primary?'Left click / Z':'Right click / X'],
                ['Cost per use',unavailable?'Registered files':cost(d)],
                [primary&&slot===0?'Damage per bolt · levels 1–4':w.damage_radius?'Peak blast damage':'Base damage per projectile',
                    unavailable?'Registered files':primary&&slot===0?Weapon_info.slice(0,4).map(v=>v.strength[d]).join(' / '):w.strength[d]],
                ...(!primary&&!flare?[['Rack capacity',Secondary_ammo_max[slot]]]:[])]});
    }
    Primary_weapon_to_weapon_info.forEach((id,i)=>add(i,'Primary',id,WEAPON_NAMES[i],primaryPickup[i]));
    Secondary_weapon_to_weapon_info.forEach((id,i)=>add(i,'Secondary',id,SECONDARY_NAMES[i],secondaryPickup[i]));
    add(0,'Utility',9,'Flare',null);
    return {Weapons:arms,Powerups:powers};
}
