<script>
  import scenes from '../scenes.json';
  import SceneView from './SceneView.svelte';
  import Tabs from './Tabs.svelte';
  import { editor } from '../lib/editor.svelte.js';
  import { DEVICES, PLATFORMS, label } from '../lib/assets.js';
  import { media } from '../lib/media.svelte.js';

  let { artwork } = $props();
  let platform = $state('instagram');
  let preferred = $state(media.mobile ? 'mobile' : 'desktop');
  let expanded = $state(false);
  let sceneName = $state('profile');
  const platformKey = $derived(artwork === 'avatar' ? platform : artwork);
  const current = $derived(PLATFORMS.find((p) => p.key === platformKey));
  const devices = $derived(DEVICES.filter((d) => current.devices.includes(d.key)));
  const device = $derived(current.devices.includes(preferred) ? preferred : current.devices[0]);
  const available = $derived(scenes.filter((s) => s.platform === platformKey && s.device === device));
  const scene = $derived(available.find((s) => s.scene === (artwork === 'avatar' ? sceneName : 'profile')) ?? available[0]);
</script>

<section class="social-preview">
  <div class="preview-title">
    <h3>套用效果</h3>
    <span>{editor.hasPhoto ? '你的頭貼' : '示意頭貼'}</span>
  </div>

  {#if artwork === 'avatar'}
    <div class="sizes">
      {#each [96, 64, 40] as size}
        <figure>
          <img src={editor.avatarUrl} width={size} height={size} alt="{size} 像素{editor.hasPhoto ? '個人頭貼預覽' : '頭貼示意'}" />
          <figcaption>{size} px</figcaption>
        </figure>
      {/each}
    </div>
  {/if}

  {#snippet scenePreview()}
    <div class="scene-controls">
      {#if artwork === 'avatar'}
        <Tabs options={PLATFORMS} label="預覽平台" bind:value={platform} />
      {/if}
      {#if devices.length > 1}
        <Tabs options={devices} label="預覽裝置" bind:value={() => device, (value) => { preferred = value; }} />
      {/if}
      {#if artwork === 'avatar' && available.length > 1}
        <label class="scene-select">顯示位置
          <select value={scene.scene} onchange={(event) => { sceneName = event.currentTarget.value; }}>
            {#each available as item}
              <option value={item.scene}>{label(platformKey, item.scene)}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>
    <div class="scene" class:phone={device === 'mobile'}>
      {#key scene.platform + scene.id}
        <SceneView {scene} />
      {/key}
    </div>
    <p class="scene-note">版面為示意，實際裁切依裝置與平台而異。</p>
    {#if artwork === 'facebook' && device === 'mobile'}
      <p class="crop-note">手機可能裁去封面左右兩側；換上時請確認品牌與日期的位置。</p>
    {/if}
  {/snippet}

  {#if artwork === 'avatar'}
    <details bind:open={expanded}>
      <summary>在社群媒體版面裡看看</summary>
      {#if expanded}{@render scenePreview()}{/if}
    </details>
  {:else}
    {@render scenePreview()}
  {/if}
</section>

<style>
  .social-preview { min-width: 0; }
  .preview-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  h3 { margin: 0; font-size: 16px; font-weight: 550; }
  .preview-title span { font-size: 12px; color: var(--muted); }
  .sizes { display: flex; flex-wrap: wrap; justify-content: center; align-items: end; gap: 32px; padding: 52px 0 36px; }
  figure { margin: 0; text-align: center; }
  .sizes figure { flex-shrink: 0; }
  .sizes img { display: block; border-radius: 50%; background: var(--surface-2); }
  figcaption { margin-top: 12px; font: 11px/1.5 ui-monospace, monospace; color: var(--muted); }
  details { border-top: 1px solid var(--border); font-size: 14px; }
  .scene-controls { display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }
  .scene-select { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 13px; }
  select { background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
  .scene { width: 100%; margin: 0 auto; }
  .scene.phone { max-width: 300px; border: 5px solid #30364b; border-radius: 16px; overflow: hidden; }
  .scene-note, .crop-note { font-size: 12px; color: var(--muted); margin: 16px 0 0; }
  .crop-note { color: #e5ca99; }
  @media (max-width: 600px) {
    .sizes { gap: 12px; padding-top: 32px; }
    .scene-controls { gap: 10px; }
  }
</style>
