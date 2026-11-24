import {fitRobotArmor} from './equipment-art.js';
import {equipmentCards} from './guide-equipment.js';
import {loadCampaignFiles} from './campaign-data.js';
import {HogFile} from './hogfile.js';
import {PigFile,loadPalette} from './piggy.js';
import {bm_read_all,bm_build_shareware_texture_table,ObjBitmaps} from './bm.js';
import {Robot_info,N_robot_types} from './robot.js';
import {Weapon_info} from './weapon.js';
import {OBJ_ROBOT,OBJ_POWERUP,read_object} from './object.js';
import {Polygon_models,loadSharewareModels,buildAnimatedModelMesh,buildModelMesh,polyobj_set_object_bitmap_source,polyobj_set_object_light} from './polyobj.js';
import {mission_init,mission_get_level_name,mission_get_last_level,mission_compute_next_level} from './mission.js';

// Descent I robot IDs. Campaigns supply all geometry, weapon strengths and encounters.
const names = ['Medium Hulk','Medium Lifter','Spider Processing Robot','Class 1 Drone','Class 2 Drone',
    'Cloaked Driller','Cloaked Hulk','Class 2 Supervisor','Secondary Lifter','Heavy Driller',
    'Class 3 Gopher','Laser Platform Robot','Missile Platform Robot','Split Pod','Baby Spider',
    'Fusion Hulk','Super Hulk','Level 7 Boss','Cloaked Lifter','Class 1 Driller','Small Hulk',
    'Advanced Lifter','PTMC Defense Prototype','Final Boss'];
const weapons = new Map([[5,'Pulse rock cutter'],[8,'Concussion missile'],[10,'Argon laser'],[11,'Vulcan cannon'],
    [13,'Plasma cannon'],[14,'Fusion cannon'],[15,'Homing missile'],[16,'Proximity mine'],[17,'Smart missile'],
    [18,'Mega missile'],[21,'Homing missile'],[22,'Concussion missile'],[24,'Laser bolt'],
    [25,'Heavy argon laser'],[26,'Plasma cannon'],[27,'Mass driver']]);

// Read only the mission object and robot-center directories. Do not link these objects
// into the flight simulation or start a level to build an encyclopedia.
function readEncounters(file) {
    if (!file || file.length()<16 || file.readInt()!==0x504c564c) throw Error('Invalid mine header.');
    file.seek(12);
    const base=file.readInt();
    file.seek(base);
    if (file.readUShort()!==0x6705) throw Error('Invalid mine object directory.');
    const version=file.readUShort(), header=file.readInt();
    if (header<47 || base+header>file.length()) throw Error('Incomplete mine object directory.');
    file.seek(base+35);
    const offset=file.readInt(), count=file.readInt();
    const found=new Map(), supplies=new Set(), defaults=new Set();
    const record=(id,method)=>{
        if (id<0 || id>=N_robot_types) return;
        if (!found.has(id)) found.set(id,new Set());
        found.get(id).add(method);
    };
    if (count<0 || count>10000 || (count && (offset<0 || offset>=file.length()))) throw Error('Invalid mine object count.');
    file.seek(offset);
    for (let i=0;i<count;i++) {
        const obj=read_object(file,version);
        if (obj.type===OBJ_ROBOT) {
            record(obj.id,obj.ctype?.behavior===0x83?'mine-layer':'placed');
            if (!obj.contains_count) defaults.add(obj.id);
        }
        if (obj.type===OBJ_POWERUP) supplies.add(obj.id);
        if (obj.contains_type===OBJ_POWERUP && obj.contains_count>0) supplies.add(obj.contains_id);
        if (obj.contains_type===OBJ_ROBOT && obj.contains_count>0) { record(obj.contains_id,'carrier'); defaults.add(obj.contains_id); }
    }
    if (header>=119) {
        file.seek(base+107);
        const start=file.readInt(), n=file.readInt(), size=file.readInt();
        if (n && (start<0 || size<16 || start+n*size>file.length())) throw Error('Invalid robot-center directory.');
        for (let i=0;i<n;i++) {
            file.seek(start+i*size);
            const flags=file.readUInt();
            for (let id=0;id<N_robot_types;id++) if (flags & (1<<id)) {
                // Matcens give the Class 3 Gopher the same retreat behavior as its mine placements.
                record(id,id===10?'mine-layer':'generator');
                defaults.add(id);
            }
        }
    }
    // A destroyed carrier can release another robot even when the child has no placed object.
    for (const id of defaults) {
        const r=Robot_info[id];
        if (!r || !r.contains_prob || !r.contains_count) continue;
        if (r.contains_type===OBJ_POWERUP) supplies.add(r.contains_id);
        if (r.contains_type===OBJ_ROBOT && r.contains_id<N_robot_types) {
            record(r.contains_id,'carrier'); defaults.add(r.contains_id);
        }
    }
    file.seek(base+header);
    const mine=version>=14 ? file.readString(Math.min(45,file.length()-file.tell())).split(/[\r\n]/)[0].trim() : '';
    return {found,mine,supplies};
}

