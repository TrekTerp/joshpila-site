/** Keep the published astronomy URLs working after separating landing and gallery. */
export function astronomyRedirect(href: string): string | null {
  const url = new URL(href);
  const path = url.pathname.replace(/\/index\.html$/, "/").replace(/\/?$/, "/");
  const galleryLink = url.searchParams.has("photo") || url.searchParams.has("view") ||
    ["#photo-viewer", "#lightbox", "#photo-grid", "#collection-title", "#timeline", "#night-solar-atlas"].includes(url.hash);
  let target: string;
  if (path === "/artifact/sky/photos/") target = "/astronomy/gallery/";
  else if (path === "/artifact/sky/") target = galleryLink ? "/astronomy/gallery/" : "/astronomy/";
  else if (path === "/astronomy/" && galleryLink) target = "/astronomy/gallery/";
  else return null;
  return target + url.search + url.hash;
}
