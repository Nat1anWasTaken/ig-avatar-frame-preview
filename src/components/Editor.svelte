<script>
  import AvatarCanvas from './AvatarCanvas.svelte';
  import FilePicker from './FilePicker.svelte';
  import FramePresets from './FramePresets.svelte';
  import KitItem from './KitItem.svelte';
  import { editor, setPhoto, setZoom, download, save } from '../lib/editor.svelte.js';
  import { PLATFORMS } from '../lib/assets.js';

  // compact: the side-by-side layout used in the bottom sheet
  let { compact = false } = $props();
  let kit;
</script>

<div class="editor" class:compact>
  <div class="step preview">
    <AvatarCanvas size={compact ? 132 : 200} />
    <div class="adjust">
      <label class="slider">縮放
        <input type="range" data-vaul-no-drag min="1" max="3" step="0.01" value={editor.zoom} oninput={(e) => setZoom(+e.currentTarget.value)}>
      </label>
      {#if compact}
        <button class="btn" type="button" onclick={download}>下載頭像</button>
        <!-- the banners sit below the fold of the sheet, so point at them -->
        <button class="jump" type="button" onclick={() => kit.scrollIntoView({ behavior: 'smooth', block: 'start' })}>封面與背景 ↓</button>
      {/if}
    </div>
  </div>

  <div class="step">
    <h2>1 · 選照片</h2>
    <FilePicker accept="image/*" title={editor.photoThumb ? '換一張照片' : '選擇你的照片'} thumb={editor.photoThumb} primary={!editor.photoThumb} onfile={setPhoto} />
    <details class="tip">
      <summary>想用現在的 IG / FB 大頭貼？</summary>
      <p><strong>Facebook</strong>：到個人檔案，點大頭貼 →「查看大頭貼照」→ 右上角「⋯」→「儲存到手機」（電腦版為「下載」）。</p>
      <p><strong>Instagram</strong>：無法直接儲存大頭貼，畫面上的圖片解析度也很低。建議從手機相簿找原圖；或到「帳號管理中心」→「你的資訊和權限」→「匯出你的資訊」申請，檔案裡會有原始大頭貼。</p>
    </details>
  </div>

  <div class="step">
    <h2>2 · 選頭像框</h2>
    <FramePresets />
  </div>

  <div class="step" bind:this={kit}>
    <h2>3 · 下載並換上</h2>
    <div class="kit">
      <KitItem thumb={editor.avatarUrl} round title="大頭貼" onsave={download} />
      {#each PLATFORMS.filter((p) => p.banner) as p (p.key)}
        <KitItem thumb={p.banner.src} title="{p.label} {p.banner.label}" onsave={() => save(p.banner.src, p.banner.file)} />
      {/each}
    </div>
  </div>
</div>

<style>
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 10px; font-weight: 600; }
  .step + .step { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }

  .kit { display: grid; gap: 12px; }

  .tip { margin-top: 10px; font-size: 13px; color: var(--muted); }
  .tip summary { cursor: pointer; width: fit-content; }
  .tip summary:hover { color: var(--accent); }
  .tip p { margin: 8px 0 0; line-height: 1.6; }
  .tip strong { color: var(--text); font-weight: 600; }

  .slider { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
  .slider input { width: 100%; min-height: 32px; accent-color: var(--accent); }

  .compact .preview { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 16px; align-items: center; }
  .compact .adjust .btn { margin-top: 10px; min-height: 40px; padding: 8px 12px; font-size: 14px; }
  .jump { display: block; margin: 6px auto 0; min-height: 32px; padding: 0; border: 0; background: none; font-size: 13px; color: var(--accent); cursor: pointer; }
  .compact .step + .step { margin-top: 16px; padding-top: 16px; }
  @media (pointer: coarse) { .slider input { min-height: 40px; } }
</style>
