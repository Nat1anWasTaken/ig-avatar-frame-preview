<script>
  // primary: nothing picked yet, so the picker is the call to action
  let { accept, title, thumb, primary = false, onfile } = $props();
  let over = $state(false);

  function drop(e) {
    e.preventDefault(); over = false;
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onfile(f);
  }
</script>

<label
  class="drop" class:over class:primary
  ondragover={(e) => { e.preventDefault(); over = true; }}
  ondragleave={() => { over = false; }}
  ondrop={drop}
>
  <input type="file" {accept} onchange={(e) => e.currentTarget.files[0] && onfile(e.currentTarget.files[0])}>
  {#if primary}
    <svg class="thumb icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
  {:else}
    <span class="thumb" style:background-image={thumb ? `url("${thumb}")` : 'none'}></span>
  {/if}
  <strong class="label">{title}</strong>
</label>

<style>
  .drop {
    display: flex; align-items: center; gap: 12px; padding: 12px; border: 1.5px dashed var(--border);
    border-radius: 12px; cursor: pointer; transition: border-color .15s, background .15s;
  }
  .drop:hover, .drop.over, .drop:focus-within { border-color: var(--accent); background: var(--surface-2); }
  .drop.primary { border: 0; background: var(--accent); color: var(--accent-text); }
  .drop.primary:hover, .drop.primary.over, .drop.primary:focus-within { background: var(--accent); filter: brightness(1.08); }
  input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .thumb { width: 44px; height: 44px; border-radius: 10px; background: var(--surface-2) center/cover no-repeat; flex: none; }
  .thumb.icon { padding: 9px; background: rgba(255,255,255,.18); }
  .label { min-width: 0; font-size: 14px; }
</style>
