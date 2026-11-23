// Signed bitmap identities keep custom mission artwork intact.
const signs = new Map([
    ['misc058', [0, 1889808176]], ['misc050', [1, 2472260558]],
    ['misc041', [2, 444044152]], ['misc029', [3, 22794696]],
    ['misc033', [4, 2739361156]], ['misc036', [5, 2183972909]],
    ['metl023', [6, 2466485777]],
    ...[2893413844, 1247626405, 3785255415, 3493499072, 1271217696, 1009056093,
        1063388953].map((hash, frame) => ['door13#' + frame, [7 + frame, hash]])
]);
const registered = new Map();
let patches, loading;
const size = 256;

function paint(entry) {
    const src = entry.original.data, patch = patches[entry.tile], out = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let u = x, v = y;
        if (entry.rotation === 1) { u = size - 1 - y; v = x; }
        else if (entry.rotation === 2) { u = size - 1 - x; v = size - 1 - y; }
        else if (entry.rotation === 3) { u = y; v = size - 1 - x; }
        const a = (64 * (y >> 2) + (x >> 2)) * 4;
        const b = (v * size + u) * 4, d = (y * size + x) * 4;
        const ink = patch[b + 3] / 255;
        for (let k = 0; k < 3; k++) out[d+k] = src[a+k] + ink * (patch[b+k] - src[a+k]);
        out[d+3] = src[a+3];
    }
    return {width: size, height: size, data: out};
}
function select(texture, entry, evolved) {
    if (evolved && !patches) return;
    const image = evolved ? (entry.painted ??= paint(entry)) : entry.original;
    if (texture.image === image) return;
    texture.dispose();
    texture.image = image;
    texture.needsUpdate = true;
}
function update() {
    const evolved = document.body.dataset.mode === 'evolved';
    if (evolved && registered.size && !patches && !loading && typeof Image !== 'undefined') {
        loading = new Image();
        loading.onload = () => {
            if (loading.naturalWidth !== 1024 || loading.naturalHeight !== 1024) return;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d', {willReadFrequently:true});
            patches = Array.from({length:14}, (_, i) => {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(loading, i%4*size, (i>>2)*size, size, size, 0, 0, size, size);
                return ctx.getImageData(0, 0, size, size).data;
            });
            update();
        };
        loading.src = new URL('../art/mine-signs.webp', import.meta.url).href;
    }
    for (const [texture, entry] of registered) select(texture, entry, evolved);
}
if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(update).observe(document.body, {attributes:true, attributeFilter:['data-mode']});
}
export function registerMineSign(texture, name, pixels, rotation = 0) {
    const row = signs.get(name);
    if (!row || pixels?.length !== 4096 || texture.image.width !== 64 || texture.image.height !== 64) return;
    let hash = 2166136261;
    for (const byte of pixels) hash = Math.imul(hash ^ byte, 16777619);
    if ((hash >>> 0) !== row[1]) return;
    const entry = {tile:row[0], rotation, original:texture.image};
    registered.set(texture, entry);
    if (patches) select(texture, entry, document.body.dataset.mode === 'evolved');
    else if (!loading) update();
}
export function resetMineSigns() { registered.clear(); }
