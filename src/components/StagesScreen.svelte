<script>
  import { tick } from 'svelte';
  import { saveStages } from '../lib/db.js';
  import { dragRows } from '../lib/dragRows.js';
  import { flagsOn, setFlagsOn } from '../lib/flags.js';
  import {
    addAfter, addAtEnd, canAddAfter, canDrag, canHide, groupOf, isChanged, moveStage, renameStage, restoreAll, restoreStage,
    setHidden,
  } from '../lib/stageEdit.js';

  let { stages, onback } = $props();

  const SECTIONS = [
    { kind: 'path', title: 'On the way', hint: 'Drag the handle to move a stage. Add extra firings (raku, soda…) with the add buttons.', add: '＋ Add a stage' },
    { kind: 'waiting', title: 'Out of your hands', hint: 'Where a pot waits while staff fire it.' },
    { kind: 'end', title: 'Ways a pot can end', hint: 'Add your own, such as "Fired off-studio".', add: '＋ Add an end state' },
  ];

  let drag = $state(null); // { id, kind, gap } while a handle is held
  let error = $state('');
  let confirmAll = $state(false);
  let notes = $state(flagsOn());
  let pendingFocus = null;

  const groups = $derived(SECTIONS.map((section) => ({ ...section, rows: groupOf(stages, section.kind) })));

  async function commit(next) {
    if (next === stages) return;
    try {
      // Rows come from $state, which wraps them in proxies IndexedDB cannot clone.
      await saveStages($state.snapshot(next));
      error = '';
    } catch {
      error = 'The stages were not saved. Please try again.';
    }
  }

  // A stage added a moment ago gets the keyboard once its row has been drawn.
  $effect(() => {
    const rows = stages; // read first, so the effect runs again whenever the rows change
    if (!pendingFocus || !rows.some((s) => s.id === pendingFocus)) return;
    const id = pendingFocus;
    pendingFocus = null;
    tick().then(() => {
      const input = document.getElementById(`stage-${id}`);
      input?.scrollIntoView({ block: 'center' });
      input?.focus();
      input?.select();
    });
  });

  function added(result) {
    if (!result.added) return;
    pendingFocus = result.added.id;
    return commit(result.stages);
  }

  function rename(stage, event) {
    const input = event.currentTarget;
    const next = renameStage(stages, stage.id, input.value);
    if (next === stages) input.value = stage.label; // a blank name goes back to what it was
    else commit(next);
  }

  function key(stage, group, i, event) {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!step || !draggable(stage, group)) return;
    event.preventDefault();
    const to = i + step;
    if (to < 0 || to >= group.rows.length) return;
    commit(moveStage(stages, stage.id, step < 0 ? to : to + 1));
  }

  const draggable = (s, group) => canDrag(s) && group.rows.length > 1;

  function maxGap(group) {
    return group.rows.filter((s) => !s.terminal).length;
  }

  async function restoreEverything() {
    confirmAll = false;
    await commit(restoreAll(stages));
  }

  function toggleNotes(event) {
    notes = event.currentTarget.checked;
    setFlagsOn(notes);
  }
</script>

<div class="add" role="dialog" aria-label="My stages">
  <div class="screen stages-screen">
    <button class="btn secondary small" onclick={onback}>← My pots</button>
    <h1>My stages</h1>
    <p class="sub">Rename a stage by typing in it. Hiding a stage keeps every pot and its history; pots already in it still show it.</p>

    {#if error}
      <div class="banner error" role="alert">{error}</div>
    {/if}

    {#each groups as group (group.kind)}
      <h2>{group.title}</h2>
      <p class="sub">{group.hint}</p>
      <ul class="stage-list" aria-label={group.title}>
        {#each group.rows as s, i (s.id)}
          <li
            class="stage-row"
            class:off={s.hidden}
            class:lifting={drag?.id === s.id}
            class:drop-before={drag?.kind === group.kind && drag.gap === i}
            class:drop-after={drag?.kind === group.kind && drag.gap === group.rows.length && i === group.rows.length - 1}
          >
            <button
              type="button"
              class="handle"
              disabled={!draggable(s, group)}
              aria-label="Drag to move {s.label}. Arrow keys also move it."
              onkeydown={(e) => key(s, group, i, e)}
              use:dragRows={{
                enabled: draggable(s, group),
                rows: (handle) => [...handle.closest('ul').children],
                maxGap: maxGap(group),
                onstart: () => (drag = { id: s.id, kind: group.kind, gap: -1 }),
                onmove: (gap) => (drag = { id: s.id, kind: group.kind, gap }),
                ondrop: (gap) => {
                  drag = null;
                  if (gap >= 0) commit(moveStage(stages, s.id, gap));
                },
                oncancel: () => (drag = null),
              }}
            >⋮⋮</button>
            <div class="stage-main">
              <input id="stage-{s.id}" type="text" value={s.label} aria-label="Name of stage {s.label}" autocomplete="off" onchange={(e) => rename(s, e)} />
              <div class="stage-actions">
                {#if canAddAfter(s)}
                  <button type="button" class="act" onclick={() => added(addAfter(stages, s.id))}>＋ Add after this</button>
                {/if}
                {#if canHide(s)}
                  <button type="button" class="act" onclick={() => commit(setHidden(stages, s.id, !s.hidden))}>{s.hidden ? 'Show' : 'Hide'}</button>
                {/if}
                {#if isChanged(s)}
                  <button type="button" class="act" onclick={() => commit(restoreStage(stages, s.id))}>Restore</button>
                {/if}
              </div>
              {#if s.hidden}<div class="when">Hidden: pots can't move into it, pots in it keep it.</div>{/if}
            </div>
          </li>
        {/each}
      </ul>
      {#if group.add}
        <button type="button" class="btn" onclick={() => added(addAtEnd(stages, group.kind))}>{group.add}</button>
      {/if}
    {/each}

    <h2>Order notes</h2>
    <label class="switch-row">
      <input type="checkbox" role="switch" checked={notes} onchange={toggleNotes} />
      <span>Quietly note when a pot skips drying before the first firing, or glazing before the glaze firing.</span>
    </label>

    <h2>Start again</h2>
    {#if confirmAll}
      <div class="banner">Put every stage back to the original names, places and visibility? Stages you added are hidden, not deleted. No pot changes.</div>
      <button type="button" class="btn" onclick={restoreEverything}>Yes, restore the whole list</button>
      <button type="button" class="btn secondary" onclick={() => (confirmAll = false)}>Keep my stages</button>
    {:else}
      <button type="button" class="btn secondary" onclick={() => (confirmAll = true)}>Restore the whole list</button>
    {/if}
  </div>
</div>