function dossier(id, first, methods, pig, palette) {
    const r=Robot_info[id], model=Polygon_models[r.model_num];
    const mounts=r.compiled?r.n_guns:model.n_guns;
    const melee=r.attack_type===1, bomber=methods.has('mine-layer') && methods.size===1;
    const unarmed=!melee && !bomber && !mounts;
    const weaponId=bomber?16:r.weapon_type, w=Weapon_info[weaponId];
    const blast=!melee && !unarmed && w?.damage_radius>0;
    const attack=melee?'Claw strike':unarmed?'Unarmed':weapons.get(weaponId)||(w?.homing_flag?'Homing projectile':'Energy bolt');
    const classification=r.boss_flag?'Boss':melee?'Melee':unarmed?'Support':bomber?'Minelayer':blast?'Missile platform':'Ranged';
    const notes=[];
    if (melee) notes.push('Closes to hull contact. Keep lateral thrust available when it approaches from behind.');
    else if (bomber) notes.push('Leaves proximity mines in its retreat path.');
    else if (unarmed) notes.push('Has no gun mount. Its behavior and any escort are the threat.');
    else if (w?.homing_flag) notes.push('Its missiles track your ship. A bend in the tunnel can break their approach.');
    else if (blast) notes.push('The blast can reach your hull when the projectile hits a nearby wall.');
    else if (id===3) notes.push('The twin rock cutters give this small scout a recognizable head-on silhouette.');
    else if (id===19 || id===5) notes.push('Its Vulcan burst can land several hits before you clear the line of fire.');
    else if (id===2) notes.push('Watch the wreck. This carrier can release Baby Spiders when destroyed.');
    else if (id===14) notes.push('Small enough to disappear beneath the cockpit while you track its carrier.');
    else if (id===4) notes.push('A welding laser gives this scout more reach than its industrial origins suggest.');
    else if (id===20) notes.push('Its compact body carries paired heavy lasers. Look for the gun barrels on either side.');
    else notes.push('Its firing interval changes with difficulty. Watch the muzzle as you cross an opening.');
    if (r.cloak_type) notes.push('The inspection view shows its hull with the cloak disengaged.');
    if (r.boss_flag) notes.push('Can cloak and teleport during an engagement.');
    if (methods.has('mine-layer')&&!bomber) notes.push('Some placements also lay proximity mines.');
    return {id,name:names[id] || r.name || 'Robot '+id, classification,first,attack,notes:notes.join(' '),
        damageLabel:melee?'Damage per strike':blast?'Peak blast damage':'Damage per shot',
        damage:d=>melee?d+1:unarmed?0:w?.strength[d], shields:r.strength,points:r.score_value,
        difficulty:['Trainee','Rookie','Hotshot','Ace','Insane'],
        makeModel:()=>{
            const group=model.n_models>1?buildAnimatedModelMesh(model,pig,palette):buildModelMesh(model,pig,palette);
            if (!group) throw Error('Model geometry is unavailable.');
            fitRobotArmor(group,pig,id);
            polyobj_set_object_light(group,1,1,1);
            // POF forward is converted to -Z by the polygon interpreter.
            return group;
        }};
}

export async function campaignCatalog() {
    const files=await loadCampaignFiles(), hog=new HogFile(),pig=new PigFile();
    if (!hog.init(files.hog) || !pig.init(files.pig)) throw Error('Could not open these campaign archives.');
    const firstFile=pig.isShareware?'level01.sdl':'level01.rdl';
    if (!hog.findFile(firstFile)) throw Error('The HOG and PIG must be from the same edition.');
    const palette=loadPalette(hog);
    if (!palette) throw Error('The campaign palette is missing.');
    if (pig.isShareware) {
        bm_build_shareware_texture_table(hog,pig);
        loadSharewareModels(hog);
    } else {
        if (!pig.hamData) throw Error('This registered PIG has no embedded model data.');
        bm_read_all(pig.hamData,pig);
    }
    pig.pageInAll();
    polyobj_set_object_bitmap_source(ObjBitmaps,pig,palette);
    mission_init(hog,pig.isShareware);
    const first=new Map(), firstPickup=new Map(), methods=new Map();
    let order=0;
    function visit(num) {
        const {found,mine,supplies}=readEncounters(hog.findFile(mission_get_level_name(num)));
        const location={label:num<0?'Secret '+(-num):'Level '+num,mine,order:order++};
        for (const id of supplies) if (!firstPickup.has(id)) firstPickup.set(id,location);
        for (const [id,modes] of found) {
            if (!first.has(id)) first.set(id,location);
            if (!methods.has(id)) methods.set(id,new Set());
            for (const mode of modes) methods.get(id).add(mode);
        }
    }
    for (let i=1;i<=mission_get_last_level();i++) {
        visit(i);
        const secret=mission_compute_next_level(i,true);
        if (secret<0) visit(secret);
    }
    // Include unused designs only when the selected PIG actually contains the mesh.
    const cards=[];
    for (let i=0;i<N_robot_types;i++) {
        const m=Polygon_models[Robot_info[i].model_num];
        if (m?.model_data) cards.push(dossier(i,first.get(i),methods.get(i)||new Set(),pig,palette));
    }
    const levelRank=label=>label?.order??Infinity;
    cards.sort((a,b)=>levelRank(a.first)-levelRank(b.first)||a.name.localeCompare(b.name));
    if (!cards.length) throw Error('No robot models were found in these files.');
    return {Robots:cards,...equipmentCards(pig,palette,firstPickup),difficulty:cards[0].difficulty,edition:pig.isShareware?'Shareware':'Registered campaign'};
}
