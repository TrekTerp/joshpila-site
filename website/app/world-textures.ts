import manifest from "../lib/orrery/world-textures.manifest.json";

// The version query changes whenever a texture is re-baked, so a cached copy is never stale.
const versions = new Map(manifest.worlds.map((world) => [world.style, world.fileSha256.slice(0, 10)]));

export const worldTextureUrl = (style: string) => `/orrery/worlds/${style}.webp?v=${versions.get(style) ?? "0"}`;

export const worldTextureUrls = manifest.worlds.map((world) => worldTextureUrl(world.style));
