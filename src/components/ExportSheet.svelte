<script>
  import { readExportSnapshot } from '../lib/db.js';
  import { buildExport, ExportError } from '../lib/exportData.js';

  // Builds the export page from one snapshot of the pots, then waits on a ready screen.
  // Saving starts from a fresh tap on the big Save button (a download link), with a share
  // sheet and an "open in a new tab" link beside it for phones where the download is not offered.
  let { onclose } = $props();

  let step = $state('building'); // building | ready | error
  let progress = $state({ done: 0, total: 0 });
  let result = $state(null); // { data, filename, url, file }
  let error = $state('');
  let tapped = $state(false);
  let attempt = $state(0);
  let shareNote = $state('');

  const counts = $derived(result?.data.counts);
  const canShare = $derived(!!result && typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [result.file] }));

  $effect(() => {
    attempt; // run again when the potter taps Try again
    let alive = true;
    let url = '';
    step = 'building';
    progress = { done: 0, total: 0 };
    (async () => {
      try {
        const snapshot = await readExportSnapshot();
        const built = await buildExport(snapshot, {
          appVersion: __APP_VERSION__,
          onprogress: (done, total) => alive && (progress = { done, total }),
        });
        if (!alive) return;
        url = URL.createObjectURL(built.blob);
        const file = new File([built.blob], built.filename, { type: 'text/html' });
        result = { data: built.data, filename: built.filename, url, file };
        step = 'ready';
      } catch (err) {
        if (!alive) return;
        error = err instanceof ExportError ? err.message : 'The export could not be built, so nothing was saved. Please try again.';
        step = 'error';
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      result = null;
      tapped = false;
      shareNote = '';
    };
  });

  // Runs straight from the tap: the Blob goes to a download link and the link is clicked.
  function save() {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
    tapped = true;
  }

  async function share() {
    shareNote = '';
    try {
      await navigator.share({ files: [result.file], title: 'Pot Log export' });
    } catch (err) {
      if (err && err.name !== 'AbortError') shareNote = "Sharing didn't work. Try opening the page in a new tab instead.";
    }
  }
</script>

<div class="add" role="dialog" aria-label="Export all pots">
  <div class="screen">
    <button class="btn secondary small" onclick={onclose}>← My pots</button>
    <h1>Export all pots</h1>

    {#if step === 'building'}
      <p class="empty" role="status">
        Getting your pots ready…{progress.total ? ` photo ${progress.done} of ${progress.total}` : ''}
      </p>
    {:else if step === 'error'}
      <div class="banner error" role="alert">{error}</div>
      <button class="btn" onclick={() => attempt++}>Try again</button>
    {:else}
      <div class="banner ok" role="status">Ready ✓ Nothing is saved until you tap Save.</div>
      <ul class="export-counts" aria-label="What is in the file">
        <li><strong>{counts.pots}</strong> pots</li>
        <li><strong>{counts.archivedPots}</strong> archived pots</li>
        <li><strong>{counts.photos}</strong> photos</li>
        <li><strong>{counts.glazeLayers}</strong> glaze layers</li>
      </ul>
      <p class="sub">One page, {result.filename}. It opens in any browser with no app and no signal: finished pots with their glazes first, then every pot's journal.</p>

      <button class="btn big" onclick={save}>Save</button>

      {#if tapped}
        <div class="banner" role="status">
          If your phone did not offer to keep the file, use <em>Share or save to Files</em> or open the page in a new tab and use the browser's Share button.
        </div>
      {/if}
      {#if canShare}
        <button class="btn secondary small" onclick={share}>Share or save to Files</button>
      {/if}
      {#if shareNote}<div class="banner error" role="alert">{shareNote}</div>{/if}
      <a class="link center" href={result.url} target="_blank" rel="noopener">Open the page in a new tab</a>
    {/if}
  </div>
</div>
