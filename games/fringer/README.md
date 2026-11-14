# Fringer remake

A new browser implementation for the Retro Disk Box, inspired by the 1997 Microsoft Entertainment Pack: The Puzzle Collection game.

- Live route: `/games/fringer/`.
- The playable page is `index.html`. Keep the `assets/` folder beside it for painted Evolved graphics; the procedural view remains available if art fails to load.
- Edit `src/engine.js`, `src/app.js`, `src/style.css`, and `src/page.html`.
- Build with `python3 games/fringer/build.py` from the repository root.
- Validate with `node games/fringer/tests/engine.test.cjs`.
- Generated HTML must retain readable lines below 2,048 characters. Never dump or read other games' encoded single-file bundles into model context.

## Rules and implementation

Adjacent pairs are worked from their lowest accessible position. The over-strand's direction must match the frame unless both strands share a color. An action unties a reachable knot or adds a twist, then reverses the frame direction. Sparkling knots grant a direction change without twisting. A completely freed rope disappears. The advancing bar pushes encountered knots downward; a knot reaching the lower boundary ends the run.

One deterministic engine owns both visual styles. Graphics and animation do not consume gameplay randomness or alter state. Boards are constructed from reversible twists; tests reverse 3,000 seed/stage combinations. Practice freezes pressure and grants unlimited turns; explicit fire/repaint practice still runs the effect timer. Leaving the tab pauses play. High scores and appearance are stored locally with storage failures handled gracefully.

Remake scoring: 25 per original knot, 100 per freed rope, plus a remaining-space bonus on screen completion. User-added knots never award points or sparkles. Fire removes incident knots without granting their sparkle bonuses. Bonus-screen awards use the original progression: 2,000 for Bonus 1, 3,000 for Bonus 2, and so on. Ordinary knot/rope scoring remains the remake's existing scoring.

### Special rules and progression

- Candle fire: connect a marked top strand to a marked bottom position. At the end of the red pass, a connected strand burns away, including its crossings. Other strand identities, crossing order, and over/under direction survive removal. An unconnected pass expires harmlessly.
- Paintbrush: Enter or the Repaint button queues a new whole-board color scheme. Colors change only at the end of the violet pass. The action is optional, can help or hurt, and does not alter knots, score, or the frame angle.
- Main game: nine levels with three screens each. After 9-3, single-screen bonus levels continue indefinitely. Bonus screens use new seeds, five colors, and increasing pressure/density within the board's limits. Start-level selection remains 1–9.
- Both styles include the same rules. `Try special rules` provides fire, repaint, and bonus practice without recording scores.

Availability and pacing are remake choices, not recovered original constants: fire starts at level 2, paint at level 3; first opportunity is after 14 active seconds; a special pass lasts 12 seconds, then a 24-second gap follows. Higher levels alternate fire and paint. The special pass temporarily replaces pressure, which resumes afterward. Original boards and precise sweep timing are not reproduced. Classic is a Windows-inspired presentation, not a pixel-identical port.

## Research

Original game: Microsoft Entertainment Pack: The Puzzle Collection (1997), Fringer by Alexey Pajitnov and Vladimir Pokhilko.

Rules cross-check: [Pico Fringer developer's how-to-play and explanation of the original cursor rules](https://www.lexaloffle.com/bbs/?pid=picofringer-3), especially the developer's explanation of matching the top strand's angle, same-color exceptions, and the lowest legal cursor position. This implementation does not reuse that project's code or assets.

Primary verification for this update: original English `EN/FRINGER.HLP` and dialog resources in `EN/FRINGER1.DLL`, extracted read-only from the [archived 1997 collection](https://archive.org/details/MEPTPC). Help topics `pop_candle`, `pop_reddots`, `Tips and Strategies`, `Change Level`, the scoring table image, and the brush/candle/completion tips establish delayed resolution, whole-scheme recoloring, nine three-screen levels, continuing bonus levels, and bonus completion awards. No original code or artwork is distributed here.

## Validation

Engine tests cover solvability, angle/color rules, blocked access, score farming, strand identity after lane collapse, sparkle awards, depleted bonuses, pressure ordering, immediate bottom loss, practice and terminal-state input handling, and determinism. They also cover 500 topology-preserving burns, marker relocation, delayed/optional repainting, frame-independent effect timing, 27-screen progression, endless bonus continuation and one-time bonus awards. Browser QA covers lessons, keyboard actions, on-screen controls, pause/resume, both looks, phone layout and special-rule practice.

## Evolved art pack

The approved second sprite sheet is preserved at `art-source/evolved-pack-v1.png`. Run `python3 games/fringer/prepare-art.py` (Pillow + NumPy), then the normal build, to reproduce the sliced atlas, registration metadata, and turn icon. Preparation removes near-transparent color-key residue, normalizes rope ports, and reprojects the painted curved strands onto the engine’s cubic paths at all three supported lane spacings. Hardware uses cap/middle/cap drawing with repeating centers.

`src/evolved-art.js` reads the same engine state as Classic. It paints braided ropes, sockets, tassels, walnut supports, the brass moving comb, both selection frames, sparkles and release bursts. Selection frames sit behind the ropes; the over-strand gets a narrow occlusion edge so same-color crossings stay legible. The cached atlas is WebP; all pieces are static and motion honors reduced-motion preferences.

Run `node games/fringer/tests/art.test.cjs` to check art coverage, rendering invariance, and the retained Classic renderer hash.
