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

Hardware, tassels, sockets, selection frames, and effects still use `assets/evolved-atlas-v1.webp`. The legacy curved rope sprites remain in that atlas for provenance but are no longer drawn by Evolved.

`src/rope-renderer.js` builds constant-width rope paths with radius-10 bends, vertical end collars, and the original 76, 71.25, and 63.33 lane spacings. Crossing height stays 34.65 units. Painted texture follows cumulative distance along each rope through successive knots. Same-color over-strands receive an occlusion edge matching the new geometry. Color changes and topology changes invalidate the cached rope layer; cursor movement, pressure animation, sparkles, and ordinary frames reuse it. The phase-specific crossing cache is bounded to 128 entries.

The shared painted texture source is `art-source/rope-material-v2.png`. Run `python3 games/fringer/prepare-rope.py` (Pillow + NumPy) to reproduce the five-color periodic material, then `python3 games/fringer/build.py`. The source texture is normalized to a 15-unit rope width, blended at the repeat boundary, and recolored without changing its twist pattern. All artwork remains in external asset files, never long encoded HTML lines.

Evolved uses a 720:760 canvas aspect ratio at desktop, tablet, and phone sizes. Classic rendering and gameplay code are unchanged. If either art image cannot load, the procedural fallback remains available.

Run `node games/fringer/tests/art.test.cjs` for the retained Classic renderer hash, rendering invariance, controlled-path endpoints and widths at all three gaps, cache invalidation, and texture phase through consecutive same-color crossings. Engine tests remain separate and unchanged.

Integration QA: actual keyboard and button actions, mobile controls, Classic/Evolved switching, 390/768-pixel responsive layouts, and dense 8/9/10-lane boards were checked in Chromium. The dense stress scenes had 42/48/54 knots; cached frame submission averaged 0.18-0.21ms, with 162-221ms initial uncached construction in the test browser. These timings are environment-specific, not a guarantee on every device. Browser measurements confirmed no horizontal overflow in the tested layouts and aspect-ratio error below 0.0003.
