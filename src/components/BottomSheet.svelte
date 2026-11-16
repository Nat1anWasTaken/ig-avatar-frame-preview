<script>
  import { Drawer } from 'vaul-svelte';
  import { editor, download } from '../lib/editor.svelte.js';

  let { children } = $props();

  // Snap points: the peek bar (plus the home-indicator inset) and the open sheet,
  // which is 72dvh tall so it fits exactly when fully raised.
  const probe = Object.assign(document.createElement('div'), { style: 'height: env(safe-area-inset-bottom, 0px)' });
  document.body.append(probe);
  const PEEK = `${76 + probe.offsetHeight}px`;
  probe.remove();
  const FULL = 0.72;

  let snap = $state(FULL);
  const open = $derived(snap === FULL);
</script>

<Drawer.Root open modal={false} dismissible={false} snapPoints={[PEEK, FULL]} bind:activeSnapPoint={snap}>
  <Drawer.Portal>
    <Drawer.Content class="sheet" onOpenAutoFocus={(e) => e.preventDefault()}>
      <div class="bar">
        <span class="grip" aria-hidden="true"></span>
        <div class="peek">
          <img src={editor.avatarUrl} alt="">
          <div class="meta">
            <Drawer.Title class="sheet-title">你的大頭貼</Drawer.Title>
            <span>{editor.frameName}</span>
          </div>
          {#if !open}
            <button class="icon" type="button" aria-label="下載頭像" onclick={download}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          {/if}
          <button class="toggle" type="button" aria-expanded={open} onclick={() => { snap = open ? PEEK : FULL; }}>
            {open ? '完成' : '調整'}
          </button>
        </div>
      </div>
      <div class="body" inert={!open}>
        {@render children()}
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>

<style>
  /* Drawer.Content is portalled to <body>, outside this component's scope.
     Vaul offsets snap points from the top of the viewport, so anchor there. */
  :global(.sheet) {
    position: fixed; left: 0; right: 0; top: 0; z-index: 10; height: 72dvh;
    display: flex; flex-direction: column; outline: none;
    background: var(--surface); border-top: 1px solid var(--border); border-radius: 20px 20px 0 0;
    box-shadow: 0 -8px 32px rgba(0,0,0,.16);
  }
  .bar { flex: none; padding: 8px 16px 12px; cursor: grab; }
  .grip { display: block; width: 40px; height: 5px; margin: 0 auto 8px; border-radius: 3px; background: var(--border); }
  .peek { display: flex; align-items: center; gap: 12px; }
  .peek img { width: 44px; height: 44px; border-radius: 50%; background: var(--surface-2); flex: none; }
  .meta { flex: 1; min-width: 0; }
  .meta :global(.sheet-title) { display: block; margin: 0; font-size: 14px; font-weight: 700; }
  .meta span { display: block; font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .icon, .toggle { flex: none; height: 40px; border: 0; border-radius: 999px; cursor: pointer; font-weight: 600; }
  .icon { width: 40px; display: grid; place-items: center; background: var(--surface-2); }
  .toggle { padding: 0 18px; background: var(--accent); color: var(--accent-text); }

  .body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 8px 16px calc(20px + env(safe-area-inset-bottom, 0px)); }
</style>
