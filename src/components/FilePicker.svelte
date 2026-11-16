<script>
  let { accept, title, hint, thumb, onfile } = $props();
  let over = $state(false);

  function drop(e) {
    e.preventDefault(); over = false;
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onfile(f);
  }
</script>

<label
  class="drop" class:over
  ondragover={(e) => { e.preventDefault(); over = true; }}
  ondragleave={() => { over = false; }}
  ondrop={drop}
>
  <input type="file" {accept} onchange={(e) => e.currentTarget.files[0] && onfile(e.currentTarget.files[0])}>
  <span class="thumb" style:background-image={thumb ? `url("${thumb}")` : 'none'}></span>
  <span class="label"><strong>{title}</strong><span>{hint}</span></span>
</label>

<style>
  .drop {
    display: flex; align-items: center; gap: 12px; padding: 12px; border: 1.5px dashed var(--border);
    border-radius: 12px; cursor: pointer; transition: border-color .15s, background .15s;
  }
  .drop:hover, .drop.over, .drop:focus-within { border-color: var(--accent); background: var(--surface-2); }
  input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .thumb { width: 44px; height: 44px; border-radius: 10px; background: var(--surface-2) center/cover no-repeat; flex: none; }
  .label { min-width: 0; }
  .label strong { display: block; font-size: 14px; }
  .label span { display: block; font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
