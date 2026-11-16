<script>
  import SceneView from './SceneView.svelte';
  import { LABELS } from '../lib/assets.js';

  let { device, scenes } = $props();

  // small spots get magnified more; large ones are capped by the card width
  const closeups = $derived(scenes.flatMap((sc) => sc.crops.map((c) => ({
    sc, crop: { ...c, zoom: c.width < 160 ? (device === 'mobile' ? 2 : 2.4) : 1.2 },
  }))));
</script>

<div class="closeups">
  {#each closeups as { sc, crop } (sc.id + crop.name)}
    <figure class="closeup">
      <SceneView scene={sc} {crop} maxWidth={340} />
      <figcaption>{LABELS[crop.name] || crop.name} · {LABELS[sc.scene]}</figcaption>
    </figure>
  {/each}
</div>

<div class="scenes {device}">
  {#each scenes as sc (sc.id)}
    <figure class="scene">
      <SceneView scene={sc} />
      <figcaption>{LABELS[sc.scene]}</figcaption>
    </figure>
  {/each}
</div>

<style>
  figure { margin: 0; }
  figcaption { font-size: 13px; color: var(--muted); margin-top: 8px; }

  .closeups { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
  .closeup { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px; box-shadow: var(--shadow); }
  @media (max-width: 420px) {
    .closeup { flex: 1 1 100%; }
    .closeup figcaption { text-align: center; }
  }

  .scenes { display: grid; gap: 18px; }
  .scenes.desktop { grid-template-columns: minmax(0, 1fr); }
  .scenes.mobile { grid-template-columns: repeat(auto-fill, minmax(260px, 340px)); justify-content: center; }
  .scene :global(.viewport) { border-radius: 12px; box-shadow: var(--shadow); }
  .scenes.mobile :global(.viewport) { border-radius: 28px; outline: 6px solid var(--surface-2); }
  .scenes.mobile .scene { padding: 6px; }
  .scenes.mobile figcaption { text-align: center; }
</style>
