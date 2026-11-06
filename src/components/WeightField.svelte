<script>
  import { WEIGHT_UNITS, lastUnit, rememberUnit } from '../lib/weight.js';

  // An optional clay weight: a number (decimals allowed) and a g / lb toggle. The number is kept
  // as typed; switching the unit never rewrites it. `onchange({ amount, unit })` fires on either.
  // The unit starts as the given one, or the last unit used on this phone.
  let { amount: initial = null, unit: initialUnit = null, label = 'Clay weight (optional)', onchange } = $props();
  let amount = $state(initial ?? '');
  let unit = $state(initialUnit || lastUnit());

  function choose(next) {
    unit = next;
    rememberUnit(next);
    onchange?.({ amount, unit });
  }
</script>

<div class="weight-field" role="group" aria-label={label}>
  <span class="weight-label">{label}</span>
  <div class="weight-row">
    <input
      type="number" step="any" min="0" inputmode="decimal" placeholder="e.g. 500" aria-label={label}
      bind:value={amount} onchange={() => onchange?.({ amount, unit })} autocomplete="off"
    />
    <div class="units" role="radiogroup" aria-label="Weight unit">
      {#each WEIGHT_UNITS as u (u)}
        <button type="button" class="unit" class:on={unit === u} role="radio" aria-checked={unit === u} onclick={() => choose(u)}>{u}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .weight-field { display: grid; gap: 4px; margin: 8px 0; font-size: 1rem; color: var(--ink-soft); }
  .weight-row { display: flex; align-items: center; gap: 8px; }
  .weight-row input {
    flex: 1 1 auto; min-width: 0; min-height: 64px; padding: 12px 16px; border: var(--ink-line) solid var(--ink);
    border-radius: var(--r-field); background: var(--cream); color: var(--ink);
  }
  .units { display: flex; gap: 8px; }
  .unit {
    min-width: 56px; min-height: 64px; border: 0; border-radius: var(--r-btn); background: var(--cream);
    color: var(--ink); font-size: 1.1rem; cursor: pointer;
  }
  .unit:active { background: var(--cream-press); }
  .unit.on { background: var(--gold); font-weight: 700; }
  .unit.on:active { background: var(--gold-press); }
</style>
