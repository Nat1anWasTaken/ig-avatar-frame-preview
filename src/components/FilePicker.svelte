<script>
  let { accept = 'image/*', title, thumb, primary = false, onfile } = $props();
  const inputId = $props.id();
  let over = $state(false);

  function select(e) {
    const file = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (file) onfile(file);
  }

  function drop(e) {
    e.preventDefault();
    over = false;
    const file = e.dataTransfer.files[0];
    if (file) onfile(file);
  }
</script>

<label
  for={inputId} class="drop" class:over class:primary
  ondragover={(e) => { e.preventDefault(); over = true; }}
  ondragleave={() => { over = false; }} ondrop={drop}
>
  <input id={inputId} type="file" {accept} onchange={select}>
  {#if primary}
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
  {:else if thumb}
    <img class="thumb" src={thumb} alt="">
  {/if}
  <span>{title}</span>
</label>

<style>
  .drop {
    display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 10px 14px;
    border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); cursor: pointer;
    font-size: 14px; font-weight: 600; transition: border-color .15s, background .15s;
  }
  .drop:hover, .drop.over { border-color: var(--accent); }
  .drop.primary { border-color: transparent; background: var(--accent); color: var(--accent-text); }
  .drop.primary:hover, .drop.primary.over { filter: brightness(1.08); }
  .drop:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 4px; }
  input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .icon { width: 20px; height: 20px; flex: none; }
  .thumb { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex: none; }
</style>
