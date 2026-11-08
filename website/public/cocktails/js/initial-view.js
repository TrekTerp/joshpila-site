// Select the destination before any archive, SDK, or API request can delay startup.
// The head's visibility guard prevents the default journal from painting first.
(() => {
  const requested = new URLSearchParams(location.search).get('view');
  const view = ['backstory', 'calendar', 'finder'].includes(requested) ? requested : 'backstory';
  document.querySelectorAll('.view').forEach(section => {
    section.hidden = section.dataset.view !== view;
    if (!section.hidden && view !== 'backstory') section.setAttribute('aria-busy', 'true');
  });
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false');
  });
  document.getElementById('archive-loading').hidden = view === 'backstory';
  document.documentElement.classList.add('archive-view-ready');
})();
