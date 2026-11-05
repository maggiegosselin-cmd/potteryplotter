import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { openDb, savePot, listPots, firstPhoto, describeStorageError } from './db.js';
import { preparePhoto } from './photo.js';
import { persistenceState, requestPersistence } from './storage.js';
import { detectPlatform, watchInstallPrompt } from './install.js';
import { makeSamplePhoto } from './sample.js';

const photoUrl = (photo) => URL.createObjectURL(new Blob([photo.data], { type: photo.type }));
const potTitle = (pot) => pot.name || `Pot ${pot.id}`;
const when = (ms) => new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// A big button that opens the phone's camera (capture) or photo picker.
function PhotoButton({ onFile, camera, className, children }) {
  const onChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = ''; // so choosing the same photo again still fires
    if (file) onFile(file);
  };
  return html`
    <label class=${className}>
      ${children}
      <input class="file-input" type="file" accept="image/*" capture=${camera ? 'environment' : undefined} onChange=${onChange} />
    </label>`;
}

// A pot's stored photo, read back from the phone's database.
function PotPhoto({ potId, className }) {
  const [photo, setPhoto] = useState(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let off = false;
    let url = '';
    firstPhoto(potId)
      .then((stored) => {
        if (off) return;
        if (!stored) { setBroken(true); return; }
        url = photoUrl(stored);
        setPhoto({ url, shrunk: stored.shrunk });
      })
      .catch(() => { if (!off) setBroken(true); });
    return () => { off = true; if (url) URL.revokeObjectURL(url); };
  }, [potId]);
  if (broken) return html`<div class=${`${className} photo-missing`}>Photo saved, but this browser can't show it</div>`;
  if (!photo) return html`<div class=${`${className} photo-missing`}></div>`;
  return html`<img class=${className} src=${photo.url} alt="Photo of the pot" onError=${() => setBroken(true)} />`;
}

function InstallHelp({ platform, prompt, onInstall }) {
  if (platform.standalone) return null;
  if (prompt) {
    return html`
      <section class="panel">
        <h2>Put Pot Log on your phone</h2>
        <p>Install it so it opens like an app and works with no signal.</p>
        <button class="btn" onClick=${onInstall}>Install app</button>
      </section>`;
  }
  if (platform.ios) {
    return html`
      <section class="panel">
        <h2>Put Pot Log on your iPhone</h2>
        <ol class="steps">
          <li>Open this page in <strong>Safari</strong>.</li>
          <li>Tap the <strong>Share</strong> button (the square with an arrow).</li>
          <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open <strong>Pot Log</strong> from your Home Screen.</li>
        </ol>
        <p class="warn">Do this before logging pots. Pots saved in a Safari tab do not move into the Home Screen app.</p>
      </section>`;
  }
  if (platform.android) {
    return html`
      <section class="panel">
        <h2>Put Pot Log on your phone</h2>
        <p>In Chrome, tap the <strong>⋮</strong> menu, then <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</p>
      </section>`;
  }
  return null;
}

function PotCard({ pot }) {
  return html`
    <li class="card">
      <${PotPhoto} potId=${pot.id} className="thumb" />
      <div class="card-text">
        <strong>${potTitle(pot)}</strong>
        <span>${when(pot.createdAt)}</span>
      </div>
    </li>`;
}

