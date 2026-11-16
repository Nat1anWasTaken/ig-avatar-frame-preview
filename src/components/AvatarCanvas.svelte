<script>
  import { editor, source, SIZE, pan, setZoom } from '../lib/editor.svelte.js';

  let { size = 200 } = $props();
  let canvas;

  $effect(() => {
    editor.version;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(source, 0, 0);
  });

  // one pointer drags the photo, two pinch to zoom
  const pointers = new Map();
  let pinch = null;
  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function down(e) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinch = { d: distance(), zoom: editor.zoom };
  }
  function move(e) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {
      setZoom(pinch.zoom * distance() / pinch.d);
    } else {
      const r = SIZE / canvas.getBoundingClientRect().width;
      pan((e.clientX - prev.x) * r, (e.clientY - prev.y) * r);
    }
  }
  function up(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
  }
</script>

<div class="composite">
  <canvas
    bind:this={canvas} width={SIZE} height={SIZE} style:--size="{size}px"
    aria-label="合成後的大頭貼，可拖曳調整位置"
    onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}
  ></canvas>
</div>

<style>
  .composite { display: grid; place-items: center; }
  canvas {
    width: var(--size); height: var(--size); border-radius: 50%; background: var(--surface-2);
    cursor: grab; touch-action: none; box-shadow: 0 0 0 1px var(--border);
  }
  canvas:active { cursor: grabbing; }
</style>
