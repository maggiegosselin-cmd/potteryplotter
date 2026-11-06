import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Declarations of every flat rule whose selector list contains `selector`, merged in source order.
function declarationsFor(selector) {
  const out = {};
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!sel.split(',').some((s) => s.trim() === selector)) continue;
    for (const decl of body.split(';')) {
      const i = decl.indexOf(':');
      if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
    }
  }
  return out;
}

const DATE_SELECTORS = ["input[type='date']", ".add input[type='date']", ".history input[type='date']"];

test('date inputs can shrink to their container, so iOS does not widen the page', () => {
  for (const selector of DATE_SELECTORS.slice(1)) {
    const d = declarationsFor(selector);
    assert.equal(d['min-width'], '0', `${selector} min-width`);
    assert.equal(d['max-width'], '100%', `${selector} max-width`);
    assert.equal(d['width'], '100%', `${selector} width`);
    assert.equal(d['box-sizing'], 'border-box', `${selector} box-sizing`);
    assert.equal(d['-webkit-appearance'], 'none', `${selector} -webkit-appearance`);
    assert.equal(d['appearance'], 'none', `${selector} appearance`);
    assert.ok(parseInt(d['min-height'], 10) >= 64, `${selector} keeps the field height`);
  }
});

test('the date value is left-aligned like the other fields', () => {
  const d = declarationsFor("input[type='date']::-webkit-date-and-time-value");
  assert.equal(d['text-align'], 'left');
});

test('grid containers holding date inputs use a shrinkable column', () => {
  for (const selector of ['.add .screen', '.history li']) {
    assert.match(declarationsFor(selector)['grid-template-columns'] ?? '', /^minmax\(0,\s*1fr\)$/, selector);
  }
});

test('the add screen and body cannot scroll horizontally', () => {
  assert.equal(declarationsFor('.add')['overflow-x'], 'hidden');
  assert.equal(declarationsFor('body')['overflow-x'], 'hidden');
});
