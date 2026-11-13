// Bakes the Orrery's seven world textures to public/orrery/worlds/ and records what was baked in
// lib/orrery/world-textures.manifest.json. Run with `pnpm run bake:worlds` after changing
// lib/orrery/world-texture.mjs or a world's style or seed, then commit the results.
//
// Each world is written as lossy WebP unless lossless WebP is smaller (the tiled "arcade" surface).
// The manifest stores a hash of the exact source pixels so `check:orrery` can tell when the
// committed images no longer match the texture math.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import {
  renderWorldTexturePixels,
  worldTextureHeight,
  worldTextureSeed,
  worldTextureStyles,
  worldTextureWidth,
} from "../lib/orrery/world-texture.mjs";

const lossyQuality = 90;
const outputDirectory = new URL("../public/orrery/worlds/", import.meta.url);
mkdirSync(outputDirectory, { recursive: true });

const worlds = [];
for (const [index, style] of worldTextureStyles.entries()) {
  const seed = worldTextureSeed(index);
  const pixels = renderWorldTexturePixels(style, seed);
  const source = () => sharp(Buffer.from(pixels.buffer), { raw: { width: worldTextureWidth, height: worldTextureHeight, channels: 4 } }).removeAlpha();
  const lossy = await source().webp({ quality: lossyQuality, effort: 6 }).toBuffer();
  const lossless = await source().webp({ lossless: true, effort: 6 }).toBuffer();
  const useLossless = lossless.length <= lossy.length;
  const file = useLossless ? lossless : lossy;
  writeFileSync(new URL(`${style}.webp`, outputDirectory), file);
  worlds.push({
    style,
    seed,
    file: `${style}.webp`,
    encoding: useLossless ? "webp-lossless" : `webp-q${lossyQuality}`,
    bytes: file.length,
    pixelsSha256: createHash("sha256").update(pixels).digest("hex"),
    fileSha256: createHash("sha256").update(file).digest("hex"),
  });
  console.log(`${style}: ${(file.length / 1024).toFixed(1)} KB (${useLossless ? "lossless" : `quality ${lossyQuality}`})`);
}

const manifest = { width: worldTextureWidth, height: worldTextureHeight, worlds };
writeFileSync(new URL("../lib/orrery/world-textures.manifest.json", import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Total: ${(worlds.reduce((sum, world) => sum + world.bytes, 0) / 1024).toFixed(1)} KB across ${worlds.length} worlds.`);
