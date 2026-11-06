import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
const rule = (selector) => {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `rule ${selector} exists`);
  return css.slice(start + 1, css.indexOf('}', start) + 1);
};

test('the palette tokens are the four fills on a lighter paper', () => {
  for (const [name, value] of [['amber', '#ffbf00'], ['gold', '#cfb53b'], ['lavender', '#e0b0ff'], ['cream', '#ecebcb']]) {
    assert.match(css, new RegExp(`--${name}: ${value};`));
  }
  assert.doesNotMatch(css, /--(blue-grey|sand)/);
  assert.doesNotMatch(css, /#c9962b|#e0a23a/i);
});

test('button-like controls are solid fills with no outline', () => {
  for (const selector of ['.btn', '.chip', '.pick', '.card-btn', '.move', '.mini', '.glaze-chip', '.thumb', '.add-after']) {
    assert.match(rule(selector), /border: 0;/, `${selector} has no border`);
  }
  assert.match(rule('.stage-count'), /border: 0;/);
});

test('text fields keep a 2px ink line', () => {
  assert.match(css, /--ink-line: 2px;/);
  assert.match(css, /\.add input\[type='text'\][^{]*\{[^}]*border: var\(--ink-line\) solid var\(--ink\)/);
});

test('the install button is gold, and the body font is a bundled rounded sans-serif', () => {
  assert.match(rule('.btn.gold'), /background: var\(--gold\);/);
  assert.match(rule('.btn.gold:active'), /background: var\(--gold-press\);/);
  assert.match(css, /--font-body: 'Nunito', ui-rounded, system-ui, sans-serif;/);
  assert.match(rule('html'), /font-size: 100%;/);
});
