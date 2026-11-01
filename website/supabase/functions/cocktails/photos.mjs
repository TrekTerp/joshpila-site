// Shared display and replacement authorization rules. Replacements apply only to their card.
function visible(photos, allPhotos, scope) {
  const replaced = new Set(allPhotos.filter(p => p.replacement_scope === scope).map(p => p.replaces_photo_id));
  return [...new Map(photos.filter(p => p && !replaced.has(p.id)).map(p => [p.id, p])).values()];
}

export function photosForVariant(data, variantId) {
  const recipe = data.recipes.find(r => r.specs.some((_, i) => `${r.slug}--v${i + 1}` === variantId));
  if (!recipe) return [];
  const byId = new Map(data.photos.map(p => [p.id, p]));
  const exact = data.daySlots.find(s => s.actual_variant_id === variantId);
  const siblingConfirmed = data.daySlots.some(s => s.actual_variant_id && s.actual_variant_id !== variantId && s.actual_variant_id.startsWith(recipe.slug + '--v'));
  const slots = exact ? [exact] : siblingConfirmed ? [] : data.daySlots.filter(s => s.actual_recipe_slug === recipe.slug);
  const base = slots.flatMap(s => s.photo_ids.map(id => byId.get(id))).filter(p => p && p.source !== 'owner-upload');
  const uploaded = data.photos.filter(p => p.source === 'owner-upload' && p.variant_id === variantId);
  const dayPhotos = slots.flatMap(s => s.photo_ids.map(id => byId.get(id))).filter(p => p?.source === 'owner-upload' && !p.variant_id);
  return visible([...uploaded, ...dayPhotos, ...base], data.photos, variantId).filter(p => p.role !== 'prep' && p.role !== 'duplicate');
}

export function photosForDay(data, year, day) {
  const slot = data.daySlots.find(s => s.year === year && s.day === day);
  const byId = new Map(data.photos.map(p => [p.id, p]));
  return visible((slot?.photo_ids || []).map(id => byId.get(id)), data.photos, `day:${year}:${day}`).filter(p => p.role !== 'prep' && p.role !== 'duplicate');
}
