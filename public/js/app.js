// The one screen: photo button, name, save, and the list of pots below.
import { listPots, savePot, StorageError } from './db.js';
import { initInstallHelp } from './install.js';
import { shrinkPhoto, ShrinkError } from './shrink.js';
import { checkPersistence, persistenceNote, requestPersistence } from './storage.js';

const $ = (id) => document.getElementById(id);
const els = {
  connection: $('connection'),
  form: $('pot-form'),
  photoButton: $('photo-button'),
  photoLabel: $('photo-label'),
  preview: $('preview'),
  camera: $('photo-camera'),
  library: $('photo-library'),
  name: $('pot-name'),
  save: $('save'),
  message: $('message'),
  storageNote: $('storage-note'),
  empty: $('empty'),
  list: $('pot-list'),
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const state = {
  photo: null, // shrunk photo ready to save: { bytes, type, width, height }
  shrinking: false,
  saving: false,
  canStore: true,
  pickToken: 0, // lets a late shrink result be ignored if another photo was picked meanwhile
  previewUrl: null,
  listUrls: [],
};

// ---- messages -------------------------------------------------------------

function showMessage(kind, text) {
  els.message.textContent = text;
  els.message.className = `message ${kind}`;
  els.message.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  els.message.hidden = false;
}

function clearMessage() {
  els.message.hidden = true;
  els.message.textContent = '';
}

function describeError(err) {
  if (err instanceof StorageError) {
    if (err.code === 'quota') {
      return "The phone is out of room, so this pot was not saved. Free up some space, then tap Save pot again. Your photo and name are still here.";
    }
    if (err.code === 'unavailable') {
      return "This browser can't keep pots on the phone (private browsing can cause this). Open Pot log in a normal tab or from the Home Screen.";
    }
    return 'The pot could not be saved on the phone, so nothing was kept. Tap Save pot to try again.';
  }
  if (err instanceof ShrinkError) {
    if (err.code === 'not-image') return "That file isn't a photo. Please choose a picture.";
    return "That photo couldn't be shrunk. Take another photo, or pick a different one.";
  }
  return 'Something went wrong. Nothing was saved. Please try again.';
}

// ---- form -----------------------------------------------------------------

function render() {
  const busy = state.shrinking || state.saving;
  els.save.disabled = busy || !state.canStore;
  els.save.textContent = state.saving ? 'Saving…' : state.shrinking ? 'Shrinking photo…' : 'Save pot';
  els.photoButton.setAttribute('aria-busy', String(state.shrinking));
  els.photoLabel.textContent = state.shrinking
    ? 'Shrinking photo…'
    : state.photo
      ? 'Tap to retake'
      : 'Take a photo of the pot';
}

function setPreview(photo) {
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = null;
  if (photo) {
    state.previewUrl = URL.createObjectURL(new Blob([photo.bytes], { type: photo.type }));
    els.preview.src = state.previewUrl;
  } else {
    els.preview.removeAttribute('src');
  }
  els.preview.hidden = !photo;
}

async function onPhotoChosen(input) {
  const file = input.files?.[0];
  input.value = ''; // so choosing the same photo again still fires "change"
  if (!file) return;

  const token = ++state.pickToken;
  clearMessage();
  state.shrinking = true;
  state.photo = null;
  setPreview(null);
  render();

  try {
    const photo = await shrinkPhoto(file);
    if (token !== state.pickToken) return;
    state.photo = photo;
    setPreview(photo);
  } catch (err) {
    if (token !== state.pickToken) return;
    console.error(err);
    showMessage('error', describeError(err));
  } finally {
    if (token === state.pickToken) {
      state.shrinking = false;
      render();
    }
  }
}

function defaultName() {
  return `Pot ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
}

async function onSave(event) {
  event.preventDefault();
  if (state.shrinking || state.saving) return;

  const typed = els.name.value.trim();
  if (!state.photo && !typed) {
    showMessage('error', 'Take a photo or type a name first.');
    return;
  }

  clearMessage();
  state.saving = true;
  render();
  try {
    const record = await savePot({ name: typed || defaultName(), photo: state.photo });
    // Only now, with the data written, do we say so and clear the form.
    state.photo = null;
    setPreview(null);
    els.name.value = '';
    showMessage('ok', `✓ Saved “${record.name}” on this phone.`);
    try {
      await refreshList(record.id);
    } catch (err) {
      console.error(err); // the pot is saved; only the list on screen is out of date
    }
    afterSave();
  } catch (err) {
    console.error(err);
    showMessage('error', describeError(err));
  } finally {
    state.saving = false;
    render();
  }
}

async function afterSave() {
  const result = await requestPersistence();
  els.storageNote.textContent = persistenceNote(result);
  els.storageNote.hidden = false;
}

// ---- list -----------------------------------------------------------------

async function refreshList(freshId) {
  const pots = await listPots();
  for (const url of state.listUrls) URL.revokeObjectURL(url);
  state.listUrls = [];

  els.list.replaceChildren(
    ...pots.map((pot) => {
      const item = document.createElement('li');
      item.className = pot.id === freshId ? 'pot fresh' : 'pot';

      if (pot.photo) {
        const img = document.createElement('img');
        const url = URL.createObjectURL(new Blob([pot.photo.bytes], { type: pot.photo.type }));
        state.listUrls.push(url);
        img.src = url;
        img.alt = `Photo of ${pot.name}`;
        item.append(img);
      } else {
        const none = document.createElement('div');
        none.className = 'no-photo';
        none.textContent = 'No photo';
        item.append(none);
      }

      const text = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'pot-name';
      name.textContent = pot.name;
      const date = document.createElement('div');
      date.className = 'pot-date';
      date.textContent = dateFormat.format(new Date(pot.createdAt));
      text.append(name, date);
      item.append(text);
      return item;
    }),
  );
  els.empty.hidden = pots.length > 0;
}

// ---- status and offline ---------------------------------------------------

function updateConnection(offlineReady) {
  if (!navigator.onLine) {
    els.connection.textContent = 'No signal. That’s fine, everything still works.';
  } else if (offlineReady) {
    els.connection.textContent = 'Ready to work with no signal.';
  } else {
    els.connection.textContent = 'Online.';
  }
}

async function registerOffline() {
  let ready = false;
  updateConnection(ready);
  if (!('serviceWorker' in navigator)) {
    els.connection.textContent = 'Offline use is not available in this browser.';
    return;
  }
  try {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    ready = true;
  } catch (err) {
    console.error(err);
    els.connection.textContent = 'Could not set up offline use. The app needs signal to open.';
    return;
  }
  updateConnection(ready);
  window.addEventListener('online', () => updateConnection(ready));
  window.addEventListener('offline', () => updateConnection(ready));
}

// ---- start ----------------------------------------------------------------

async function start() {
  els.camera.addEventListener('change', () => onPhotoChosen(els.camera));
  els.library.addEventListener('change', () => onPhotoChosen(els.library));
  els.form.addEventListener('submit', onSave);

  initInstallHelp({
    panel: $('install'),
    button: $('install-button'),
    iosSteps: $('ios-steps'),
    androidHint: $('android-hint'),
  });
  registerOffline();

  try {
    await refreshList();
  } catch (err) {
    console.error(err);
    state.canStore = false;
    els.empty.hidden = true;
    showMessage('error', describeError(err instanceof StorageError ? err : new StorageError('unavailable', '', err)));
  }
  render();

  const persisted = await checkPersistence();
  if (persisted === 'granted') {
    els.storageNote.textContent = persistenceNote('granted');
    els.storageNote.hidden = false;
  }
}

start();
