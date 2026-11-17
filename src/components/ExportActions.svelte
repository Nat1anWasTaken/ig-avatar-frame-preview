<script>
  import { editor, save, download, supportsSharing, prepareShare, share, shareAvatar } from '../lib/editor.svelte.js';

  let { item, compact = false, onaction } = $props();
  const sharingAvailable = supportsSharing();
  let file = $state(null);
  let preparing = $state(false);
  let preparationError = $state('');
  let retry = $state(0);

  $effect(() => {
    retry;
    const target = item;
    if (!sharingAvailable || target.key === 'avatar') return;
    let current = true;
    file = null;
    preparationError = '';
    preparing = true;
    prepareShare(target.src, target.file).then((ready) => {
      if (current) file = ready;
    }).catch(() => {
      if (current) preparationError = '無法準備分享，仍可下載。';
    }).finally(() => {
      if (current) preparing = false;
    });
    return () => { current = false; };
  });

  function downloadImage() {
    onaction();
    return item.key === 'avatar' ? download() : save(item.src, item.file);
  }

  function shareImage() {
    if (editor.saving || preparing) return;
    if (preparationError) { retry++; return; }
    onaction();
    return item.key === 'avatar' ? shareAvatar() : share(file);
  }
</script>

<div class="export-actions" class:compact>
  <button class="btn" type="button" aria-label="下載圖片：{item.title}"
    disabled={editor.saving || (item.key === 'avatar' && !editor.canDownload)} onclick={downloadImage}>下載</button>
  {#if sharingAvailable}
    <button class="btn secondary" type="button"
      aria-label="{preparationError ? '重試準備分享' : preparing ? '正在準備分享圖片' : '分享圖片'}：{item.title}"
      aria-busy={preparing}
      aria-disabled={editor.saving || preparing}
      disabled={item.key === 'avatar' && !editor.outputReady}
      onclick={shareImage}>{preparationError ? '重試' : '分享'}</button>
  {/if}
</div>
{#if preparationError}<p class="preparation-error" role="alert">{preparationError}</p>{/if}

<style>
  .export-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn { flex: 1 1 44px; min-width: 44px; width: auto; min-height: 44px; padding-inline: 12px; }
  .btn[aria-disabled="true"] { cursor: wait; opacity: .5; }
  .preparation-error { margin: 8px 0 0; color: var(--muted); font-size: 12px; }
  @media (max-width: 650px) {
    .compact { gap: 6px; }
    .compact .btn { padding: 8px 4px; font-size: 12px; }
  }
</style>
