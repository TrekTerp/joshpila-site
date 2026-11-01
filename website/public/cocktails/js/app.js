// ============================================================
// Advent of Cocktails — app logic.
//
// Reads window.RECIPES / window.PHOTOS / window.DAY_SLOTS /
// window.UMBRELLA_INGREDIENTS (set by data/data.js).
//
// Key structural point: RECIPES is one entry per *calendar day*
// (144 of them), but each day can carry several published specs
// (e.g. Cloister has 4, Eggnog riffs has 3 named riffs). The
// finder's actual unit of search is one *spec*, not one day --
// so at load time every day's specs are flattened into VARIANTS,
// and the finder/search/ingredient-filter all operate on that
// flat list. The calendar view stays day-based (that's genuinely
// what a calendar cell is), but even there, opening a day shows
// one spec's own detail plus small links to jump to its siblings
// -- never a merged view of several different drinks at once.
// ============================================================
window.cocktailReady = (async function () {
  "use strict";
  const {photosForVariant:selectVariantPhotos,photosForDay:selectDayPhotos}=await import("./photo-selection.js");

  const {apiFetch}=await import('./backend.js');
  try {
    const response=await apiFetch('archive',{cache:'no-store'});
    if(!response.ok) throw Error();
    const saved=await response.json();
    Object.assign(window,{RECIPES:saved.recipes,PHOTOS:saved.photos,DAY_SLOTS:saved.daySlots,UMBRELLA_INGREDIENTS:saved.umbrellaIngredients,ARCHIVE_YEARS:saved.archiveYears});
  } catch {
    const notice=document.createElement('p');notice.className='callout';notice.textContent='Saved updates are temporarily unavailable. Showing the bundled archive; reload to try again.';document.querySelector('main').prepend(notice);
  }
  const embedded = new URLSearchParams(location.search).get("embed") === "cabinet";
  const RECIPES = window.RECIPES || [];
  const PHOTOS = window.PHOTOS || [];
  const DAY_SLOTS = window.DAY_SLOTS || [];

  const recipeBySlug = new Map(RECIPES.map((r) => [r.slug, r]));
  const photoById = new Map(PHOTOS.map((p) => [p.id, p]));

  function primaryPhotoForIds(ids) {
    const list = ids.map((id) => photoById.get(id)).filter(Boolean);
    return list.find((p) => p.role === "primary") || list.find((p) => p.role === "mocktail") || null;
  }

  function photoData() { return {recipes:RECIPES,photos:PHOTOS,daySlots:DAY_SLOTS}; }
  function photosForVariant(variant) { return selectVariantPhotos(photoData(),variant.id); }

  // ---------------- flatten specs into first-class "variants" ----------------

  const VARIANTS = [];
  RECIPES.forEach((r) => {
    r.specs.forEach((spec, i) => {
      VARIANTS.push({
        id: r.slug + "--v" + (i + 1),
        name: spec.name,
        fields: spec.fields,
        ingredients: spec.ingredients || [],
        year: r.year,
        day: r.day_of_origin,
        date: r.date,
        day_name: r.name,
        day_slug: r.slug,
        source_label: r.source_label,
        source_url: r.source_url,
        is_first: i === 0,
      });
    });
  });

  const variantById = new Map(VARIANTS.map((v) => [v.id, v]));
  const variantsByDaySlug = new Map();
  VARIANTS.forEach((v) => {
    if (!variantsByDaySlug.has(v.day_slug)) variantsByDaySlug.set(v.day_slug, []);
    variantsByDaySlug.get(v.day_slug).push(v);
  });

  function siblingsOf(variant) {
    return (variantsByDaySlug.get(variant.day_slug) || []).filter((v) => v.id !== variant.id);
  }

  function variantHeading(v) {
    // Single-spec days: just the drink's real name ("Negroni"). Multi-spec
    // days: the day's name plus this specific spec's own name, since the
    // spec name alone ("Standard", "Educated Barfly") often isn't a full
    // drink identity on its own.
    return siblingsOf(v).length === 0 ? v.day_name : v.day_name + " — " + v.name;
  }

  function primarySpiritFor(v) {
    const leaf = v.ingredients.find((i) => i.category === "Spirits" && !i.umbrella);
    if (leaf) return leaf.name;
    const umbrella = v.ingredients.find((i) => i.category === "Spirits");
    if (umbrella) return umbrella.name;
    const r = recipeBySlug.get(v.day_slug);
    return r ? r.base_spirit : "";
  }

  // ---------------- tab switching ----------------

  let currentView = "backstory";
  let restoring = false;
  function remember(extra = {}) {
    if (restoring) return;
    const url = new URL(location.href);
    url.search = "";
    if (embedded) url.searchParams.set("embed", "cabinet");
    url.searchParams.set("view", currentView);
    if (currentView === "calendar") url.searchParams.set("year", String(currentYear));
    Object.entries(extra).forEach(([key,value]) => url.searchParams.set(key,String(value)));
    if(url.href !== location.href) history[embedded ? "replaceState" : "pushState"](null,"",url);
    document.querySelector(".cabinet-return").href = "/study/cabinet?year=" + currentYear;
    if (embedded && currentView === "calendar") window.parent.postMessage({type:"cocktail-year-changed",year:currentYear},location.origin);
  }
  const tabButtons = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");

  function showView(name) {
    currentView = name;
    views.forEach((v) => {
      v.hidden = v.dataset.view !== name;
    });
    tabButtons.forEach((b) => {
      b.setAttribute("aria-current", b.dataset.view === name ? "page" : "false");
    });
    if (name === "calendar" && !calendarInitialized) initCalendar();
    if (name === "finder" && !finderInitialized) initFinder();
    remember();
  }

  tabButtons.forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.view));
  });

  // ---------------- calendar view ----------------

  let calendarInitialized = false;
  const yearRecords = window.ARCHIVE_YEARS;
  const YEARS = yearRecords.map(y => y.year).sort((a,b) => a-b);
  const BACKFILL_YEARS = new Set(yearRecords.filter(y => y.status === "Backfill").map(y => y.year));
  let currentYear = YEARS[YEARS.length - 1];

  function initCalendar() {
    calendarInitialized = true;
    const tabWrap = document.querySelector(".year-tabs");
    YEARS.forEach((y) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "year-tab";
      btn.dataset.year = String(y);
      btn.setAttribute("aria-pressed", String(y === currentYear));
      btn.innerHTML = String(y) + (BACKFILL_YEARS.has(y) ? '<span class="backfill-dot" title="Backfill year — no photos yet"></span>' : "");
      btn.addEventListener("click", () => {
        currentYear = y;
        tabWrap.querySelectorAll(".year-tab").forEach((t) => t.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        renderCalendarGrid();
        remember();
      });
      tabWrap.appendChild(btn);
    });
    renderCalendarGrid();
  }

  function renderCalendarGrid() {
    const grid = document.getElementById("calendar-grid");
    const note = document.getElementById("backfill-note");
    const yearInfo = yearRecords.find(y => y.year === currentYear);
    note.hidden = yearInfo.status === "Archive";
    note.textContent = yearInfo.status === "Upcoming"
      ? `Advent ${currentYear} is waiting for its first entries. New days will appear here as they are added.`
      : "An earlier December to revisit. Recipes are available; my photographs are still being filled in.";
    document.querySelectorAll(".year-tab").forEach(t => t.setAttribute("aria-pressed",String(Number(t.dataset.year) === currentYear)));
    grid.innerHTML = "";

    const slots = DAY_SLOTS.filter((s) => s.year === currentYear).sort((a, b) => a.day - b.day);
    document.getElementById("collection-title").textContent = "December " + currentYear;
    document.getElementById("collection-count").textContent = slots.length ? slots.length + " days · " + slots.filter(s => s.photo_ids.length).length + " photographed" : "A new chapter";

    if (!slots.length) {
      const empty = document.createElement("p");
      empty.className = "archive-empty";
      empty.textContent = "The glass is ready. The drinks are still to come.";
      grid.appendChild(empty);
    }
    slots.forEach((slot) => {
      const official = recipeBySlug.get(slot.official_recipe_slug);
      const actual = slot.actual_recipe_slug ? recipeBySlug.get(slot.actual_recipe_slug) : official;
      const displayName = slot.actual_recipe_name || (actual ? actual.name : official ? official.name : "?");
      const isSub = !!(slot.actual_recipe_slug && slot.actual_recipe_slug !== slot.official_recipe_slug) || !!slot.actual_recipe_name;
      const photo = primaryPhotoForIds(slot.photo_ids);

      const li = document.createElement("li");
      li.setAttribute("role", "listitem");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day-card";
      btn.dataset.day = String(slot.day).padStart(2,"0");
      btn.setAttribute("aria-label", "Day " + slot.day + ": " + displayName + (isSub ? ", substituted" : ""));

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      if (photo) {
        const img = document.createElement("img");
        img.src = photo.url || "photos/" + photo.file;
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);
      } else {
        thumb.classList.add("unphotographed");thumb.innerHTML = '<span class="empty-glass" aria-hidden="true"><svg viewBox="0 0 64 72" width="42" height="52" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M9 10h46c0 17-9 24-23 24S9 27 9 10ZM32 34v26M19 61h26M12 15h40"/></svg></span><span>Awaiting a photograph</span>';
      }

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML =
        '<div class="day-num">Day ' + slot.day + "</div>" +
        '<div class="day-name">' + escapeHtml(displayName) + "</div>" +
        (isSub ? '<span class="badge sub">substituted</span>' : "");

      btn.appendChild(thumb);
      btn.appendChild(meta);
      btn.addEventListener("click", () => openDaySlotDetail(slot));
      li.appendChild(btn);
      grid.appendChild(li);
    });
  }

  // ---------------- recipe finder ----------------

  let finderInitialized = false;
  const selectedIngredients = new Set();
  let matchMode = "any";
  let searchTerm = "";

  function initFinder() {
    finderInitialized = true;
    const umbrellas = new Set(window.UMBRELLA_INGREDIENTS || []);

    // Build category -> unique ingredient names *from the variants*, not
    // the day-level records -- this is what makes each checkbox reflect
    // one actual spec's real ingredients instead of a whole day's mixed
    // bag. Umbrella (broad family) terms sort first per category.
    const categories = new Map();
    VARIANTS.forEach((v) => {
      v.ingredients.forEach((ing) => {
        if (!categories.has(ing.category)) categories.set(ing.category, new Set());
        categories.get(ing.category).add(ing.name);
      });
    });

    const wrap = document.getElementById("ingredient-groups");
    categories.forEach((namesSet, cat) => {
      const all = Array.from(namesSet);
      const broad = all.filter((n) => umbrellas.has(n)).sort();
      const specific = all.filter((n) => !umbrellas.has(n)).sort();
      const orderedNames = broad.concat(specific);

      const group = document.createElement("details");
      group.className = "ingredient-group";
      const summary = document.createElement("summary");
      summary.textContent = cat + " (" + orderedNames.length + ")";
      summary.dataset.base = summary.textContent;
      group.appendChild(summary);

      orderedNames.forEach((name, i) => {
        if (i === broad.length && broad.length > 0 && specific.length > 0) {
          const hr = document.createElement("hr");
          hr.className = "ingredient-divider";
          group.appendChild(hr);
        }
        const label = document.createElement("label");
        if (umbrellas.has(name)) label.className = "umbrella-label";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = name;
        cb.addEventListener("change", () => {
          if (cb.checked) selectedIngredients.add(name);
          else selectedIngredients.delete(name);
          updateGroupSummaries();
          renderFinderResults();
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(" " + name));
        group.appendChild(label);
      });
      wrap.appendChild(group);
    });

    document.getElementById("finder-search").addEventListener("input", (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderFinderResults();
    });

    document.querySelectorAll('input[name="match-mode"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        matchMode = e.target.value;
        renderFinderResults();
      });
    });

    document.getElementById("clear-filters").addEventListener("click", () => {
      selectedIngredients.clear();
      searchTerm = "";
      document.getElementById("finder-search").value = "";
      wrap.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = false));
      updateGroupSummaries();
      renderFinderResults();
    });

    renderFinderResults();
  }

  function updateGroupSummaries() {
    document.getElementById("ingredient-selection-count").textContent = selectedIngredients.size ? selectedIngredients.size + " selected" : "";
    document.querySelectorAll(".ingredient-group").forEach((group) => {
      const summary = group.querySelector("summary");
      const checked = group.querySelectorAll("input[type=checkbox]:checked").length;
      summary.textContent = summary.dataset.base + (checked ? " — " + checked + " selected" : "");
    });
  }

  function renderFinderResults() {
    // Search and filter over VARIANTS (individual specs), not over the
    // 144 calendar days -- so "snoopy" finds "Snoopy Noggy Nog" by its
    // own name, and an ingredient filter matches that one spec's actual
    // ingredients rather than everything published that day.
    let results = VARIANTS;

    if (searchTerm) {
      results = results.filter(
        (v) => v.name.toLowerCase().includes(searchTerm) || v.day_name.toLowerCase().includes(searchTerm)
      );
    }

    if (selectedIngredients.size > 0) {
      const sel = Array.from(selectedIngredients);
      results = results.filter((v) => {
        const names = new Set(v.ingredients.map((i) => i.name));
        return matchMode === "all" ? sel.every((s) => names.has(s)) : sel.some((s) => names.has(s));
      });
    }

    results = results.slice().sort((a, b) => a.year - b.year || a.day - b.day || a.id.localeCompare(b.id));

    const countEl = document.getElementById("finder-count");
    countEl.textContent = results.length + (results.length === 1 ? " recipe" : " recipes");

    const list = document.getElementById("finder-list");
    list.innerHTML = "";
    if (!results.length) { const empty=document.createElement("li"); empty.className="finder-empty"; empty.textContent="No recipes match. Try another name or clear an ingredient."; list.append(empty); }
    results.forEach((v) => {
      const photos = photosForVariant(v);
      const thumbPhoto = photos.find((p) => p.role === "primary") || photos[0] || null;

      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recipe-card";

      const thumb = document.createElement("div");
      thumb.className = "thumb-sm";
      thumb.setAttribute("aria-hidden","true");
      if (thumbPhoto) {
        const img = document.createElement("img");
        img.src = thumbPhoto.url || "photos/" + thumbPhoto.file;
        img.alt = "";
        img.loading = "lazy";
        thumb.appendChild(img);
      }

      const info = document.createElement("div");
      info.innerHTML =
        '<div class="rc-name">' + escapeHtml(variantHeading(v)) + "</div>" +
        '<div class="rc-meta">' + v.year + " · Day " + v.day + " · " + escapeHtml(primarySpiritFor(v)) + "</div>";

      btn.appendChild(thumb);
      btn.appendChild(info);
      btn.addEventListener("click", () => openVariantDetail(v));
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // ---------------- shared detail dialog ----------------

  const dialog = document.getElementById("detail-dialog");
  let activeDetail = null;
  document.getElementById("detail-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { if(!restoring) remember(); });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close(); // click on backdrop area
  });

  function variantFieldsHtml(variant) {
    if (!variant || !variant.fields.length) return "";
    const fields = variant.fields.map((f) => "<dt>" + escapeHtml(f.label) + "</dt><dd>" + escapeHtml(f.value) + "</dd>").join("");
    return '<dl class="spec-fields">' + fields + "</dl>";
  }

  function siblingsHtml(variant) {
    // The "small links to jump between variants" -- deliberately minor:
    // plain inline buttons, not another whole card layout.
    const sibs = siblingsOf(variant);
    if (!sibs.length) return "";
    return (
      '<div class="variant-siblings"><span class="vs-label">Other specs from this day:</span> ' +
      sibs.map((s) => '<button type="button" class="vs-link" data-variant-id="' + s.id + '">' + escapeHtml(s.name) + "</button>").join(" ") +
      "</div>"
    );
  }

  function wireSiblingLinks() {
    document.querySelectorAll(".vs-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = VARIANTS.find((x) => x.id === btn.dataset.variantId);
        if (v) openVariantDetail(v);
      });
    });
  }

  function sourceCiteHtml(withSource) {
    // Small, source-agnostic citation -- not every future recipe will come
    // from Reddit, so this just shows whatever label/link the data has.
    if (!withSource || !withSource.source_label) return "";
    const label = escapeHtml(withSource.source_label);
    const inner = withSource.source_url
      ? '<a href="' + escapeHtml(withSource.source_url) + '" target="_blank" rel="noopener">' + label + "</a>"
      : label;
    return '<p class="source-cite">' + inner + "</p>";
  }

  function photoGalleryHtml(photoList) {
    const shown = photoList.filter((p) => p.role !== "prep" && p.role !== "duplicate");
    if (shown.length === 0) {
      return '<div class="no-photo">No photo for this one yet.</div>';
    }
    return (
      '<div class="detail-photos">' +
      shown
        .map((p) => {
          const cap = p.role !== "primary" ? ' title="' + escapeHtml(p.role) + '"' : "";
          return '<figure data-photo-id="' + escapeHtml(p.id) + '"><img src="' + escapeHtml(p.url || 'photos/' + p.file) + '" alt="Cocktail photograph"' + cap + '>' +
            (["probable","unconfirmed"].includes(p.confidence) ? '<figcaption>Photo match: ' + escapeHtml(p.confidence) + '</figcaption>' : '') + (p.source === 'owner-upload' ? '<figcaption>'+escapeHtml(p.variant_id ? (variantById.get(p.variant_id)?.name || 'Recorded variant') : 'Day photo; exact variant not recorded')+(p.notes?' · '+escapeHtml(p.notes):'')+'</figcaption>' : '') + '</figure>';
        })
        .join("") +
      "</div>"
    );
  }

  function openVariantDetail(variant) {
    activeDetail = {year:variant.year,day:variant.day,variantId:variant.id,label:variantHeading(variant),kind:'variant'};
    const photos = photosForVariant(variant);
    document.getElementById("detail-content").innerHTML =
      "<h2>" + escapeHtml(variantHeading(variant)) + "</h2>" +
      '<p class="detail-meta">' + variant.year + " · Day " + variant.day + " (" + variant.date + ")</p>" +
      '<div id="detail-gallery">' + photoGalleryHtml(photos) + '</div><div id="detail-photo-upload"></div>' +
      variantFieldsHtml(variant) +
      siblingsHtml(variant) +
      sourceCiteHtml(variant);
    wireSiblingLinks();
    document.dispatchEvent(new CustomEvent('cocktail-detail-open'));
    if (!dialog.open) dialog.showModal();
    remember({recipe: variant.id});
  }

  function openDaySlotDetail(slot) {
    // Entry point from the calendar. Shows the substitution context (what
    // was officially scheduled vs. what was actually made) plus the same
    // per-spec body as the finder. If we know exactly which spec was made,
    // that variant is shown with its own exclusive photo(s); otherwise this
    // falls back to the day's own photo(s) directly -- we're already
    // anchored to one specific calendar day here, so there's no ambiguity
    // about which day's photos to show, only which spec they best match.
    const official = recipeBySlug.get(slot.official_recipe_slug);
    const actual = slot.actual_recipe_slug ? recipeBySlug.get(slot.actual_recipe_slug) : official;
    const displayName = slot.actual_recipe_name || (actual ? actual.name : official ? official.name : "?");
    const isSub = !!(slot.actual_recipe_slug && slot.actual_recipe_slug !== slot.official_recipe_slug) || !!slot.actual_recipe_name;
    const unrecordedSubstitution = !!slot.actual_recipe_name && !slot.actual_recipe_slug;
    const detailRecipe = unrecordedSubstitution ? null : (actual || official);
    const dayVariants = detailRecipe ? variantsByDaySlug.get(detailRecipe.slug) || [] : [];
    const latestVariantPhoto = slot.photo_ids.map(id => photoById.get(id)).find(p => p?.source === "owner-upload" && variantById.get(p.variant_id)?.day_slug === detailRecipe?.slug);
    const confirmedVariant = latestVariantPhoto ? variantById.get(latestVariantPhoto.variant_id) : slot.actual_variant_id ? variantById.get(slot.actual_variant_id) : null;
    const shownVariant = confirmedVariant || dayVariants[0] || null;
    const photos = shownVariant ? photosForVariant(shownVariant) : selectDayPhotos(photoData(),slot.year,slot.day);
    activeDetail = {year:slot.year,day:slot.day,variantId:shownVariant?.id || '',label:shownVariant ? variantHeading(shownVariant) : displayName,kind:'day'};

    let html = "<h2>" + escapeHtml(displayName) + "</h2>";
    html += '<p class="detail-meta">' + slot.year + " · Day " + slot.day + "</p>";

    if (isSub && official) {
      html +=
        '<p class="detail-meta">Official Day ' + slot.day + " recipe was <strong>" + escapeHtml(official.name) + "</strong>. " +
        (slot.substitution_reason ? escapeHtml(slot.substitution_reason) : "Substituted.") +
        "</p>";
    }

    if(dayVariants.length > 1 && shownVariant) html += '<p class="detail-meta">Recipe: ' + escapeHtml(shownVariant.name) + '</p>';
    html += '<div id="detail-gallery">' + photoGalleryHtml(photos) + '</div><div id="detail-photo-upload"></div>';

    if (shownVariant) {
      html += variantFieldsHtml(shownVariant);
      html += siblingsHtml(shownVariant);
    }

    if (unrecordedSubstitution) {
      html += '<p>The exact recipe for this substitution has not been recorded.</p>';
      const officialVariant = (variantsByDaySlug.get(official?.slug) || [])[0];
      if (officialVariant) html += '<p>Scheduled recipe: <button type="button" class="vs-link" data-variant-id="' + escapeHtml(officialVariant.id) + '">' + escapeHtml(official.name) + '</button></p>';
    }
    html += sourceCiteHtml(detailRecipe);

    document.getElementById("detail-content").innerHTML = html;
    wireSiblingLinks();
    document.dispatchEvent(new CustomEvent('cocktail-detail-open'));
    if (!dialog.open) dialog.showModal();
    remember({year:slot.year, day:slot.day});
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const journalPhotos=document.getElementById("journal-photos");
  [2022,2023,2025].forEach(year => {
    const slot=DAY_SLOTS.find(s=>s.year===year && s.photo_ids.length);
    const photo=slot && primaryPhotoForIds(slot.photo_ids);
    if(photo){const img=new Image();img.src=photo.url || "photos/"+photo.file;img.alt="";img.loading="lazy";journalPhotos.append(img);}
  });
  document.getElementById("archive-recipe-count").textContent = RECIPES.length;
  document.getElementById("archive-photo-count").textContent = PHOTOS.length;

  if (embedded) document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.open && !document.getElementById("archive-editor")?.open) {
      event.preventDefault();
      window.parent.postMessage({type:"cocktail-panel-close"}, location.origin);
    }
  });

  // ---------------- init ----------------
  function restoreLocation() {
    restoring = true;
    const params = new URLSearchParams(location.search);
    const year = Number(params.get("year"));
    currentYear = YEARS.includes(year) ? year : YEARS[YEARS.length - 1];
    const view = params.get("view");
    showView(["backstory","calendar","finder"].includes(view) ? view : "backstory");
    if(calendarInitialized) renderCalendarGrid();
    const variant = variantById.get(params.get("recipe"));
    const slot = DAY_SLOTS.find(s => s.year === currentYear && s.day === Number(params.get("day")));
    if(variant) openVariantDetail(variant);
    else if(slot) openDaySlotDetail(slot);
    else if(dialog.open) dialog.close();
    document.querySelector(".cabinet-return").href = "/study/cabinet?year=" + currentYear;
    restoring = false;
  }
  window.addEventListener("popstate", restoreLocation);
  restoreLocation();
  function updatePhotos(saved) {
    // Keep the open card and its form in place while refreshing shared photo indexes.
    PHOTOS.splice(0, PHOTOS.length, ...saved.photos);
    DAY_SLOTS.forEach(slot => {
      const fresh=saved.daySlots.find(s=>s.year===slot.year && s.day===slot.day);
      if(fresh) slot.photo_ids=fresh.photo_ids;
    });
    photoById.clear();PHOTOS.forEach(p=>photoById.set(p.id,p));
    if(activeDetail && dialog.open){
      const variant=variantById.get(activeDetail.variantId);
      const slot=DAY_SLOTS.find(s=>s.year===activeDetail.year && s.day===activeDetail.day);
      const photos=variant ? photosForVariant(variant) : selectDayPhotos(photoData(),slot?.year,slot?.day);
      document.getElementById('detail-gallery').innerHTML=photoGalleryHtml(photos);
    }
    if(calendarInitialized) renderCalendarGrid();
    if(finderInitialized) renderFinderResults();
    document.getElementById('archive-photo-count').textContent=PHOTOS.length;
  }
  return {recipes:RECIPES,photos:PHOTOS,daySlots:DAY_SLOTS,getDetail:()=>activeDetail,updatePhotos};
})();
