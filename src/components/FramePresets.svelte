<script>
  import { PRESETS } from '../lib/assets.js';
  import { editor, choosePreset } from '../lib/editor.svelte.js';
</script>

<div class="chips" role="group" aria-label="頭像框範本">
  {#each PRESETS as p (p.key)}
    <button class="chip" type="button" aria-pressed={editor.preset === p.key} onclick={() => choosePreset(p.key)}>
      {p.label}
    </button>
  {/each}
</div>

<style>
  .chips { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .chip {
    font-size: 13px; min-height: 36px; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border);
    background: var(--surface); cursor: pointer;
  }
  .chip[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }
  @media (pointer: coarse) { .chip { min-height: 40px; } }
</style>
