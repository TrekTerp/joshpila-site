import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
export function archiveYears(data) {
  const explicit = new Map(data.years.map(y => [y.year, y.status]));
  return [...new Set([...data.recipes.map(r => r.year), ...data.daySlots.map(s => s.year), ...explicit.keys()])].sort((a,b) => b-a).map(year => {
    const slots = data.daySlots.filter(s => s.year === year);
    const photos = new Set(slots.flatMap(s => s.photo_ids));
    const status = explicit.get(year) === 'backfill' ? 'Backfill' : slots.length ? 'Archive' : 'Upcoming';
    return {year, status, photographed: photos.size > 0, days: slots.length, photos: photos.size};
  });
}
export function readArchive() { return JSON.parse(readFileSync(new URL('../content/cocktails/archive.json', import.meta.url), 'utf8')); }
export function validateArchive(data, checkFiles = true) {
  for(const year of data.years) if(!Number.isInteger(year.year) || !['backfill','upcoming','archive'].includes(year.status)) throw Error('Invalid year metadata');
  for(const recipe of data.recipes) if(!Number.isInteger(recipe.year) || !/^[\w-]+$/.test(recipe.slug)) throw Error('Invalid recipe identity');
  const recipes = new Map(data.recipes.map(r => [r.slug,r]));
  const photos = new Map(data.photos.map(p => [p.id,p]));
  const variants = new Set(data.recipes.flatMap(r => r.specs.map((_,i) => `${r.slug}--v${i+1}`)));
  if(recipes.size !== data.recipes.length || photos.size !== data.photos.length) throw Error('Duplicate IDs');
  const days = new Set();
  for(const s of data.daySlots) {
    if(!Number.isInteger(s.year) || !Number.isInteger(s.day) || s.day<1 || s.day>24 || days.has(`${s.year}-${s.day}`)) throw Error('Invalid/duplicate day');
    days.add(`${s.year}-${s.day}`);
    if(!recipes.has(s.official_recipe_slug) || (s.actual_recipe_slug && !recipes.has(s.actual_recipe_slug))) throw Error('Missing recipe');
    if(s.actual_variant_id && !variants.has(s.actual_variant_id)) throw Error('Missing variant');
    for(const id of s.photo_ids) if(!photos.has(id)) throw Error('Missing photo');
  }
  for(const p of data.photos) {
    if(!/^\d{4}\/[\w.-]+\.jpg$/.test(p.file)) throw Error('Unsafe photo path');
    if(checkFiles && !existsSync(path.resolve('public/cocktails/photos',p.file))) throw Error(`Missing file ${p.file}`);
  }
  for(const r of data.recipes) if(r.source_url && !/^https?:\/\//.test(r.source_url)) throw Error('Invalid source URL');
  return {recipes:recipes.size, variants:variants.size, photos:photos.size, days:days.size};
}
