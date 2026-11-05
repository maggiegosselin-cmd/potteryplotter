<script>
  import qrcode from 'qrcode-generator';
  import { syncState, currentKey } from '../lib/sync.js';
  import { copyAge } from '../lib/wire.js';

  let now = $state(Date.now());
  let qr = $state(''); // the SVG of the "move to a new phone" code; empty while hidden

  $effect(() => {
    const t = setInterval(() => (now = Date.now()), 30_000);
    return () => clearInterval(t);
  });

  const age = $derived(copyAge($syncState.lastCopyAt, now));
  const failed = $derived($syncState.phase === 'failed' || $syncState.phase === 'stopped');

  async function toggleQr() {
    if (qr) return (qr = '');
    const code = qrcode(0, 'M');
    code.addData(`${location.origin}/#key=${await currentKey()}`);
    code.make();
    qr = code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }
</script>

<div class="copy-status" role="status">
  <span class="copy-age" class:stale={age.stale}>
    {age.text}{#if $syncState.phase === 'copying'} · copying…{:else if $syncState.phase === 'offline'} · no signal{/if}
  </span>
  <button class="link small-link" onclick={toggleQr}>{qr ? 'Hide' : 'Move to a new phone'}</button>
</div>
{#if failed}
  <div class="banner error" role="alert">{$syncState.error}</div>
{:else if age.stale && $syncState.phase !== 'copying'}
  <div class="banner" role="status">Your pots have not been copied lately. Open Pot Log with signal and they will be.</div>
{/if}
{#if qr}
  <div class="banner qr">
    <p>On the new phone, open the camera and scan this to bring your pots across. Keep it private: anyone who scans it can see your pots.</p>
    <div class="qr-code">{@html qr}</div>
  </div>
{/if}