function ListScreen({ pots, storageProblem, persist, platform, installPrompt, onInstall, onFile, notice, onSample }) {
  const canAdd = !storageProblem;
  const showSample = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  return html`
    <main>
      <h1>My pots</h1>
      ${storageProblem && html`<p class="banner error" role="alert">${storageProblem}</p>`}
      ${notice && html`<p class="banner error" role="alert">${notice}</p>`}
      ${canAdd
        ? html`<${PhotoButton} camera=${true} onFile=${onFile} className="big-add"><span class="plus">＋</span> Add a pot<small>Opens the camera</small><//>
               <${PhotoButton} onFile=${onFile} className="btn secondary">Choose a photo instead<//>`
        : null}
      ${canAdd && showSample && html`<button class="btn link" onClick=${onSample}>No camera? Use a sample photo</button>`}
      <${InstallHelp} platform=${platform} prompt=${installPrompt} onInstall=${onInstall} />
      ${pots === null
        ? html`<p class="muted">Opening your pots…</p>`
        : pots.length === 0
          ? html`<p class="muted empty">No pots yet. Tap the big button to log your first one.</p>`
          : html`<ul class="cards">${pots.map((pot) => html`<${PotCard} key=${pot.id} pot=${pot} />`)}</ul>`}
      ${persist && html`<p class=${`muted persist ${persist.state}`}>${persist.message}</p>`}
    </main>`;
}

function AddScreen({ file, onFile, onCancel, onSaved }) {
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Shrink as soon as a photo is chosen; saving waits for it.
  useEffect(() => {
    let off = false;
    let url = '';
    setPhoto(null);
    setPreview('');
    setPhotoError('');
    preparePhoto(file)
      .then((prepared) => {
        if (off) return;
        url = photoUrl(prepared);
        setPreview(url);
        setPhoto(prepared);
      })
      .catch((err) => { if (!off) setPhotoError(err.message); });
    return () => { off = true; if (url) URL.revokeObjectURL(url); };
  }, [file]);

  const save = async () => {
    if (!photo || saving) return;
    setSaving(true);
    setError('');
    try {
      const id = await savePot({ name: name.trim(), photo }); // resolves once committed
      onSaved({ id, note: photo.note });
    } catch (err) {
      setError(describeStorageError(err)); // the form stays as it was, nothing is lost
      setSaving(false);
    }
  };

  const status = photoError
    ? html`<p class="banner error" role="alert">${photoError}</p>`
    : !photo
      ? html`<p class="muted" role="status">Getting the photo ready…</p>`
      : photo.note && html`<p class="banner warn" role="status">${photo.note}</p>`;

  return html`
    <main>
      <h1>New pot</h1>
      <div class="preview">${preview ? html`<img src=${preview} alt="Your photo" />` : html`<div class="photo-missing"></div>`}</div>
      ${status}
      <div class="row">
        <${PhotoButton} camera=${true} onFile=${onFile} className="btn secondary">Retake<//>
        <${PhotoButton} onFile=${onFile} className="btn secondary">Other photo<//>
      </div>
      <label class="field">
        <span>Name (optional)</span>
        <input type="text" value=${name} onInput=${(e) => setName(e.target.value)} placeholder="e.g. Blue mug" enterkeyhint="done" autocomplete="off" />
      </label>
      ${error && html`<p class="banner error" role="alert">${error}</p>`}
      <button class="btn save" disabled=${!photo || saving} onClick=${save}>${saving ? 'Saving…' : 'Save pot'}</button>
      <button class="btn link" disabled=${saving} onClick=${onCancel}>Cancel</button>
    </main>`;
}

function SavedScreen({ saved, persist, onFile, onDone }) {
  return html`
    <main class="saved">
      <div class="tick" aria-hidden="true">✓</div>
      <h1>Saved on this phone</h1>
      <${PotPhoto} potId=${saved.id} className="preview-img" />
      ${saved.note && html`<p class="banner warn">${saved.note}</p>`}
      <p class=${`muted persist ${persist ? persist.state : ''}`}>${persist ? persist.message : 'Checking storage…'}</p>
      <${PhotoButton} camera=${true} onFile=${onFile} className="big-add"><span class="plus">＋</span> Add another pot<//>
      <button class="btn secondary" onClick=${onDone}>See my pots</button>
    </main>`;
}

function App() {
  const [screen, setScreen] = useState('list');
  const [pots, setPots] = useState(null);
  const [storageProblem, setStorageProblem] = useState('');
  const [persist, setPersist] = useState(null);
  const [file, setFile] = useState(null);
  const [saved, setSaved] = useState(null);
  const [notice, setNotice] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [worker, setWorker] = useState({ ready: false, error: '' });
  const [online, setOnline] = useState(navigator.onLine);
  const platform = useRef(detectPlatform()).current;

  const refresh = async () => {
    try {
      setPots(await listPots());
    } catch (err) {
      setStorageProblem(describeStorageError(err));
      setPots([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await openDb();
      } catch (err) {
        setStorageProblem(describeStorageError(err));
        setPots([]);
        return;
      }
      await refresh();
      setPersist(await persistenceState());
    })();

    watchInstallPrompt(setInstallPrompt);
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => setWorker({ ready: true, error: '' }))
        .catch((err) => setWorker({ ready: false, error: `Offline use is not set up: ${err.message}` }));
    } else {
      setWorker({ ready: false, error: 'Offline use needs a secure (https) address in a current browser.' });
    }
  }, []);

  const chooseFile = (chosen) => { setNotice(''); setFile(chosen); setScreen('add'); };

  const onSaved = (result) => {
    setSaved(result);
    setScreen('saved');
    refresh();
    requestPersistence().then(setPersist); // after the first save, with a note on the answer
  };

  const useSample = async () => {
    try {
      chooseFile(await makeSamplePhoto());
    } catch (err) {
      setNotice(err.message);
    }
  };

  const install = async () => {
    const prompt = installPrompt;
    if (!prompt) return;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
    } catch (err) {
      setNotice(`Couldn't open the install prompt: ${err.message}`);
    }
  };

  const status = worker.error
    ? html`<div class="status warn">${worker.error}</div>`
    : html`<div class=${`status ${online ? '' : 'offline'}`}>
        ${!online ? 'No signal. Everything still works.' : worker.ready ? 'Ready to work with no signal' : 'Getting ready for no signal…'}
      </div>`;

  return html`
    ${status}
    ${screen === 'add' && file
      ? html`<${AddScreen} file=${file} onFile=${chooseFile} onCancel=${() => setScreen('list')} onSaved=${onSaved} />`
      : screen === 'saved' && saved
        ? html`<${SavedScreen} saved=${saved} persist=${persist} onFile=${chooseFile} onDone=${() => setScreen('list')} />`
        : html`<${ListScreen} pots=${pots} storageProblem=${storageProblem} persist=${persist} platform=${platform}
            installPrompt=${installPrompt} onInstall=${install} onFile=${chooseFile} notice=${notice} onSample=${useSample} />`}`;
}

render(html`<${App} />`, document.getElementById('app'));
