<script>
  import { PRESETS } from '../lib/assets.js';
  import { editor, choosePreset, setFrameFile } from '../lib/editor.svelte.js';

  // a custom frame is active once one was uploaded and no preset is picked
  const custom = $derived(editor.preset === null && editor.frame !== null);
</script>

<div class="tiles" role="group" aria-label="頭像框範本">
  {#each PRESETS as p (p.key)}
    <button class="tile" type="button" aria-pressed={editor.preset === p.key} onclick={() => choosePreset(p.key)}>
      <span class="art" class:empty={!p.src} style:background-image={p.src ? `url("${p.src}")` : 'none'}></span>
      <span class="name">{p.label}</span>
    </button>
  {/each}
  {#if custom}
    <button class="tile" type="button" aria-pressed="true">
      <span class="art" style:background-image={`url("${editor.frameThumb}")`}></span>
      <span class="name" title={editor.frameName}>自訂頭像框</span>
    </button>
  {/if}
</div>

<label class="upload">
  <input type="file" accept="image/png,image/webp,image/svg+xml,image/*"
    onchange={(e) => e.currentTarget.files[0] && setFrameFile(e.currentTarget.files[0])}>
  <u>{custom ? '換一張自己的頭像框' : '或上傳自己的頭像框'}</u>
</label>

<style>
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
  .tile {
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 8px 10px;
    border: 1.5px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text);
    cursor: pointer; transition: border-color .15s, background .15s;
  }
  .tile:hover { border-color: var(--muted); }
  .tile[aria-pressed="true"] { border-color: var(--accent); background: var(--surface-2); box-shadow: 0 0 0 1px var(--accent); }
  .art { width: 64px; height: 64px; border-radius: 50%; background: var(--surface-2) center/cover no-repeat; }
  .art.empty { border: 1.5px dashed var(--border); background: none; }
  .name { font-size: 13px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .upload {
    display: inline-flex; align-items: center; margin-top: 12px; min-height: 32px; padding: 6px 0;
    font-size: 13px; color: var(--muted); cursor: pointer;
  }
  .upload:hover, .upload:focus-within { color: var(--text); }
  .upload u { text-underline-offset: 3px; }
  input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  @media (pointer: coarse) { .upload { min-height: 40px; } }
</style>
