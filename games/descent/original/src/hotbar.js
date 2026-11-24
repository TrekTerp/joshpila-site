import {Primary_weapon, Secondary_weapon, weaponReadiness} from './laser.js';
import {WEAPON_NAMES, SECONDARY_NAMES} from './weapon.js';

const bar = document.getElementById('weapon-hotbar');
const cells = [];
let energyLabel;
function build() {
    for (const [bank, names] of [WEAPON_NAMES, SECONDARY_NAMES].entries()) {
        const row = document.createElement('div');
        row.className = 'weapon-row';
        const label = document.createElement('b');
        label.textContent = bank ? 'Secondary' : 'Primary';
        row.append(label);
        if (!bank) {
            energyLabel = document.createElement('small');
            label.append(energyLabel);
        }
        names.forEach((name, slot) => {
            const cell = document.createElement('span');
            const key = document.createElement('b');
            const detail = document.createElement('small');
            key.textContent = String((bank * 5 + slot + 1) % 10);
            cell.title = name;
            cell.append(key, name.split(' ')[0], detail);
            row.append(cell);
            cells.push({cell, detail, name});
        });
        bar.append(row);
    }
}
export function showHotbar(flying) {
    if (bar && bar.hidden === flying) bar.hidden = !flying;
}
export function updateHotbar(energy, vulcan, ammo, level, quad) {
    if (!bar || bar.hidden || document.body.dataset.mode !== 'evolved') return;
    if (!cells.length) build();
    const energyText = Math.floor(energy) + ' energy';
    if (energyLabel.textContent !== energyText) energyLabel.textContent = energyText;
    for (let index = 0; index < cells.length; index++) {
        const secondary = index >= 5, slot = index % 5;
        const {cell, detail} = cells[index];
        const ready = weaponReadiness(secondary, slot);
        const selected = slot === (secondary ? Secondary_weapon : Primary_weapon);
        let caption;
        if (secondary) caption = ready === 0 && !ammo[slot] ? 'Locked' : ammo[slot] + ' left';
        else if (slot === 1) caption = ready === 0 ? (vulcan ? vulcan + ' stored' : 'Locked') : vulcan + ' rounds';
        else if (ready === 0) caption = 'Locked';
        else if (ready === 1) caption = 'Low energy';
        else caption = slot === 0 ? 'Lv ' + (level + 1) + (quad ? ' · Quad' : '') : 'Energy';
        const style = (selected ? 'selected ' : '') + ['locked', 'empty', 'ready'][ready];
        if (cell.className !== style) cell.className = style;
        if (detail.textContent !== caption) detail.textContent = caption;
    }
}
