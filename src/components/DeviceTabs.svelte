<script>
  import { DEVICES } from '../lib/assets.js';

  let { value = $bindable() } = $props();
</script>

<div class="tabs" role="tablist" aria-label="裝置">
  {#each DEVICES as d (d.key)}
    <button type="button" role="tab" aria-selected={value === d.key} onclick={() => { value = d.key; }}>{d.label}</button>
  {/each}
</div>

<style>
  .tabs { display: inline-flex; padding: 4px; gap: 4px; border-radius: 12px; background: var(--surface-2); }
  button {
    min-height: 40px; padding: 0 18px; border: 0; border-radius: 9px; background: transparent;
    font-weight: 600; font-size: 14px; color: var(--muted); cursor: pointer;
  }
  button[aria-selected="true"] { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
</style>
