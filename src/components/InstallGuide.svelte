<script>
  import { installPrompt, promptInstall, copyLink } from '../lib/install.js';
  import { GUIDE, UI, WARNING } from '../content/guide.js';
  import PhoneMock from './PhoneMock.svelte';
  import PotsIllustration from './PotsIllustration.svelte';

  // One full-screen card per step. `onlogHere` is given only when the guide stands in
  // front of the Add button on an iPhone browser tab: it adds the small "log anyway" link.
  let { platform, onclose, onlogHere = null } = $props();

  const steps = $derived(GUIDE[platform] || GUIDE.desktop);
  let index = $state(0);
  let warning = $state(false);
  let copied = $state(null); // null | true | false

  const step = $derived(steps[index]);
  const last = $derived(index === steps.length - 1);

  async function copy() {
    copied = await copyLink();
  }

  function go(by) {
    index += by;
    copied = null;
  }
</script>

<div class="add guide" role="dialog" aria-label="Install Pot Log">
  <div class="screen guide-screen">
    {#if warning}
      <PotsIllustration height={88} />
      <h1>{WARNING.title}</h1>
      <p class="guide-text">{WARNING.text}</p>
      <button class="btn" onclick={() => (warning = false)}>{WARNING.install}</button>
      <button class="link center" onclick={onlogHere}>{WARNING.anyway}</button>
    {:else}
      <div class="guide-top">
        <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label={UI.step(index + 1, steps.length)}>
          {#each steps as s, i (s.id)}<span class="dot" class:on={i <= index}></span>{/each}
        </div>
        <button class="link" onclick={onclose}>{UI.notNow}</button>
      </div>
      <p class="sub">{UI.step(index + 1, steps.length)}</p>

      {#if !step.mock}<PotsIllustration height={88} />{/if}
      <h1>{step.title}</h1>
      <p class="guide-text">{step.text}</p>

      {#if step.mock}
        <PhoneMock mock={step.mock} alt="{step.title}: picture of the phone screen" />
      {/if}

      {#if step.copyLink}
        <button class="btn secondary" onclick={copy}>{copied ? UI.copied : UI.copyLink}</button>
        {#if copied === false}<div class="banner error" role="alert">{UI.copyFailed}</div>{/if}
      {/if}

      {#if step.install && $installPrompt}
        <button class="btn" onclick={promptInstall}>{UI.install}</button>
      {/if}

      <div class="guide-nav">
        {#if index > 0}
          <button class="btn secondary" onclick={() => go(-1)}>{UI.back}</button>
        {/if}
        <button class="btn" onclick={() => (last ? onclose() : go(1))}>{last ? UI.done : UI.next}</button>
      </div>

      {#if onlogHere}
        <button class="link center" onclick={() => (warning = true)}>{UI.logAnyway}</button>
      {/if}
    {/if}
  </div>
</div>
