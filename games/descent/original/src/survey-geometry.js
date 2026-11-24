// Build a snapshot from the same explored segments that campaign saves persist.
import {Segments, Vertices, Side_to_verts, Num_segments, Automap_visited, Walls, Objects} from './mglobal.js';
import {WALL_DOOR, WALL_BLASTABLE, WALL_CLOSED, WALL_OPEN, WALL_ILLUSION, WALL_ILLUSION_OFF, WallAnims, WCF_HIDDEN, KEY_BLUE, KEY_GOLD, KEY_RED} from './wall.js';
import {Triggers, TRIGGER_EXIT, TRIGGER_SECRET_EXIT} from './switch.js';
import {find_connect_side} from './gameseg.js';
import {OBJ_HOSTAGE, OBJ_POWERUP, OBJ_CNTRLCEN, OF_SHOULD_BE_DEAD, get_Highest_object_index} from './object.js';
import {POW_KEY_BLUE, POW_KEY_RED, POW_KEY_GOLD} from './collide.js';
import {SEGMENT_IS_FUELCEN, SEGMENT_IS_ROBOTMAKER} from './fuelcen.js';

const doorTypes = new Map([[KEY_BLUE,'blueDoor'], [KEY_GOLD,'goldDoor'], [KEY_RED,'redDoor']]);
const keyTypes = new Map([[POW_KEY_BLUE,'blueKey'], [POW_KEY_GOLD,'goldKey'], [POW_KEY_RED,'redKey']]);

function midpoint(points) {
    const center = {x:0,y:0,z:0};
    for (const p of points) { center.x += p.x; center.y += p.y; center.z += p.z; }
    center.x /= points.length; center.y /= points.length; center.z /= points.length;
    return center;
}

export function buildSurvey(shipSegment, startSegment) {
    const faces = [], markers = [], portals = new Set(), vertices = new Map(), edges = new Map();
    const seen = id => id >= 0 && id < Num_segments && (Automap_visited[id] === 1 || id === shipSegment);
    let count = 0;
    function point(id) {
        if (!vertices.has(id)) vertices.set(id,{x:Vertices[3*id],y:Vertices[3*id+1],z:-Vertices[3*id+2]});
        return vertices.get(id);
    }
    function mark(kind,pos) { markers.push({kind,pos}); }

    for (let id=0; id<Num_segments; id++) {
        if (!seen(id)) continue;
        count++;
        const seg = Segments[id];
        const corners = Array.from(seg.verts, point);
        const center = midpoint(corners);
        if (id === startSegment) mark('start',center);
        if (seg.special === SEGMENT_IS_FUELCEN) mark('fuel',center);
        if (seg.special === SEGMENT_IS_ROBOTMAKER) mark('factory',center);

        for (let side=0; side<6; side++) {
            const child = seg.children[side], wall = Walls[seg.sides[side].wall_num];
            if (child >= 0 && seen(child) && !wall) continue;
            const indices = Side_to_verts[side].map(i => seg.verts[i]);
            const points = indices.map(point);
            const pos = midpoint(points);
            const hidden = wall?.type === WALL_DOOR && (WallAnims[wall.clip_num]?.flags & WCF_HIDDEN) !== 0;
            const concealed = hidden && !seen(child);
            // A two-sided door has one location. Its key or exit trigger may live on the far wall.
            const back = child >= 0 && wall ? Segments[child].sides[find_connect_side(id,child)] : null;
            const other = back && Walls[back.wall_num];
            const flags = (Triggers[wall?.trigger]?.flags || 0) | (Triggers[other?.trigger]?.flags || 0);
            const type = doorTypes.get(wall?.keys) || doorTypes.get(other?.keys);
            const portal = child >= 0 ? Math.min(id,child)+'/'+Math.max(id,child) : id+':'+side;
            if (portals.has(portal)) continue;
            if (!concealed) {
                if (flags & TRIGGER_SECRET_EXIT) mark('secretExit',pos);
                else if (flags & TRIGGER_EXIT) mark('exit',pos);
                else if (child === -2) mark('outlet',pos);
                if (type && wall?.type === WALL_DOOR) mark(type,pos);
            }
            portals.add(portal);
            let style = 'wall';
            if (!concealed && child >= 0) {
                if (wall?.type === WALL_CLOSED) style = 'grate';
                else if (wall?.type === WALL_DOOR || wall?.type === WALL_BLASTABLE) style = 'door';
                else if (!wall || wall.type === WALL_OPEN || (wall.type === WALL_ILLUSION && (wall.flags & WALL_ILLUSION_OFF))) {
                    if (seen(child)) continue;
                    style = 'frontier';
                }
            }
            const [a,b,c] = points;
            const ux=b.x-a.x, uy=b.y-a.y, uz=b.z-a.z, vx=c.x-a.x, vy=c.y-a.y, vz=c.z-a.z;
            let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
            const sign = nx*(pos.x-center.x)+ny*(pos.y-center.y)+nz*(pos.z-center.z) < 0 ? -1 : 1;
            const norm = sign / (Math.hypot(nx,ny,nz) || 1);
            nx *= norm; ny *= norm; nz *= norm;
            const face = {points,pos,nx,ny,nz,style,rims:[],depth:0};
            for (let i=0; i<4; i++) {
                const a=indices[i], b=indices[(i+1)%4], key=Math.min(a,b)+':'+Math.max(a,b);
                let edge=edges.get(key);
                if (!edge) { edge={nx,ny,nz,ridge:false,uses:0}; edges.set(key,edge); }
                edge.uses++;
                if (Math.abs(edge.nx*nx+edge.ny*ny+edge.nz*nz)<0.97) edge.ridge=true;
                face.rims.push(edge);
            }
            faces.push(face);
        }
    }
    for (let i=0; i<=get_Highest_object_index(); i++) {
        const obj=Objects[i];
        if (!seen(obj.segnum) || (obj.flags & OF_SHOULD_BE_DEAD)) continue;
        const kind = obj.type === OBJ_HOSTAGE ? 'hostage' : obj.type === OBJ_CNTRLCEN ? 'reactor'
            : obj.type === OBJ_POWERUP ? keyTypes.get(obj.id) : null;
        if (kind) mark(kind,{x:obj.pos_x,y:obj.pos_y,z:-obj.pos_z});
    }
    return {count,points:[...vertices.values()],faces,markers};
}
