<script>
  import scenes from './scenes.json';
  import Editor from './components/Editor.svelte';
  import BottomSheet from './components/BottomSheet.svelte';
  import Tabs from './components/Tabs.svelte';
  import SceneGroup from './components/SceneGroup.svelte';
  import { PLATFORMS, DEVICES } from './lib/assets.js';
  import { media } from './lib/media.svelte.js';

  // the platform choice is kept in the URL hash
  const fromHash = location.hash.slice(1);
  let platform = $state(PLATFORMS.some((p) => p.key === fromHash) ? fromHash : 'instagram');
  $effect(() => { history.replaceState(null, '', `#${platform}`); });
  const current = $derived(PLATFORMS.find((p) => p.key === platform));

  let preferred = $state(media.mobile ? 'mobile' : 'desktop');
  // LINE only has a phone app, so its device falls back to what it has
  const devices = $derived(DEVICES.filter((d) => current.devices.includes(d.key)));
  const device = $derived(current.devices.includes(preferred) ? preferred : current.devices[0]);
</script>

<div class="wrap" class:with-sheet={media.mobile}>
  <header>
    <h1>換上 SITCON 2027</h1>
  </header>

  <div class="layout">
    {#if !media.mobile}
      <aside class="panel" aria-label="設定"><Editor /></aside>
    {/if}

    <main>
      <div class="toolbar">
        <Tabs options={PLATFORMS} label="平台" bind:value={platform} />
        {#if devices.length > 1}
          <Tabs options={devices} label="裝置" bind:value={() => device, (v) => { preferred = v; }} />
        {/if}
      </div>
      <!-- only the selected platform's and device's scenes are mounted -->
      {#key platform + device}
        <SceneGroup {device} scenes={scenes.filter((s) => s.platform === platform && s.device === device)} />
      {/key}
    </main>
  </div>
</div>

{#if media.mobile}
  <BottomSheet><Editor compact /></BottomSheet>
{/if}

<style>
  .wrap { max-width: 1240px; margin: 0 auto; padding: 32px 16px 64px; }
  .wrap.with-sheet { padding-top: 20px; padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)); }
  h1 { font-size: 28px; line-height: 1.2; margin: 0; letter-spacing: -.01em; }

  .layout { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 28px; margin-top: 28px; align-items: start; }
  .panel {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow);
    padding: 20px; position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow-y: auto;
  }

  .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-bottom: 18px; }


  @media (max-width: 900px) {
    .layout { grid-template-columns: minmax(0, 1fr); margin-top: 20px; }
    h1 { font-size: 24px; }
  }
</style>
