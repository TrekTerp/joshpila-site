const AppRoutes = (() => {
  const files = { 'magic_squares_construction.html': 'learn', 'magic_squares_lab.html': 'lab',
    'magic_squares_glossary.html': 'glossary', 'magic_squares_bibliography.html': 'sources' };
  const views = ['learn', 'lab', 'glossary', 'sources'];
  const decode = text => { try { return decodeURIComponent(text); } catch { return text; } };
  const format = route => '#/' + route.view + (route.anchor ? '/' + encodeURIComponent(route.anchor) : '');
  function parse(hash, anchors = {}) {
    const text = hash.replace(/^#/, '');
    if (text.startsWith('/')) {
      const [, view, ...rest] = text.split('/');
      return { view: views.includes(view) ? view : 'learn', anchor: decode(rest.join('/')) };
    }
    const anchor = decode(text);
    return { view: anchors[anchor] ?? 'learn', anchor };
  }
  function target(raw, current) {
    if (!raw || /^(data|blob|mailto|javascript):/i.test(raw)) return null;
    if (raw.startsWith('#/')) return parse(raw);
    if (raw.startsWith('#')) return { view: current, anchor: decode(raw.slice(1)) };
    let url; try { url = new URL(raw, 'https://lab.invalid/'); } catch { return null; }
    if (url.origin !== 'https://lab.invalid') return null;
    const name = url.pathname.split('/').at(-1);
    if (name === 'index.html' || name === 'magic_squares_combined.html') return parse(url.hash);
    return files[name] ? { view: files[name], anchor: decode(url.hash.slice(1)) } : null;
  }
  return { files, views, decode, format, parse, target };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AppRoutes;
if (typeof document !== 'undefined') (() => {
  const originalHTML = '<!doctype html>\n' + document.documentElement.outerHTML;
  const payload = JSON.parse(document.getElementById('lab-package').textContent,
    (_key, value) => value && typeof value === 'object' && Object.hasOwn(value, '$labText')
      ? value.$labText.join('') : value);
  const entries = new Map();
  const assetURLs = new Map();
  const host = document.getElementById('app-views');
  const loading = document.getElementById('app-loading');
  const names = { learn: 'Learn', lab: 'Magic Squares Lab', glossary: 'Glossary', sources: 'Sources' };
  let active, current, returnLesson;

  function assetURL(id) {
    if (!assetURLs.has(id)) {
      const item = payload.assets[id];
      if (location.protocol === 'file:') {
        assetURLs.set(id, 'data:' + item.type + ';base64,' + item.data);
        return assetURLs.get(id);
      }
      const binary = atob(item.data);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      assetURLs.set(id, URL.createObjectURL(new Blob([bytes], { type: item.type })));
    }
    return assetURLs.get(id);
  }
  const hydrate = text => text.replace(/__LAB_ASSET_([a-f0-9]+)__/g, (_, id) => assetURL(id));
  document.querySelectorAll('[data-lab-art]').forEach(img => { img.src = assetURL(img.dataset.labArt); });
  function write(route, replace = false) {
    const hash = AppRoutes.format(route);
    if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
  }
  function updateChrome() {
    document.title = names[current.view] + ' | Magic Squares Lab';
    document.getElementById('app-location').textContent = names[current.view];
    document.querySelectorAll('#nav-links a').forEach(link => {
      const route = AppRoutes.target(link.getAttribute('href'), current.view);
      const selected = route.view === current.view && (route.view !== 'lab' || route.anchor === 'explore' && current.anchor !== 'build' || route.anchor === 'build' && current.anchor === 'build');
      link.toggleAttribute('aria-current', selected);
      if (selected) link.setAttribute('aria-current', 'page');
    });
    document.getElementById('app-return').hidden = !returnLesson || current.view === 'learn';
    closeMenu();
  }
  function navigate(route, { replace = false, historyEntry = true, preserve = true } = {}) {
    const old = current;
    let entry = entries.get(route.view);
    if (preserve && !route.anchor && entry) route = { ...route, anchor: entry.anchor };
    if (old?.view === 'learn' && route.view !== 'learn') returnLesson = { ...old };
    current = { ...route };
    if (historyEntry) write(current, replace);
    if (active && active !== route.view) {
      const previous = entries.get(active);
      previous.frame.contentWindow.MagicLabView?.suspend();
      previous.frame.hidden = true;
    }
    active = route.view;
    updateChrome();
    if (!entry) {
      const frame = document.createElement('iframe');
      frame.id = 'view-' + route.view;
      frame.title = names[route.view];
      frame.setAttribute('aria-label', names[route.view]);
      entry = { frame, anchor: route.anchor, ready: false };
      entries.set(route.view, entry);
      loading.hidden = false;
      frame.addEventListener('load', () => {
        entry.ready = true;
        const actual = AppRoutes.decode(frame.contentWindow.MagicLabView.hash.slice(1));
        if (entry.anchor && actual !== entry.anchor) frame.contentWindow.MagicLabView.apply(entry.anchor);
        else entry.anchor = actual;
        if (active === route.view) {
          current.anchor = entry.anchor;
          write(current, true);
          loading.hidden = true;
          document.getElementById('app-status').textContent = names[route.view] + ' ready.';
        }
      });
      const html = hydrate(payload.views[route.view]);
      frame.srcdoc = html.replace('<html ', '<html data-lab-anchor="' + encodeURIComponent(route.anchor) + '" ');
      host.append(frame);
    } else {
      entry.frame.hidden = false;
      loading.hidden = entry.ready;
      if (entry.anchor !== route.anchor) {
        entry.anchor = route.anchor;
        if (entry.ready) entry.frame.contentWindow.MagicLabView.apply(route.anchor);
      }
    }
  }
  function closeMenu() {
    document.getElementById('nav-links').classList.remove('is-open');
    document.getElementById('app-menu').setAttribute('aria-expanded', 'false');
    document.getElementById('app-menu').textContent = 'Menu';
  }
  function download(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.MagicLabShell = {
    storage: {
      getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
      setItem(key, value) { try { localStorage.setItem(key, value); } catch {} },
    },
    puzzleSolved(values) {
      const data = JSON.stringify(values);
      this.storage.setItem('magic-squares-home-solved-v1', data);
      entries.get('learn')?.frame.contentWindow.MagicLabCourse?.acceptHomePuzzle(values);
    },
    isInternal: (raw, view) => Boolean(AppRoutes.target(raw, view)),
    follow(raw, view, newTab = false) {
      const route = AppRoutes.target(raw, view);
      if (!route) return;
      if (newTab) window.open(location.href.split('#')[0] + AppRoutes.format(route), '_blank', 'noopener');
      else navigate(route);
    },
    changed(view, child, hash) {
      const entry = entries.get(view);
      if (!entry?.ready || entry.frame.contentWindow !== child) return;
      const anchor = AppRoutes.decode(hash);
      if (entry.anchor === anchor) return;
      entry.anchor = anchor;
      if (active === view) { current = { view, anchor }; write(current); }
    },
    downloadDocument(name) {
      if (Object.hasOwn(payload.documents, name)) download(payload.documents[name], name, 'text/markdown');
    },
  };
  document.querySelector('.brand').setAttribute('href', 'magic_squares_lab.html#top');
  document.querySelectorAll('.site-header a').forEach(link => {
    link.setAttribute('href', AppRoutes.format(AppRoutes.target(link.getAttribute('href'), 'learn')));
    link.addEventListener('click', event => {
    const route = AppRoutes.target(link.getAttribute('href'), current.view);
    if (!route || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault(); navigate(route);
    });
  });
  document.getElementById('app-menu').addEventListener('click', () => {
    const open = document.getElementById('nav-links').classList.toggle('is-open');
    document.getElementById('app-menu').setAttribute('aria-expanded', String(open));
    document.getElementById('app-menu').textContent = open ? 'Close' : 'Menu';
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.getElementById('app-download').addEventListener('click', () => download(originalHTML, 'magic_squares_lab_combined.html', 'text/html'));
  document.getElementById('app-return').addEventListener('click', () => navigate(returnLesson));
  document.getElementById('app-skip').addEventListener('click', event => { event.preventDefault(); entries.get(active)?.frame.focus(); });
  function restore() {
    const route = AppRoutes.parse(location.hash, payload.anchors);
    if (!current || current.view !== route.view || current.anchor !== route.anchor) navigate(route, { historyEntry: false, preserve: false });
  }
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  navigate(AppRoutes.parse(location.hash, payload.anchors), { replace: true });
})();
