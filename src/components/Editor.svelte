<script>
  import AvatarCanvas from './AvatarCanvas.svelte';
  import FilePicker from './FilePicker.svelte';
  import FramePresets from './FramePresets.svelte';
  import { editor, setPhoto, setZoom, download } from '../lib/editor.svelte.js';

  // compact: the side-by-side layout used in the bottom sheet
  let { compact = false } = $props();
</script>

<div class="editor" class:compact>
  <div class="step preview">
    <AvatarCanvas size={compact ? 132 : 200} />
    <div class="adjust">
      <p class="hint">拖曳圓圈可移動照片位置{compact ? '，雙指可縮放' : ''}</p>
      <label class="slider">縮放
        <input type="range" data-vaul-no-drag min="1" max="3" step="0.01" value={editor.zoom} oninput={(e) => setZoom(+e.currentTarget.value)}>
      </label>
      {#if compact}<button class="btn" type="button" onclick={download}>下載頭像</button>{/if}
    </div>
  </div>

  <div class="step">
    <h2>1 · 大頭貼</h2>
    <FilePicker accept="image/*" title="選擇照片" hint={editor.photoName} thumb={editor.photoThumb} onfile={setPhoto} />
  </div>

  <div class="step">
    <h2>2 · 頭像框</h2>
    <FramePresets />
  </div>

  {#if !compact}
    <div class="step">
      <button class="btn" type="button" onclick={download}>下載頭像</button>
    </div>
  {/if}
</div>

<style>
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 10px; font-weight: 600; }
  .step + .step { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }
  .hint { font-size: 13px; color: var(--muted); text-align: center; margin: 8px 0 12px; }

  .slider { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
  .slider input { width: 100%; min-height: 32px; accent-color: var(--accent); }

  .compact .preview { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: center; }
  .compact .hint { text-align: left; margin: 0 0 8px; }
  .compact .adjust .btn { margin-top: 10px; min-height: 40px; padding: 8px 12px; font-size: 14px; }
  .compact .step + .step { margin-top: 16px; padding-top: 16px; }
  @media (pointer: coarse) { .slider input { min-height: 40px; } }
</style>
