<script>
  import AvatarCanvas from './AvatarCanvas.svelte';
  import FilePicker from './FilePicker.svelte';
  import FramePresets from './FramePresets.svelte';
  import { editor, setZoom, pan, resetCrop } from '../lib/editor.svelte.js';

  let { children, onphoto, photoFeedback = true } = $props();
  const error = $derived(editor.frameError || (photoFeedback ? editor.photoError : '') || editor.renderError);
  let frameRecovery = $state(false);
  // Keep recovery controls mounted after retry so keyboard focus is retained.
  $effect(() => { if (editor.frameError) frameRecovery = true; });
  const directions = [
    { label: '向左移動照片', arrow: '←', x: -24, y: 0 },
    { label: '向上移動照片', arrow: '↑', x: 0, y: -24 },
    { label: '向下移動照片', arrow: '↓', x: 0, y: 24 },
    { label: '向右移動照片', arrow: '→', x: 24, y: 0 },
  ];
</script>

<div class="editor">
  <h2 id="avatar-editor-title" tabindex="-1">製作頭貼</h2>

  <figure>
    <AvatarCanvas size={240} editable={editor.hasPhoto && !editor.busy && !editor.saving} />
    <figcaption>
      {#if editor.hasPhoto}
        拖曳或用方向鍵調整位置
      {:else}
        <span class="sample-label">套用示意</span>
      {/if}
    </figcaption>
  </figure>

  <FilePicker
    accept="image/*" title={editor.hasPhoto ? '換一張照片' : '選擇照片'}
    thumb={editor.photoThumb} primary={!editor.hasPhoto} disabled={editor.saving} onfile={onphoto}
  />
  <p class="privacy">照片只在你的瀏覽器處理</p>

  {#if editor.busy && photoFeedback}<p class="status" role="status">正在讀取圖片…</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if editor.hasPhoto}
    <div class="crop-controls">
      <div class="zoom-row">
        <label class="zoom">縮放
          <input
            type="range" min="1" max="3" step="0.01" value={editor.zoom}
            disabled={editor.busy || editor.saving} oninput={(e) => setZoom(+e.currentTarget.value)}
          >
        </label>
        <button class="reset" type="button" disabled={editor.busy || editor.saving} onclick={resetCrop}>重設</button>
      </div>
      <div class="move-controls" role="group" aria-label="移動照片">
        <span>位置</span>
        {#each directions as direction}
          <button
            class="move" type="button" aria-label={direction.label} title={direction.label}
            disabled={editor.busy || editor.saving} onclick={() => pan(direction.x, direction.y)}
          >{direction.arrow}</button>
        {/each}
      </div>
    </div>

    <div class="save">{#if children}{@render children()}{/if}</div>
  {/if}

  {#if editor.hasPhoto || frameRecovery}
    <details class="options" open={frameRecovery}>
      <summary>其他頭貼框</summary>
      <div class="frames"><FramePresets /></div>
    </details>
  {/if}
</div>

<style>
  .editor { min-width: 0; }
  h2 { margin: 0 0 24px; font-size: 22px; line-height: 1.3; letter-spacing: -.02em; }
  h2:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }
  figure { margin: 0 0 20px; }
  figcaption { margin-top: 12px; min-height: 24px; color: var(--muted); text-align: center; font-size: 12px; }
  .sample-label { display: inline-block; padding: 2px 9px; border: 1px solid var(--border); border-radius: 99px; }
  .privacy { margin: 10px 0 0; text-align: center; color: var(--muted); font-size: 12px; }
  .status, .error { margin: 14px 0 0; font-size: 13px; }
  .status { color: var(--muted); }
  .error { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; }

  .crop-controls { margin-top: 20px; }
  .zoom-row { display: flex; align-items: center; gap: 14px; }
  .zoom { display: flex; align-items: center; flex: 1; gap: 12px; min-width: 0; font-size: 13px; color: var(--muted); white-space: nowrap; }
  .zoom input { width: 100%; min-width: 0; min-height: 44px; accent-color: var(--accent); }
  .reset, .move { min-height: 44px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); cursor: pointer; }
  .reset { padding: 0 12px; font-size: 13px; }
  .move-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .move-controls > span { margin-right: auto; color: var(--muted); font-size: 13px; }
  .move { min-width: 44px; font-size: 20px; line-height: 1; }
  .reset:hover, .move:hover { border-color: var(--accent); }
  .reset:focus-visible, .move:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .save { margin-top: 22px; }

  .options { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }
  summary { width: fit-content; color: var(--muted); font-size: 13px; cursor: pointer; }
  .frames { margin-top: 14px; }
</style>
