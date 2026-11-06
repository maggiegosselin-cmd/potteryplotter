<script>
  // A phone screen drawn in HTML and CSS from a mock spec (see src/content/guide.js).
  // The item whose label equals `highlight` is picked out.
  let { mock, alt = '' } = $props();
</script>

<div class="phone" role="img" aria-label={alt}>
  <div class="glass" aria-hidden="true">
    {#if mock.kind === 'toolbar' && mock.position === 'top'}
      <div class="bar top">
        {#each mock.items as item}
          <span class="cell" class:wide={item.wide} class:hl={item.label === mock.highlight}>{item.icon ?? ''}{item.wide ? ' pot-log' : ''}</span>
        {/each}
      </div>
    {/if}

    <div class="page">
      <span class="line l1"></span><span class="line l2"></span><span class="line l3"></span>
    </div>

    {#if mock.kind === 'toolbar' && mock.position !== 'top'}
      <div class="bar bottom">
        {#each mock.items as item}
          <span class="cell" class:hl={item.label === mock.highlight}>{item.icon}</span>
        {/each}
      </div>
    {:else if mock.kind === 'sheet' || mock.kind === 'menu'}
      <div class="layer" class:sheet={mock.kind === 'sheet'}>
        {#if mock.title}<div class="layer-title">{mock.title}</div>{/if}
        {#each mock.items as item}
          <div class="row" class:hl={item.label === mock.highlight}>
            <span>{item.label}</span><span class="ico">{item.icon ?? ''}</span>
          </div>
        {/each}
      </div>
    {:else if mock.kind === 'dialog'}
      <div class="layer dialog">
        <div class="layer-title">{mock.title}</div>
        <div class="field">{mock.field}</div>
        <div class="buttons">
          {#each mock.items as item}
            <span class="dbtn" class:hl={item.label === mock.highlight}>{item.label}</span>
          {/each}
        </div>
      </div>
    {:else if mock.kind === 'home'}
      <div class="home">
        {#each mock.items as item}
          <span class="app" class:hl={item.label === mock.highlight}>
            <span class="app-icon">{item.icon}</span>
            <span class="app-name">{item.label}</span>
          </span>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .phone { width: min(100%, 300px); margin: 0 auto; padding: 10px; border-radius: 34px; background: var(--ink); box-shadow: 0 6px 18px rgba(0, 0, 0, .25); }
  .glass { position: relative; display: flex; flex-direction: column; min-height: 250px; border-radius: 26px; overflow: hidden; background: #fff; font-size: 1rem; }
  .page { flex: 1; padding: 14px; display: grid; gap: 8px; align-content: start; background: #fbefe6; }
  .line { display: block; height: 12px; border-radius: 6px; background: #e7d3b3; }
  .l1 { width: 70%; } .l2 { width: 90%; } .l3 { width: 50%; }
  .bar { display: flex; align-items: center; justify-content: space-around; gap: 6px; padding: 6px 8px; background: #eee6da; min-height: 52px; }
  .bar.top { border-bottom: 1px solid #cdb89b; }
  .bar.bottom { border-top: 1px solid #cdb89b; }
  .cell { display: grid; place-items: center; min-width: 40px; min-height: 40px; padding: 0 8px; border-radius: 12px; font-size: 1.25rem; }
  .cell.wide { flex: 1; background: #fff; font-size: .95rem; color: #6b5b50; justify-items: start; }
  .layer { position: absolute; left: 10px; right: 10px; bottom: 10px; padding: 8px; border-radius: 18px; background: #fff; box-shadow: 0 0 0 2px #cdb89b, 0 6px 18px rgba(0, 0, 0, .25); }
  .layer.sheet { left: 0; right: 0; bottom: 0; border-radius: 22px 22px 0 0; }
  .layer.dialog { top: 40px; bottom: auto; padding: 12px; }
  .layer-title { padding: 4px 8px 8px; font-weight: 700; text-align: center; }
  .row { display: flex; justify-content: space-between; align-items: center; min-height: 40px; padding: 4px 12px; border-radius: 10px; }
  .field { margin: 0 4px 10px; padding: 8px 12px; border-radius: 10px; background: #f1ebe2; }
  .buttons { display: flex; justify-content: space-between; gap: 8px; }
  .dbtn { flex: 1; padding: 8px; border-radius: 10px; text-align: center; font-weight: 700; color: var(--accent-ink); }
  .home { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; align-content: start; padding: 24px 8px; background: linear-gradient(var(--sand), var(--blue-grey)); }
  .app { display: grid; justify-items: center; gap: 4px; padding: 4px; border-radius: 14px; color: var(--ink); font-size: .7rem; }
  .app-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #fff; font-size: 1.5rem; }
  .hl { background: #ffd9a8; color: var(--ink); box-shadow: 0 0 0 4px var(--blue-grey-deep); animation: pulse 1.6s ease-in-out infinite; }
  .app.hl { background: transparent; color: var(--ink); box-shadow: 0 0 0 4px var(--ink); }
  @keyframes pulse { 50% { box-shadow: 0 0 0 7px rgba(76, 101, 115, .45); } }
  @media (prefers-reduced-motion: reduce) { .hl { animation: none; } }
</style>
