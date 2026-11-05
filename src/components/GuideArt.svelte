<script>
  // Hand-drawn ink pictures for the install guide, one per `art` name in src/content/guide.js.
  // Plain inline SVG: ink lines, the key control circled in clay red. No image files.
  let { art } = $props();
</script>

<svg class="art" viewBox="0 0 240 170" role="img" aria-label="" fill="none" stroke="#2b211b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  {#if art === 'share'}
    <!-- Safari page with its bottom toolbar; Share is circled -->
    <path d="M74 8 Q120 4 166 9 L168 160 Q120 165 72 160 Z" fill="#fff" />
    <path d="M86 24 L154 23 M86 38 L142 38 M86 52 L150 51" stroke-width="2" />
    <path d="M74 128 L168 127" stroke-width="2" />
    <path d="M92 150 l-6 -6 l6 -6 M96 150 h6 M146 150 l6 -6 l-6 -6 M120 148 v-14 M114 140 l6 -7 l6 7 M113 138 h-3 v11 h20 v-11 h-3" stroke-width="2.5" />
    <path d="M104 136 Q120 120 138 134 Q146 152 122 158 Q98 156 104 136 Z" stroke="#b5583a" stroke-width="4" />
  {:else if art === 'add'}
    <!-- Share sheet rows; "Add to Home Screen" circled -->
    <path d="M52 20 Q120 12 188 20 L190 164 L50 164 Z" fill="#fff" />
    <path d="M64 40 h72 M64 66 h60 M64 120 h70" stroke-width="2.5" />
    <rect x="62" y="84" width="14" height="14" rx="3" stroke-width="2.5" />
    <path d="M69 88 v6 M66 91 h6" stroke-width="2" />
    <path d="M84 91 h90" stroke-width="3.5" />
    <path d="M56 80 Q120 70 184 78 Q194 92 182 104 Q120 112 58 104 Q46 92 56 80 Z" stroke="#b5583a" stroke-width="4" />
  {:else if art === 'webapp'}
    <!-- Add to Home Screen dialog; the switched-on Open as Web App is circled -->
    <path d="M40 14 Q120 8 200 14 L202 160 L38 160 Z" fill="#fff" />
    <rect x="52" y="26" width="30" height="30" rx="8" fill="#e7d3b3" />
    <path d="M94 34 h70 M94 48 h50" stroke-width="2.5" />
    <path d="M52 74 h136" stroke-width="2" />
    <path d="M56 98 h66" stroke-width="3" />
    <rect x="148" y="86" width="40" height="22" rx="11" fill="#2f6b3a" stroke="#2f6b3a" />
    <circle cx="177" cy="97" r="8" fill="#fff" stroke="#fff" />
    <path d="M142 80 Q170 68 196 80 Q204 98 192 114 Q166 122 142 114 Q132 96 142 80 Z" stroke="#b5583a" stroke-width="4" />
    <path d="M150 138 h40" stroke-width="3" />
  {:else if art === 'install'}
    <!-- Android: the Install button, circled -->
    <path d="M74 8 Q120 4 166 9 L168 160 Q120 165 72 160 Z" fill="#fff" />
    <path d="M86 26 h68 M86 40 h50" stroke-width="2" />
    <rect x="84" y="104" width="72" height="30" rx="10" fill="#b5583a" stroke="#b5583a" />
    <path d="M100 119 h40" stroke="#fff" stroke-width="4" />
    <path d="M76 98 Q120 88 164 98 Q172 120 162 142 Q120 150 78 142 Q68 120 76 98 Z" stroke="#b5583a" stroke-width="4" />
  {:else if art === 'menu'}
    <!-- Chrome top bar; the three dots are circled -->
    <path d="M74 8 Q120 4 166 9 L168 160 Q120 165 72 160 Z" fill="#fff" />
    <path d="M84 26 Q112 20 140 26" stroke-width="2.5" />
    <path d="M86 56 h60 M86 70 h48" stroke-width="2" />
    <circle cx="152" cy="25" r="2" fill="#2b211b" /><circle cx="152" cy="31" r="2" fill="#2b211b" /><circle cx="152" cy="19" r="2" fill="#2b211b" />
    <path d="M140 14 Q152 4 164 14 Q168 30 156 40 Q142 40 138 28 Q134 18 140 14 Z" stroke="#b5583a" stroke-width="4" />
  {:else if art === 'menuInstall'}
    <!-- Chrome menu rows; Install app circled -->
    <path d="M60 12 Q120 8 180 12 L182 160 L58 160 Z" fill="#fff" />
    <path d="M72 32 h70 M72 56 h56 M72 112 h64 M72 136 h50" stroke-width="2.5" />
    <path d="M72 84 h84" stroke-width="3.5" />
    <path d="M64 70 Q120 62 178 70 Q188 84 176 98 Q120 106 66 98 Q54 84 64 70 Z" stroke="#b5583a" stroke-width="4" />
  {:else if art === 'inApp'}
    <!-- In-app window; the three dots and Open in browser are circled -->
    <path d="M74 8 Q120 4 166 9 L168 160 Q120 165 72 160 Z" fill="#fff" />
    <path d="M84 22 h40" stroke-width="3" />
    <circle cx="150" cy="22" r="2" fill="#2b211b" /><circle cx="157" cy="22" r="2" fill="#2b211b" /><circle cx="143" cy="22" r="2" fill="#2b211b" />
    <path d="M136 10 Q152 2 166 12 Q170 30 156 34 Q138 34 134 22 Z" stroke="#b5583a" stroke-width="4" />
    <path d="M90 70 h60 M90 90 h46" stroke-width="2" />
    <path d="M92 124 l10 -10 M102 114 h-8 M102 114 v8" stroke-width="3" />
    <path d="M112 119 h38" stroke-width="3.5" />
    <path d="M86 106 Q120 98 156 106 Q162 120 154 134 Q120 140 88 134 Q80 120 86 106 Z" stroke="#b5583a" stroke-width="4" />
  {/if}
</svg>
