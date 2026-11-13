// Procedural surface textures for the Orrery's seven worlds.
//
// This is the single source of the texture math. `scripts/bake-world-textures.mjs` runs it at
// authoring time and writes the images in `public/orrery/worlds/`, which the Orrery loads.
// Generating these in the browser blocked the first frame for several seconds, so the scene
// no longer calls this at runtime. After changing anything here, or a world's style or seed,
// run `pnpm run bake:worlds` and commit the regenerated images.
import * as THREE from "three";

export const worldTextureWidth = 768;
export const worldTextureHeight = 384;

/** Surface styles in orbit order. Must match `worldConfigs` in `app/orrery-scene.tsx` (checked by `check:orrery`). */
export const worldTextureStyles = ["ocean", "atlas", "lattice", "archive", "gas", "forge", "arcade"];

/** Seed used for the world at `index` in the scene's `worldConfigs`. */
export const worldTextureSeed = (index) => 40 + index * 31;

function seededNoise(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = seededNoise(x0, y0, seed);
  const b = seededNoise(x0 + 1, y0, seed);
  const c = seededNoise(x0, y0 + 1, seed);
  const d = seededNoise(x0 + 1, y0 + 1, seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sx), THREE.MathUtils.lerp(c, d, sx), sy);
}

function fractalNoise(x, y, seed) {
  let total = 0;
  let amplitude = 0.55;
  let frequency = 1;
  for (let octave = 0; octave < 5; octave += 1) {
    total += smoothNoise(x * frequency, y * frequency, seed + octave * 19) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total;
}

function sphericalNoise(u, v, longitudinalScale, latitudinalScale, seed) {
  const longitude = u * Math.PI * 2;
  const ringRadius = longitudinalScale / (Math.PI * 2);
  const ringX = Math.cos(longitude) * ringRadius;
  const ringY = Math.sin(longitude) * ringRadius;
  const latitude = v * latitudinalScale;
  const first = fractalNoise(ringX + 17.3, ringY + latitude + 29.1, seed);
  const second = fractalNoise(ringX * 1.17 - latitude + 41.7, ringY * 1.17 + 13.9, seed + 97);
  return (first + second) / 2;
}

function mixColor(a, b, amount) {
  return a.clone().lerp(b, THREE.MathUtils.clamp(amount, 0, 1));
}

/**
 * RGBA pixels (row-major, top row first) for one world's equirectangular surface.
 * @param {"ocean" | "atlas" | "lattice" | "archive" | "gas" | "forge" | "arcade"} style
 * @param {number} seed
 * @returns {Uint8ClampedArray}
 */
export function renderWorldTexturePixels(style, seed) {
  const width = worldTextureWidth;
  const height = worldTextureHeight;
  const data = new Uint8ClampedArray(width * height * 4);
  const palettes = {
    ocean: [new THREE.Color("#061827"), new THREE.Color("#17627a"), new THREE.Color("#a8d7c5")],
    atlas: [new THREE.Color("#152a2b"), new THREE.Color("#8a5132"), new THREE.Color("#d7b375")],
    lattice: [new THREE.Color("#0b2732"), new THREE.Color("#3e7d8a"), new THREE.Color("#d2eeea")],
    archive: [new THREE.Color("#17191a"), new THREE.Color("#746b59"), new THREE.Color("#e0d0ad")],
    gas: [new THREE.Color("#3a1724"), new THREE.Color("#ae4d4f"), new THREE.Color("#f2bb78")],
    forge: [new THREE.Color("#25182c"), new THREE.Color("#784b70"), new THREE.Color("#efa0d1")],
    arcade: [new THREE.Color("#0b211c"), new THREE.Color("#357548"), new THREE.Color("#c2f68a")],
  };
  const [dark, middle, light] = palettes[style];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      const lat = Math.abs(v - 0.5) * 2;
      const broad = sphericalNoise(u, v, 5.8, 4.1, seed);
      const detail = sphericalNoise(u, v, 18, 12, seed + 71);
      let value = broad * 0.72 + detail * 0.28;
      if (style === "gas") {
        const bands = Math.sin(v * 82 + broad * 11) * 0.18 + Math.sin(v * 29 - detail * 8) * 0.12;
        const stormX = Math.min(Math.abs(u - 0.72), 1 - Math.abs(u - 0.72));
        const storm = Math.exp(-(stormX * stormX * 850 + (v - 0.57) ** 2 * 230));
        value = 0.48 + bands + broad * 0.24 + storm * 0.32;
      } else if (style === "lattice") {
        const longitude = Math.pow(Math.abs(Math.cos(u * Math.PI * 18)), 24);
        const latitude = Math.pow(Math.abs(Math.cos(v * Math.PI * 12)), 26);
        const diagonal = Math.pow(Math.abs(Math.cos((u * 8 + v * 5) * Math.PI)), 30);
        const node = Math.pow(longitude * latitude, 0.55);
        value = Math.max(value * 0.6, longitude * 0.82, latitude * 0.72, diagonal * 0.5, node);
      } else if (style === "archive") {
        const folioBands = Math.pow(Math.abs(Math.sin(v * Math.PI * 7 + broad * 2.2)), 13);
        const baselines = Math.pow(Math.abs(Math.cos((v + detail * 0.012) * Math.PI * 31)), 34);
        const brokenText = Math.pow(Math.max(0, Math.sin(u * Math.PI * 18 + broad * 6.5)), 4);
        const strata = Math.pow(Math.abs(Math.sin((broad * 0.78 + detail * 0.22) * Math.PI * 10)), 28);
        value = broad * 0.42 + detail * 0.12 + folioBands * 0.2 + baselines * brokenText * 0.58 + strata * 0.18;
      } else if (style === "forge") {
        const crack = 1 - Math.min(1, Math.abs(detail - 0.5) * 9);
        const plate = 0.5 + 0.5 * Math.sin(u * Math.PI * 12 + broad * 7);
        const hotSeam = Math.pow(Math.max(0, crack), 3);
        value = broad * 0.52 + plate * 0.12 + hotSeam * 0.82;
      } else if (style === "arcade") {
        // Wrap the pixel map at longitude so the phosphor tiles meet at the seam.
        const column = Math.floor(u * 48) % 48;
        const row = Math.floor(v * 24);
        const tile = sphericalNoise(column / 48, row / 24, 9, 6, seed);
        const insetX = (u * 48) % 1;
        const insetY = (v * 24) % 1;
        const gutter = insetX < 0.12 || insetY < 0.12;
        value = gutter ? 0.16 : Math.round(tile * 4) / 4;
      } else if (style === "ocean") {
        const ice = Math.pow(lat, 8) * 0.42;
        value = broad * 0.68 + detail * 0.2 + ice;
      } else {
        value = broad * 0.76 + detail * 0.18;
      }
      const color = value < 0.48
        ? mixColor(dark, middle, value / 0.48)
        : mixColor(middle, light, (value - 0.48) / 0.52);
      const vignette = 0.84 + (1 - lat) * 0.16;
      const index = (y * width + x) * 4;
      data[index] = color.r * 255 * vignette;
      data[index + 1] = color.g * 255 * vignette;
      data[index + 2] = color.b * 255 * vignette;
      data[index + 3] = 255;
    }
  }
  for (let y = 0; y < height; y += 1) {
    const firstPixel = y * width * 4;
    const lastPixel = (y * width + width - 1) * 4;
    for (let channel = 0; channel < 4; channel += 1) data[lastPixel + channel] = data[firstPixel + channel];
  }
  return data;
}
