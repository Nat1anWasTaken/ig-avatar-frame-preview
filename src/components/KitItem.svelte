<script>
  // One downloadable piece of the campaign kit: thumbnail, name and a save button.
  let { thumb, title, round = false, onsave } = $props();
</script>

<div class="item">
  <img class="thumb" class:round src={thumb} alt="">
  <strong>{title}</strong>
  <button class="save" type="button" onclick={onsave}>
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    下載
  </button>
</div>

<style>
  .item { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .thumb { width: 64px; height: 44px; border-radius: 8px; object-fit: cover; background: var(--surface-2); flex: none; box-shadow: 0 0 0 1px var(--border); }
  .thumb.round { width: 44px; border-radius: 50%; margin: 0 10px; }
  strong { flex: 1; min-width: 0; font-size: 14px; }
  .save {
    flex: none; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 12px;
    border: 0; border-radius: 999px; background: var(--accent); color: var(--accent-text); font-weight: 600; font-size: 14px; cursor: pointer;
  }
  @media (pointer: coarse) { .save { height: 40px; } }
</style>
