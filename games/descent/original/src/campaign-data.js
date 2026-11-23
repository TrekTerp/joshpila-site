// Load the unchanged DOS shareware archive or a pair selected from local storage.
const view = new URLSearchParams(location.search);
export const directLaunch = view.get('start') === '1';
export const selectedDifficulty = Math.max(0, Math.min(4,
    Number.parseInt(view.get('difficulty') ?? '1', 10) || 0));

async function readShareware() {
    const response = await fetch('./desc14sw.tar.gz');
    if (!response.ok) throw new Error('The bundled shareware download failed.');
    const raw = new Uint8Array(await response.arrayBuffer());
    const compressed = raw[0] === 0x1f && raw[1] === 0x8b;
    const bytes = compressed
        ? new Uint8Array(await new Response(
            new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))
        ).arrayBuffer())
        : raw;
    const ascii = new TextDecoder('ascii');
    const files = {};
    for (let offset = 0; offset + 512 <= bytes.length;) {
        const header = bytes.subarray(offset, offset + 512);
        if (!header[0]) break;
        const name = ascii.decode(header.subarray(0, 100)).split('\0')[0].split('/').pop().toLowerCase();
        const size = parseInt(ascii.decode(header.subarray(124, 136)).replace(/\0/g, '').trim(), 8);
        if (!Number.isFinite(size) || size < 0 || offset + 512 + size > bytes.length) {
            throw new Error('The bundled archive is incomplete.');
        }
        offset += 512;
        if (name === 'descent.hog' || name === 'descent.pig') {
            files[name.slice(-3)] = bytes.slice(offset, offset + size).buffer;
        }
        offset += Math.ceil(size / 512) * 512;
    }
    if (!files.hog || !files.pig) throw new Error('The mine or texture archive is missing.');
    return files;
}

function layoutOK(hog) {
    if (hog.byteLength < 20) return false;
    const data = new DataView(hog);
    if (data.getUint8(0) !== 68 || data.getUint8(1) !== 72 || data.getUint8(2) !== 70) return false;
    let p = 3;
    while (p + 17 <= hog.byteLength) {
        p += 17 + data.getUint32(p + 13, true);
        if (p > hog.byteLength) return false;
    }
    return p === hog.byteLength;
}

async function readLocalFiles() {
    const panel = document.getElementById('picker');
    const form = document.getElementById('files-form');
    const message = document.getElementById('file-message');
    panel.hidden = false;
    return new Promise(resolve => {
        form.onsubmit = async event => {
            event.preventDefault();
            const hog = form.elements.hog.files[0];
            const pig = form.elements.pig.files[0];
            if (!hog || !pig) return;
            const button = form.querySelector('button');
            button.disabled = true;
            try {
                if (!/\.hog$/i.test(hog.name) || !/\.pig$/i.test(pig.name)) {
                    throw new Error('Select the HOG in the first field and the PIG in the second.');
                }
                const [h, p] = await Promise.all([hog.arrayBuffer(), pig.arrayBuffer()]);
                if (!layoutOK(h)) throw new Error('The HOG archive is incomplete or invalid.');
                if (![2509799,2529454,5092871,4920305,5039735].includes(p.byteLength)) {
                    throw new Error('Select a DOS Descent 1.4/1.5 PIG or a DOS shareware PIG.');
                }
                panel.hidden = true;
                resolve({hog:h,pig:p});
            } catch (error) {
                message.value = error.message;
            } finally {
                button.disabled = false;
            }
        };
    });
}

export function loadCampaignFiles() {
    return view.get('data') === 'custom' ? readLocalFiles() : readShareware();
}
