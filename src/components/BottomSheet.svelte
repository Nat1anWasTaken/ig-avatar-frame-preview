<script>
  import { editor, download } from '../lib/editor.svelte.js';

  let { children } = $props();
  let open = $state(false);
  let drag = $state(null);

  // drag the bar to open or close; a tap toggles
  function down(e) {
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag = { start: e.clientY, offset: 0 };
  }
  function move(e) {
    if (!drag) return;
    const d = e.clientY - drag.start;
    drag.offset = open ? Math.max(0, d) : Math.min(0, d);
  }
  function up() {
    if (!drag) return;
    const d = Math.abs(drag.offset);
    if (d > 60 || d < 4) open = !open;
    drag = null;
  }
</script>

<section class="sheet" class:open class:dragging={drag} style:--drag="{drag?.offset ?? 0}px" aria-label="編輯頭像">
  <div class="bar" role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <span class="grip"></span>
    <div class="peek">
      <img src={editor.avatarUrl} alt="">
      <div class="meta">
        <strong>你的大頭貼</strong>
        <span>{editor.frameName}</span>
      </div>
      <button class="icon" type="button" aria-label="下載合成後的大頭貼" onclick={download}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="toggle" type="button" aria-expanded={open} onclick={() => { open = !open; }}>{open ? '完成' : '調整'}</button>
    </div>
  </div>
  <div class="body" inert={!open}>
    {@render children()}
  </div>
</section>

<style>
  .sheet {
    --peek: calc(76px + env(safe-area-inset-bottom, 0px));
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
    display: flex; flex-direction: column; max-height: 72dvh;
    background: var(--surface); border-top: 1px solid var(--border); border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(0,0,0,.16);
    transform: translateY(calc(100% - var(--peek) + var(--drag)));
    transition: transform .28s cubic-bezier(.2, .8, .2, 1);
  }
  .sheet.open { transform: translateY(var(--drag)); }
  .sheet.dragging { transition: none; }

  .bar { flex: none; padding: 8px 16px 12px; touch-action: none; cursor: grab; }
  .grip { display: block; width: 40px; height: 5px; margin: 0 auto 8px; border-radius: 3px; background: var(--border); }
  .peek { display: flex; align-items: center; gap: 12px; }
  .peek img { width: 44px; height: 44px; border-radius: 50%; background: var(--surface-2); flex: none; }
  .meta { flex: 1; min-width: 0; }
  .meta strong { display: block; font-size: 14px; }
  .meta span { display: block; font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .icon, .toggle { flex: none; height: 40px; border: 0; border-radius: 999px; cursor: pointer; font-weight: 600; }
  .icon { width: 40px; display: grid; place-items: center; background: var(--surface-2); }
  .toggle { padding: 0 18px; background: var(--accent); color: var(--accent-text); }

  .body { overflow-y: auto; overscroll-behavior: contain; padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px)); }

  @media (prefers-reduced-motion: reduce) { .sheet { transition: none; } }
</style>
