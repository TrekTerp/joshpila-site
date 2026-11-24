import {config_get_key_binding_codes} from './config.js';
import {manualSlots, listSaves, sharewareKey, slotName, describeSave} from './campaign-saves.js';
import {WEAPON_NAMES, SECONDARY_NAMES} from './weapon.js';

const dialog = () => document.getElementById('pilot-panel');
function element(tag, text, cls) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (cls) node.className = cls;
    return node;
}
function button(text, action) {
    const node = element('button', text);
    node.type = 'button';
    node.onclick = action;
    return node;
}
function openPanel(title) {
    // A dialog's close event is queued. Give each screen its own event target when
    // the player closes one panel and immediately opens another.
    const previous = dialog();
    const box = previous.cloneNode(false);
    previous.replaceWith(box);
    const heading = element('h2', title);
    heading.id = 'pilot-title';
    const content = element('div');
    const status = element('p', '', 'pilot-status');
    status.setAttribute('role', 'status');
    const back = button('Back', () => box.close());
    box.replaceChildren(heading, content, status, back);
    box.returnValue = '';
    box.showModal();
    return {box, content, status};
}
function keyName(code) {
    return code.replace(/^Key|^Digit/, '').replace('Arrow', 'Arrow ').replace(/(Left|Right)$/, ' $1').replace(/ +/g,' ').trim();
}
export function boundKeys(action) {
    return config_get_key_binding_codes(action).map(keyName).join(' / ');
}
function addRows(content, title, rows) {
    content.append(element('h3', title));
    const dl = element('dl');
    for (const [label, keys] of rows) dl.append(element('dt', label), element('dd', keys));
    content.append(dl);
}
export function showPilotControls({training = false, hangar = false, configure} = {}) {
    const {box, content} = openPanel('Pilot controls');
    function render(drills) {
        content.replaceChildren();
        if (hangar) {
            const tabs = element('div', '', 'pilot-tabs');
            for (const [label, value] of [['Original campaign', false], ['Training mines', true]]) {
                const tab = button(label, () => render(value));
                tab.setAttribute('aria-pressed', String(drills === value));
                tabs.append(tab);
            }
            content.append(tabs);
        }
        if (drills) {
            addRows(content, 'Training flight', [
                ['Forward / reverse', 'W / S or ↑ / ↓'], ['Slide left / right', 'A / D or ← / →'], ['Rise / sink', 'Space / Shift or C'],
                ['Roll left / right', 'Q / E'], ['Aim', 'Mouse or I J K L'], ['Fire primary', 'Left click, Z or Ctrl'],
                ['Fire missile', 'Right click or X'], ['Laser / Spread cannon', '1 / 2'], ['Flare', 'F'],
                ['Map', 'M / Tab'], ['Rotate / zoom map', 'Drag or arrows / wheel or + and −'],
                ['Graphics', 'F8 or V'], ['Pause', 'Esc or P']
            ]);
            return;
        }
        addRows(content, 'Flight', [
            ['Capture mouse / aim', 'Click the mine / mouse or I J K L'],
            ...[['Forward','thrust_forward'],['Reverse','thrust_backward'],['Slide left','thrust_left'],
                ['Slide right','thrust_right'],['Rise','thrust_up'],['Sink','thrust_down'],['Roll left','roll_left'],
                ['Roll right','roll_right'],['Cruise faster','cruise_faster'],['Cruise slower','cruise_slower'],
                ['Reset cruise','reset_cruise']].map(([name, action]) => [name, boundKeys(action)])
        ]);
        addRows(content, 'Weapons', [
            ['Fire primary / secondary', 'Left click or Z / right click or X'],
            ['Cycle usable primary', 'Wheel'], ['Cycle usable secondary', 'Shift + wheel'],
            ['Fire flare', boundKeys('fire_flare')],
            ...WEAPON_NAMES.map((name, i) => [name, String(i + 1)]),
            ...SECONDARY_NAMES.map((name, i) => [name, String((i + 6) % 10)])
        ]);
        addRows(content, 'Navigation & cockpit', [
            ['Automap', boundKeys('toggle_automap')], ['Orbit map', 'Drag or arrow keys'],
            ['Zoom map', 'Wheel, + / − or W / S'], ['Pan map', 'Shift-drag, right-drag or A / D and Space / Shift'],
            ['Fit explored mine / center ship', 'F / Home'], ['Cycle landmarks', '[ / ]'],
            ['Rear view', boundKeys('toggle_rear_view')], ['Cockpit layout', boundKeys('toggle_cockpit')],
            ['Graphics', 'F8'], ['Pause / save / load', boundKeys('pause_game')]
        ]);
        if (configure) content.prepend(button('Configure flight keys', () => { box.close(); configure(); }));
    }
    render(training);
}
export function showSavePanel({mode, campaign, save, load}) {
    const writing = mode === 'save';
    const {box, content, status} = openPanel(writing ? 'Save campaign' : 'Load campaign');
    const closed = new Promise(resolve => box.addEventListener('close', () => resolve(box.returnValue === 'loaded'), {once:true}));
    let busy = false;
    const guard = event => { if (busy) event.preventDefault(); };
    box.addEventListener('cancel', guard);
    box.addEventListener('close', () => box.removeEventListener('cancel', guard), {once:true});
    async function perform(slot, record) {
        if (busy) return;
        busy = true;
        box.querySelectorAll('button').forEach(b => b.disabled = true);
        status.textContent = writing ? 'Saving…' : 'Loading…';
        try {
            if (writing) {
                if (!await save(slot, record?.savedAt ?? null)) throw Error('Save failed. Check available browser storage and try again.');
                await draw();
                status.textContent = 'Saved to ' + slotName(slot) + '.';
            } else {
                if (!await load(record)) throw Error('Could not restore this save. Your saved copy is still available.');
                box.close('loaded');
            }
        } catch (error) {
            try { await draw(); } catch { content.replaceChildren(); }
            status.textContent = error.message;
        } finally {
            busy = false;
            box.lastElementChild.disabled = false;
        }
    }
    function ask(slot, record) {
        content.replaceChildren(element('p', 'Replace ' + slotName(slot) + '?'), element('p', describeSave(record)),
            button('Keep existing save', draw), button('Replace save', () => perform(slot, record)));
        content.querySelector('button').focus();
        status.textContent = '';
    }
    async function draw() {
        const all = await listSaves(campaign);
        content.replaceChildren();
        const entries = campaign ? [...manualSlots, 'auto', ...(all.some(r => r.slot === 'legacy') ? ['legacy'] : [])]
            .map(slot => [slot, all.find(r => r.slot === slot)]) : all.map(r => [r.slot, r]);
        for (const [slot, record] of entries) {
            const row = button('', () => writing && record ? ask(slot, record) : perform(slot, record));
            row.className = 'pilot-slot';
            const edition = !campaign ? (record.campaign === sharewareKey ? 'Shareware · ' : 'Registered · ') : '';
            row.append(element('strong', edition + slotName(slot)),
                element('small', record ? describeSave(record) : 'Empty'));
            row.disabled = writing ? !manualSlots.includes(slot) : !record;
            content.append(row);
        }
        if (!entries.length) content.append(element('p', 'No campaign saves in this browser yet.'));
    }
    status.textContent = 'Reading saves…';
    draw().then(() => {
        status.textContent = '';
        if (box.open) content.querySelector('button:enabled')?.focus();
    }).catch(() => { status.textContent = 'Campaign storage could not be opened in this browser.'; });
    return closed;
}
