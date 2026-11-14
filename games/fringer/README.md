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

One deterministic engine owns both visual styles. Graphics and animation do not consume gameplay randomness or alter state. Boards are constructed from reversible twists; tests reverse 3,000 seed/level combinations. Practice freezes pressure and grants unlimited turns. Leaving the tab pauses play. High scores and appearance are stored locally with storage failures handled gracefully.

New scoring: 25 per original knot, 100 per freed rope, plus a remaining-space bonus on level completion. User-added knots never award points or sparkles, preventing score farming. Levels, pressure timings, visuals and sounds are original to this remake.

This initial release covers the core game. Fire, repaint and original bonus-stage variations are not implemented. It is not a binary port, a replica of the original level set, or a claim of exact original scoring/timing. Classic is a Windows-inspired presentation of the same engine, not a pixel-identical copy.

## Research

Original game: Microsoft Entertainment Pack: The Puzzle Collection (1997), Fringer by Alexey Pajitnov and Vladimir Pokhilko.

Rules cross-check: [Pico Fringer developer's how-to-play and explanation of the original cursor rules](https://www.lexaloffle.com/bbs/?pid=picofringer-3), especially the developer's explanation of matching the top strand's angle, same-color exceptions, and the lowest legal cursor position. This implementation does not reuse that project's code or assets.

## Validation

Engine tests cover solvability, angle/color rules, blocked access, score farming, strand identity after lane collapse, sparkle awards, depleted bonuses, pressure ordering, immediate bottom loss, practice and terminal-state input handling, and determinism. Browser QA covers the three lessons, keyboard actions, on-screen controls, pause/resume, both looks, and the phone layout.

## Evolved art pack

The approved second sprite sheet is preserved at `art-source/evolved-pack-v1.png`. Run `python3 games/fringer/prepare-art.py` (Pillow + NumPy), then the normal build, to reproduce the sliced atlas, registration metadata, and turn icon. Preparation removes near-transparent color-key residue, normalizes rope ports, and reprojects the painted curved strands onto the engine’s cubic paths at all three supported lane spacings. Hardware uses cap/middle/cap drawing with repeating centers.

`src/evolved-art.js` reads the same engine state as Classic. It paints braided ropes, sockets, tassels, walnut supports, the brass moving comb, both selection frames, sparkles and release bursts. Selection frames sit behind the ropes; the over-strand gets a narrow occlusion edge so same-color crossings stay legible. The cached atlas is WebP; all pieces are static and motion honors reduced-motion preferences.

Run `node games/fringer/tests/art.test.cjs` to check art coverage, rendering invariance, and the retained Classic renderer hash.
