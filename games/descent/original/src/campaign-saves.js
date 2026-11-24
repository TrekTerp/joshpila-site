// Each snapshot and its lightweight hangar listing commit in the same transaction.
export const sharewareKey = 'descent_savegame';
export const manualSlots = ['1', '2', '3'];
const legacyPattern = /^(?:descent_savegame|descent_registered_\d+)$/;
const campaignPattern = /^(?:descent_savegame|descent_registered_\d+(?:\.[a-f0-9]{32})?)$/;
function legacyKey(key) { return key.split('.')[0]; }
export function campaignKey(shareware, hogSize) {
    return shareware ? sharewareKey : 'descent_registered_' + hogSize;
}
export async function identifyArchives(shareware, hog, pig) {
    const key = campaignKey(shareware, hog.byteLength);
    if (shareware || !globalThis.crypto?.subtle) return key;
    const hashes = await Promise.all([hog, pig].map(buffer => crypto.subtle.digest('SHA-256', buffer)));
    const signature = hashes.map(hash => Array.from(new Uint8Array(hash, 0, 8),
        byte => byte.toString(16).padStart(2, '0')).join('')).join('');
    return key + '.' + signature;
}
export function matchesArchives(expected, actual) {
    return expected === actual || (legacyPattern.test(expected) && expected === legacyKey(actual));
}
export function slotName(slot) {
    if (slot === 'auto') return 'Level-entry autosave';
    if (slot === 'legacy') return 'Previous single-slot save';
    return 'Slot ' + slot;
}
export function describeSave(record) {
    const level = record.level < 0 ? 'Secret level ' + -record.level : 'Level ' + record.level;
    const score = Number(record.score || 0).toLocaleString();
    const date = record.savedAt ? new Date(record.savedAt).toLocaleString(undefined, {
        dateStyle: 'medium', timeStyle: 'short'
    }) : 'Date unavailable';
    return [level, record.mine, score + ' pts', date].filter(Boolean).join(' · ');
}
let connection;
function openDatabase() {
    if (!connection) {
        connection = new Promise((resolve, reject) => {
            const req = indexedDB.open('descent-campaign-saves', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('records', {keyPath: ['campaign', 'slot']});
                req.result.createObjectStore('states');
            };
            req.onsuccess = () => {
                req.result.onversionchange = () => { req.result.close(); connection = null; };
                resolve(req.result);
            };
            req.onerror = () => reject(req.error);
        }).catch(error => { connection = null; throw error; });
    }
    return connection;
}
function result(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
function legacyState(key) {
    try {
        const state = JSON.parse(localStorage.getItem(key));
        return validSave(state) ? state : null;
    } catch { return null; }
}
function validSave(state) {
    return state && [1, 2].includes(state.version) && Number.isInteger(state.level) && state.level !== 0 &&
        Array.isArray(state.secondaryAmmo) && state.keys;
}
function legacyRecords(campaign) {
    const keys = [];
    try {
        if (campaign) keys.push(legacyKey(campaign));
        else for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    } catch { return []; }
    return keys.filter(key => legacyPattern.test(key)).flatMap(key => {
        const state = legacyState(key);
        return state ? [{campaign: key, slot: 'legacy', level: state.level, score: state.score,
            mine: state.mine || '', savedAt: 0}] : [];
    });
}
export async function listSaves(campaign) {
    const legacy = legacyRecords(campaign);
    let records;
    try {
        const db = await openDatabase();
        records = await result(db.transaction('records').objectStore('records').getAll());
    } catch (error) {
        if (legacy.length) return legacy;
        throw error;
    }
    return records.filter(r => !campaign || r.campaign === campaign).concat(legacy)
        .sort((a, b) => {
            const firstMine = r => r.slot === 'auto' && r.level === 1;
            return Number(firstMine(a)) - Number(firstMine(b)) || b.savedAt - a.savedAt;
        });
}
export async function readSave(campaign, slot) {
    if (!campaignPattern.test(campaign)) return null;
    if (slot === 'legacy') return legacyState(legacyKey(campaign));
    const db = await openDatabase();
    const state = await result(db.transaction('states').objectStore('states').get([campaign, slot]));
    return validSave(state) ? state : null;
}
export async function writeSave(campaign, slot, state, mine, expectedTime) {
    if (!campaignPattern.test(campaign) || ![...manualSlots, 'auto'].includes(slot) || !validSave(state)) {
        throw new Error('Invalid campaign save.');
    }
    const db = await openDatabase();
    const tx = db.transaction(['records', 'states'], 'readwrite');
    const records = tx.objectStore('records');
    let conflict;
    const store = () => {
        const record = {campaign, slot, level: state.level, score: state.score, mine, savedAt: Date.now()};
        records.put(record);
        tx.objectStore('states').put(state, [campaign, slot]);
    };
    // Starting a fresh run should never displace a previous campaign on the hangar's Continue button.
    if (slot === 'auto' && state.level === 1) {
        const check = records.count(IDBKeyRange.bound([campaign, ''], [campaign, '\uffff']));
        check.onsuccess = () => { if (!check.result && !legacyState(legacyKey(campaign))) store(); };
    } else if (slot !== 'auto' && expectedTime !== undefined) {
        const check = records.get([campaign, slot]);
        check.onsuccess = () => {
            if ((check.result?.savedAt ?? null) === expectedTime) store();
            else {
                conflict = new Error('This slot changed in another tab. Review its updated progress and try again.');
                conflict.name = 'SlotChanged';
                tx.abort();
            }
        };
    } else store();
    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onabort = () => reject(conflict || tx.error || new Error('Save was interrupted.'));
    });
}
