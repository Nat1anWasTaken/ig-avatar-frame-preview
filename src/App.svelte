<script>
  import scenes from './scenes.json';
  import Editor from './components/Editor.svelte';
  import BottomSheet from './components/BottomSheet.svelte';
  import DeviceTabs from './components/DeviceTabs.svelte';
  import SceneGroup from './components/SceneGroup.svelte';
  import { DEVICES } from './lib/assets.js';
  import { media } from './lib/media.svelte.js';

  let device = $state(media.mobile ? 'mobile' : 'desktop');
  const current = $derived(DEVICES.find((d) => d.key === device));
</script>

<div class="wrap" class:with-sheet={media.mobile}>
  <header>
    <h1>頭像框預覽</h1>
    <p>上傳你的大頭貼，再選一個頭像框，就能看到它在 Instagram 限時動態、摯友、貼文、私訊和便利貼裡的樣子。圖片只在你的瀏覽器裡處理，不會上傳。</p>
  </header>

  <div class="layout">
    {#if !media.mobile}
      <aside class="panel" aria-label="設定"><Editor /></aside>
    {/if}

    <main>
      <div class="toolbar">
        <DeviceTabs bind:value={device} />
        <p>{current.description}</p>
      </div>
      <!-- only the selected device's scenes are mounted -->
      {#key device}
        <SceneGroup {device} scenes={scenes.filter((s) => s.device === device)} />
      {/key}
    </main>
  </div>

  <footer>
    畫面是去識別化的 Instagram 網頁靜態快照，所有名稱、照片與內容都是佔位資料。Instagram 是 Meta 的商標，本工具與 Meta 無關。
  </footer>
</div>

{#if media.mobile}
  <BottomSheet><Editor compact /></BottomSheet>
{/if}

<style>
  .wrap { max-width: 1240px; margin: 0 auto; padding: 32px 16px 64px; }
  .wrap.with-sheet { padding-top: 20px; padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)); }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; letter-spacing: -.01em; }
  header p { margin: 0; color: var(--muted); max-width: 60ch; }

  .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 28px; margin-top: 28px; align-items: start; }
  .panel {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow);
    padding: 20px; position: sticky; top: 16px;
  }

  .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-bottom: 18px; }
  .toolbar p { margin: 0; color: var(--muted); font-size: 14px; }

  footer { margin-top: 48px; color: var(--muted); font-size: 13px; }

  @media (max-width: 900px) {
    .layout { grid-template-columns: minmax(0, 1fr); margin-top: 20px; }
    h1 { font-size: 24px; }
    header p { font-size: 14px; }
  }
</style>
