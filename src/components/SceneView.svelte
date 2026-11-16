<script>
  import { editor } from '../lib/editor.svelte.js';
  import { pub, label } from '../lib/assets.js';

  // Renders a scene at its native viewport, scaled to fit. With a crop, only
  // that rectangle is shown, magnified up to crop.zoom within maxWidth.
  let { scene, crop = null, maxWidth = 0 } = $props();
  let iframe;
  let width = $state(0);
  let innerWidth = $state(0);

  const r = $derived(crop ?? { x: 0, y: 0, width: scene.width, height: scene.height });
  const z = $derived(crop
    ? Math.min(Math.min(maxWidth, innerWidth - 64) / r.width, crop.zoom)
    : width / r.width);

  function apply() {
    const doc = iframe?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('img[data-slot="avatar"]').forEach((img) => { img.src = editor.avatarUrl; });
    // Facebook draws avatars as an <image> inside a masked <svg>
    doc.querySelectorAll('image[data-slot="avatar"]').forEach((img) => { img.setAttribute('href', editor.avatarUrl); });
  }
  $effect(() => { editor.avatarUrl; apply(); });
</script>

<svelte:window bind:innerWidth />

<div class="fit" class:crop bind:clientWidth={width}>
  <div class="viewport" style:width="{r.width * z}px" style:height="{r.height * z}px">
    <iframe
      bind:this={iframe} src={pub(`scenes/${scene.platform}/${scene.id}.html`)}
      title="{scene.platform} {scene.device} {label(scene.platform, scene.scene)}"
      tabindex="-1" loading="lazy" width={scene.width} height={scene.height} onload={apply}
      style:transform="scale({z}) translate({-r.x}px, {-r.y}px)"
    ></iframe>
  </div>
</div>

<style>
  .fit.crop { display: grid; place-items: center; }
  .viewport { position: relative; overflow: hidden; border-radius: 8px; background: #0c1014; }
  iframe {
    position: absolute; left: 0; top: 0; border: 0; transform-origin: 0 0; pointer-events: none; background: #0c1014;
  }
</style>
