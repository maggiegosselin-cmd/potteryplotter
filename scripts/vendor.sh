#!/bin/sh
# Copies the two browser libraries into public/vendor/ as plain module files.
# There is no bundler: the browser loads these files as they are, and the
# service worker stores them for offline use.
#
#   dexie        IndexedDB wrapper (free core, Apache-2.0)
#   htm/preact   Preact and htm tagged templates in one file (MIT / Apache-2.0)
#
# Needs Node's npm and a network connection, once. Run from the repository root.
set -eu

DEXIE_VERSION=4.4.2
HTM_VERSION=3.1.1

OUT="${1:-$(pwd)/public/vendor}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

(
  cd "$WORK"
  npm init -y >/dev/null
  npm install --ignore-scripts --no-audit --no-fund "dexie@$DEXIE_VERSION" "htm@$HTM_VERSION"
)

mkdir -p "$OUT"
# The source-map comment points at a file we do not ship.
sed '/^\/\/# sourceMappingURL/d' "$WORK/node_modules/dexie/dist/modern/dexie.min.mjs" > "$OUT/dexie.mjs"
cp "$WORK/node_modules/htm/preact/standalone.module.js" "$OUT/preact-htm.js"
cp "$WORK/node_modules/dexie/LICENSE" "$OUT/LICENSE.dexie" 2>/dev/null || true
cp "$WORK/node_modules/htm/LICENSE" "$OUT/LICENSE.htm" 2>/dev/null || true

# Fail loudly if a library no longer exports what the app imports.
grep -q 'Dexie' "$OUT/dexie.mjs"
node --input-type=module -e "
import('file://$OUT/preact-htm.js').then((m) => {
  for (const name of ['html', 'render', 'useState', 'useEffect', 'useRef']) {
    if (typeof m[name] !== 'function') { console.error('preact-htm.js lacks ' + name); process.exit(1); }
  }
});
"
echo "Vendored dexie@$DEXIE_VERSION and htm@$HTM_VERSION into $OUT"
