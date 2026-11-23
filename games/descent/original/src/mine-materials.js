// The original bitmap name, dimensions and RGB content identify each material.
// Keep every collision surface, overlay, exit, monitor and door in the game data.
const materialTable = new Map([
    ['rock071', [0, 2416663515]],
    ['rock001', [1, 796416369]],
    ['ceil037', [2, 2260881995]],
    ['rock169', [3, 2741436637]],
    ['rock014', [4, 659199324]],
    ['rock218', [5, 2879010140]],
    ['rock160', [6, 2018466570]],
    ['ceil014', [7, 2860360525]],
    ['ceil015', [8, 1302503243]]
]);
const active = new Map();
let atlasLoad;
let swatches;

function wantsEnhanced() {
    return document.body.dataset.mode === 'evolved';
}

function originalHash(bytes) {
    let hash = 2166136261;
    for (let i = 0; i < bytes.length; i += 4) {
        if (bytes[i + 3] !== 255) return -1;
        hash = Math.imul(hash ^ bytes[i], 16777619);
        hash = Math.imul(hash ^ bytes[i + 1], 16777619);
        hash = Math.imul(hash ^ bytes[i + 2], 16777619);
    }
    return hash >>> 0;
}

function select(texture, image) {
    if (texture.image === image) return;
    // The two atlases have different resolutions. Reallocate the GPU texture
    // while retaining the shared DataTexture reference held by all mine faces.
    texture.dispose();
    texture.image = image;
    texture.needsUpdate = true;
}

function updateMode() {
    if (!active.size) return;
    if (wantsEnhanced() && !swatches) {
        loadSwatches();
        return;
    }
    for (const [texture, entry] of active) {
        select(texture, wantsEnhanced() ? swatches[entry.tile] : entry.original);
    }
}

function loadSwatches() {
    if (atlasLoad || typeof Image === 'undefined') return;
    const image = new Image();
    atlasLoad = image;
    image.onload = () => {
        const tileSize = 256;
        if (image.naturalWidth !== tileSize * 3 || image.naturalHeight !== tileSize * 3) return;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = tileSize;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        if (!ctx) return;
        const decoded = [];
        for (let tile = 0; tile < 9; tile++) {
            ctx.drawImage(image, tile % 3 * tileSize, Math.floor(tile / 3) * tileSize,
                tileSize, tileSize, 0, 0, tileSize, tileSize);
            const rgba = ctx.getImageData(0, 0, tileSize, tileSize).data;
            decoded.push({data: new Uint8Array(rgba.buffer), width: tileSize, height: tileSize});
        }
        swatches = decoded;
        updateMode();
    };
    image.src = new URL('../materials/mine-surfaces.webp', import.meta.url).href;
}

if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(updateMode).observe(document.body, {attributes: true, attributeFilter: ['data-mode']});
}

export function registerMineMaterial(texture, bitmapName) {
    const row = materialTable.get(bitmapName);
    if (!row || texture.image.width !== 64 || texture.image.height !== 64) return;
    const original = texture.image;
    if (originalHash(original.data) !== row[1]) return;
    active.set(texture, {tile: row[0], original});
    if (!wantsEnhanced()) return;
    if (swatches) select(texture, swatches[row[0]]);
    else loadSwatches();
}

export function keepAnimatedMaterial(texture) {
    const entry = active.get(texture);
    if (entry) {
        select(texture, entry.original);
        active.delete(texture);
    }
}

export function resetMineMaterials() { active.clear(); }
