import { apiFetch } from './backend.js';
// Owner controls live inside the existing recipe card. Authorization remains server-side.
export function installCardPhotoUpload(archive) {
  const dialog = document.getElementById('detail-dialog');
  let dispose = () => {};
  let saving = false;
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  dialog.addEventListener('click', event => {
    if (saving && event.target === dialog) event.stopImmediatePropagation();
  }, true);
  dialog.addEventListener('close', () => dispose());

  function mount() {
    dispose();
    const host = document.getElementById('detail-photo-upload');
    const target = archive.getDetail();
    if (!host || !target) return;
    host.innerHTML = `<form class="card-photo-form">
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Choose cocktail photo">
      <div class="photo-draft" hidden>
        <p class="photo-target"></p><div class="card-photo-preview"></div>
        <button type="button" class="choose-different-photo">Choose a different photo</button>
        <label>Caption or notes <span>(optional)</span><textarea maxlength="1000" rows="2"></textarea></label>
        <div class="photo-actions"><button type="submit">Save photo</button><button type="button" class="cancel-photo">Cancel</button></div>
      </div><p class="photo-status" role="status" aria-live="polite"></p>
    </form>`;
    const form = host.querySelector('form');
    const picker = form.querySelector('input');
    const draft = form.querySelector('.photo-draft');
    const preview = form.querySelector('.card-photo-preview');
    const caption = form.querySelector('textarea');
    const submit = form.querySelector('[type=submit]');
    const status = form.querySelector('.photo-status');
    let file = null, previewURL = null, replacesPhotoId = '', trigger = null;
    const message = (text, error = false) => {
      status.textContent = text; status.classList.toggle('error', error);
    };
    const release = () => { if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null; };
    dispose = release;
    function reset() {
      release(); file = null; picker.value = ''; caption.value = '';
      preview.replaceChildren(); draft.hidden = true;
    }
    function renderActions() {
      const gallery = document.getElementById('detail-gallery');
      gallery.querySelectorAll('.photo-action').forEach(button => button.remove());
      const placeholder = gallery.querySelector('.no-photo');
      function action(parent, photoId = '') {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'photo-action ' + (photoId ? 'replace-photo' : 'add-placeholder-photo');
        button.textContent = photoId ? 'Replace this photo' : 'Add a photo';
        button.onclick = () => {
          if (saving) return;
          reset(); message(''); trigger = button; replacesPhotoId = photoId;
          caption.value = photoId ? archive.photos.find(p => p.id === photoId)?.notes || '' : '';
          picker.click();
        };
        parent.append(button);
      }
      if (placeholder) { placeholder.replaceChildren(); action(placeholder); }
      else gallery.querySelectorAll('figure[data-photo-id]').forEach(figure => action(figure, figure.dataset.photoId));
    }
    renderActions();
    form.querySelector('.choose-different-photo').onclick = () => picker.click();
    form.querySelector('.cancel-photo').onclick = () => { reset(); message(''); trigger?.focus(); };
    picker.onchange = () => {
      const selected = picker.files[0];
      if (!selected) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 30 * 1024 * 1024) {
        message('Choose a JPEG, PNG, or WebP photo under 30 MB.', true); return;
      }
      file = selected; message(''); release(); preview.replaceChildren();
      const image = new Image(); previewURL = URL.createObjectURL(file); image.src = previewURL; image.alt = file.name;
      preview.append(image); draft.hidden = false;
      form.querySelector('.photo-target').textContent = `${replacesPhotoId ? 'Replace this photo' : 'Add a photo'} for ${target.label}`;
      submit.textContent = replacesPhotoId ? 'Save replacement' : 'Save photo';
    };
    form.onsubmit = async event => {
      event.preventDefault();
      if (saving || !file) return;
      saving = true;
      const controls = [...dialog.querySelectorAll('button,input,textarea')];
      const previouslyDisabled = controls.map(control => control.disabled);
      controls.forEach(control => { control.disabled = true; });
      form.setAttribute('aria-busy', 'true');
      try {
        message(replacesPhotoId ? 'Saving replacement…' : 'Saving photo…');
        const body = new FormData();
        body.set('year', String(target.year)); body.set('day', String(target.day));
        body.set('variantId', target.variantId); body.set('caption', caption.value);
        if (replacesPhotoId) body.set('replacesPhotoId', replacesPhotoId);
        body.set('file', await publicationPhoto(file), 'cocktail.jpg');
        const response = await apiFetch('photos', { method: 'POST', body });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'Could not save. Please try again.');
        const success = result.duplicate ? 'This photo is already saved.' : replacesPhotoId ? 'Photo replaced.' : 'Photo saved.';
        reset(); // The write succeeded; do not offer to repeat it if the refresh fails.
        try {
          const response = await apiFetch('archive', { cache: 'no-store' });
          if (!response.ok) throw Error();
          archive.updatePhotos(await response.json()); renderActions();
          message(success);
          document.querySelector('#detail-gallery .photo-action')?.focus();
          if (window.parent !== window) window.parent.postMessage({ type: 'cocktail-archive-updated', year: target.year }, location.origin);
        } catch { message(success + ' Reload to see the updated image.'); }
      } catch (error) {
        message((error.message || 'Could not save.') + ' Your selection is ready to retry.', true);
      } finally {
        form.removeAttribute('aria-busy');
        controls.forEach((control, i) => { control.disabled = previouslyDisabled[i]; });
        saving = false;
      }
    };
  }
  document.addEventListener('cocktail-detail-open', mount);
  mount();

}

async function publicationPhoto(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw Error(`Could not read ${file.name}. Choose a JPEG, PNG, or WebP copy.`); }
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
  if (!blob || blob.size > 12 * 1024 * 1024) throw Error('This image could not be prepared for upload. Try a smaller copy.');
  return blob;
}
