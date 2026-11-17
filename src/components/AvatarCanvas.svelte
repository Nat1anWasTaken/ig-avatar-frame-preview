<script>
  import { editor, source, SIZE, pan, setZoom } from '../lib/editor.svelte.js';
  import { CAMPAIGN } from '../lib/assets.js';

  let { size = 240, editable = false } = $props();
  let canvas;

  $effect(() => {
    editor.version;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(source, 0, 0);
  });

  const pointers = new Map();
  let pinch = null;
  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function down(e) {
    if (!editable || pointers.size === 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinch = { d: Math.max(distance(), 1), zoom: editor.zoom };
  }
  function move(e) {
    const prev = pointers.get(e.pointerId);
    if (!editable || !prev) return;
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

  function keydown(e) {
    if (!editable || e.altKey || e.ctrlKey || e.metaKey) return;
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!direction) return;
    e.preventDefault();
    const step = e.shiftKey ? 72 : 24;
    pan(direction[0] * step, direction[1] * step);
  }
</script>

<div class="composite">
  <canvas
    bind:this={canvas} class:editable width={SIZE} height={SIZE} style:--size="{size}px"
    role={editable ? 'application' : 'img'} tabindex={editable ? 0 : undefined}
    aria-label={editable ? '頭貼位置，使用方向鍵移動照片' : editor.hasPhoto ? '你的頭貼預覽' : `${CAMPAIGN.name} 頭貼套用示意`}
    onkeydown={keydown} onpointerdown={down} onpointermove={move}
    onpointerup={up} onpointercancel={up} onlostpointercapture={up}
  ></canvas>
</div>

<style>
  .composite { display: grid; place-items: center; }
  canvas {
    display: block; width: min(var(--size), 100%); height: auto; aspect-ratio: 1; border-radius: 50%;
    background: var(--surface-2); box-shadow: 0 0 0 1px var(--border), 0 12px 40px rgba(0,0,0,.16);
  }
  canvas.editable { cursor: grab; touch-action: none; }
  canvas.editable:active { cursor: grabbing; }
  canvas:focus-visible { outline: 3px solid var(--accent); outline-offset: 6px; }
</style>
