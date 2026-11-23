// Remastered assets are used only by the world objects that own them. Both
// renderers sample these same RGBA textures. Original PIG maps stay available.
import * as THREE from 'three';

const armor = {
    url: new URL('../art/robot-liveries.webp', import.meta.url),
    columns: 7, rows: 3, size: 256,
    keys: [6, 8, 9, 10, 11, 12, 19, 20, 21, 31, 32, 35, 36, 37,
        48, 49, 51, 52, 53, 54, 55].map(n => 'rbot' + String(n).padStart(3, '0'))
};
const emitters = {
    url: new URL('../../art/robot-emissives.webp', import.meta.url),
    columns: 2, rows: 1, size: 256, keys: ['turbine', 'vent']
};
const supplies = {
    url: new URL('../../art/pickups.webp', import.meta.url),
    columns: 6, rows: 3, size: 192,
    keys: [0, 1, 2, 4, 5, 6, 3, 12, 13, 14, 17, 22, 10, 11, 18, 19, 23, 25]
};

function loadSheet(sheet) {
    if (sheet.loading || typeof Image === 'undefined') return;
    sheet.loading = true;
    const image = new Image();
    image.onload = () => {
        const {columns, rows, size} = sheet;
        if (image.naturalWidth !== columns * size || image.naturalHeight !== rows * size) return;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        if (!ctx) return;
        // Sprites use y-up UVs. Armor charts use original POF/PIG row order.
        if (sheet === supplies) ctx.setTransform(1, 0, 0, -1, 0, size);
        const maps = new Map();
        sheet.keys.forEach((key, i) => {
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(image, (i % columns) * size, Math.floor(i / columns) * size,
                size, size, 0, 0, size, size);
            const rgba = ctx.getImageData(0, 0, size, size).data;
            const texture = new THREE.DataTexture(new Uint8Array(rgba.buffer), size, size);
            texture.name = (sheet === supplies ? 'Evolved pickup ' : 'Evolved ') + key;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.generateMipmaps = true;
            if (sheet !== supplies) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            maps.set(key, texture);
        });
        sheet.maps = maps;
    };
    image.src = sheet.url.href;
}

function evolvedMap(sheet, key) {
    if (document.body.dataset.mode !== 'evolved') return null;
    if (!sheet.maps) loadSheet(sheet);
    return sheet.maps?.get(key) ?? null;
}

// Only static armor on cloned robot meshes is painted. Animated eyes and
// thrusters, mission texture overrides and every other scene object keep their maps.
function fitFlatEmitter(child, material, robotID) {
    if (robotID !== 1 && robotID !== 4) return;
    const geometry = child.geometry;
    const colors = geometry.attributes.color;
    // These two POF meshes use pure-red untextured rear plates. Their other
    // flat polygons (and all other robot types) keep the original palette.
    if (!colors || !colors.count) return;
    for (let i = 0; i < colors.count; ++i) {
        if (colors.getX(i) !== 1 || colors.getY(i) !== 0 || colors.getZ(i) !== 0) return;
    }
    if (!geometry.attributes.uv) {
        const p = geometry.attributes.position;
        geometry.computeBoundingBox();
        const {min, max} = geometry.boundingBox;
        if (max.x === min.x || max.y === min.y) return;
        const uv = new Float32Array(p.count * 2);
        for (let i = 0; i < p.count; ++i) {
            uv[2 * i] = (p.getX(i) - min.x) / (max.x - min.x);
            uv[2 * i + 1] = (max.y - p.getY(i)) / (max.y - min.y);
        }
        geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    material.robotEmitter = {key: robotID === 1 ? 'vent' : 'turbine', flat: true};
}

export function fitRobotArmor(group, pig, robotID) {
    group.traverse(child => {
        if (!child.isMesh || child.userData.isGlowMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            if (material.isPolyobjFlatMaterial) {
                fitFlatEmitter(child, material, robotID);
                continue;
            }
            if (!material.isPolyobjTextureMaterial || !material.map || material.userData.tmapOverride) continue;
            const index = material.userData.objectBitmapIndex;
            const name = pig.bitmaps[index]?.name;
            if (armor.keys.includes(name)) {
                material.robotArmor = {name, index, original: material.map};
            } else if (robotID === 19 && name?.startsWith('glow02#')) {
                material.robotEmitter = {key: 'vent', index, original: material.map,
                    color: material.color.clone()};
            }
        }
    });
}

export function selectRobotArmor(material) {
    const skin = material.robotArmor;
    if (!skin || material.userData.tmapOverride || material.userData.objectBitmapIndex !== skin.index) return;
    material.map = (!material.cloakMode && evolvedMap(armor, skin.name)) || skin.original;
}

// glow02's original five animation frames are solid colors. Read the active
// one after the native effect callback, so each painted grille pulses in phase.
export function selectRobotEmitter(material) {
    const emitter = material.robotEmitter;
    const map = !material.cloakMode && !material.userData.tmapOverride &&
        evolvedMap(emitters, emitter.key);
    if (emitter.flat) {
        const next = map || null;
        if (material.map !== next) {
            material.map = next;
            material.vertexColors = !next;
            material.needsUpdate = true;
        }
        return;
    }
    const index = material.userData.objectBitmapIndex;
    if (index !== emitter.index) {
        emitter.index = index;
        emitter.original = material.map;
    }
    if (map) {
        const rgba = emitter.original.image.data;
        const heat = rgba[0] / 255, warm = Math.min(1, (rgba[1] + rgba[2]) / 80);
        material.color.setRGB(heat, heat * (.78 + .22 * warm), heat * (.74 + .26 * warm),
            THREE.SRGBColorSpace);
        material.map = map;
    } else {
        material.color.copy(emitter.color);
        material.map = emitter.original;
    }
}

export function showPickupFrame(pw, classicFrame, frameCount) {
    const {sprite, obj} = pw;
    const texture = !pw.isHostage && evolvedMap(supplies, obj.id);
    if (texture) {
        const elapsed = pw.frameTime > 0 ? 1 - pw.frameTimer / pw.frameTime : 0;
        const phase = (pw.frameNum + elapsed) * Math.PI * 2 / frameCount;
        const turn = frameCount > 1 ? Math.sin(phase) : 0;
        sprite.scale.x = obj.size * 2 * (1 - .075 * turn * turn);
        sprite.material.rotation = .035 * turn;
        sprite.material.color.setScalar(1 - .10 * turn * turn);
        sprite.material.map = texture;
    } else {
        sprite.scale.x = obj.size * 2;
        sprite.material.rotation = 0;
        sprite.material.color.setScalar(1);
        if (classicFrame) sprite.material.map = classicFrame;
    }
}
