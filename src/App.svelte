<script>
  import { onMount, tick } from 'svelte';
  import Editor from './components/Editor.svelte';
  import SocialPreview from './components/SocialPreview.svelte';
  import { CAMPAIGN, ARTWORK, pub } from './lib/assets.js';
  import { editor, save } from './lib/editor.svelte.js';
  import { artworkFromHash } from './lib/navigation.js';

  let selected = $state(artworkFromHash(location.hash) ?? 'avatar');
  let savePlacement = $state('overview');
  let copyStatus = $state('');
  let shareOpen = $state(false);
  const current = $derived(ARTWORK.find((item) => item.key === selected));
  const savedArtwork = $derived(ARTWORK.find((item) => item.file === editor.saveTarget));
  const saveMessage = $derived({
    'saving': '正在準備圖片…',
    'download-requested': `${savedArtwork?.title ?? '圖片'}下載已送出，接著到社群媒體換上。`,
    'shared': '已交給系統分享功能；請確認圖片已儲存，再到社群媒體換上。',
    'cancelled': '已取消，圖片仍保留在這裡。',
    'error': editor.saveError,
  }[editor.saveStatus] ?? '');
  const shareText = `${CAMPAIGN.invitation}\n${CAMPAIGN.url}`;

  async function selectArtwork(key, updateUrl = true) {
    selected = key;
    if (updateUrl && location.hash !== `#${key}`) history.pushState(null, '', `#${key}`);
    await tick();
    const heading = document.getElementById(key === 'avatar' ? 'avatar-editor-title' : 'artwork-title');
    heading?.focus({ preventScroll: true });
    document.getElementById('make')?.scrollIntoView({ block: 'start' });
  }

  function readHash() {
    const key = artworkFromHash(location.hash);
    if (key) selectArtwork(key, false);
  }

  async function saveArtwork(item, placement) {
    savePlacement = placement;
    await save(item.src, item.file);
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(shareText);
      copyStatus = '已複製邀請文字與連結';
    } catch {
      shareOpen = true;
      copyStatus = '請選取下方文字複製。';
    }
  }

  onMount(() => {
    if (location.hash && artworkFromHash(location.hash)) selectArtwork(selected, false);
  });
</script>

<svelte:window onhashchange={readHash} />

{#snippet feedback()}
  <p class="save-feedback">{saveMessage}</p>
{/snippet}

<div class="page">
  <a class="skip-link" href="#make">跳至素材工作區</a>
  <header class="site-header">
    <a class="wordmark" href={CAMPAIGN.officialUrl} aria-label="{CAMPAIGN.name} 年會官網">SITCON<span>{CAMPAIGN.year}</span></a>
    <a class="official-link" href={CAMPAIGN.officialUrl}>認識年會 <span aria-hidden="true">↗</span></a>
  </header>

  <main>
    <p class="sr-only" role="status">{saveMessage}</p>
    <section class="intro">
      <p class="eyebrow">學生計算機年會 <span aria-hidden="true">/</span> 社群媒體素材</p>
      <h1>換上 <span>{CAMPAIGN.name}</span></h1>
      <div class="intro-bottom">
        <p>{CAMPAIGN.intro}</p>
        <span class="edition">{CAMPAIGN.year} <span aria-hidden="true">—</span> {CAMPAIGN.theme}</span>
      </div>
    </section>

    <section id="artwork" class="artwork-section" aria-label="選用社群媒體素材">
      <div class="artwork-grid">
        {#each ARTWORK as item, index (item.key)}
          <article class="artwork-card" class:chosen={selected === item.key}>
            <div class="artwork-visual {item.key}">
              <span class="asset-index" aria-hidden="true">0{index + 1}</span>
              {#if item.key === 'avatar'}
                <div class="sample-avatar">
                  <img src={pub('assets/placeholder-avatar.png')} width="1080" height="1080" alt="" />
                  <img class="frame" src={item.src} width={item.width} height={item.height} alt="{CAMPAIGN.name} 頭貼框示意" fetchpriority="high" />
                </div>
                <span class="example-label">示意</span>
              {:else}
                <img src={item.src} width={item.width} height={item.height} alt={item.title} />
              {/if}
            </div>
            <div class="artwork-caption">
              <h2>{item.key === 'avatar' ? '頭貼' : item.key === 'facebook' ? 'Facebook 封面' : 'LINE 主頁背景'}</h2>
              <p>{item.key === 'avatar' ? '放入自己的照片' : item.key === 'facebook' ? '個人檔案封面相片' : '個人主頁背景圖片'}</p>
              {#if item.key === 'avatar'}
                <button class="btn" type="button" onclick={() => selectArtwork(item.key)}>製作頭貼 <span aria-hidden="true">↗</span></button>
              {:else}
                <button class="btn secondary" type="button" disabled={editor.saving} aria-label="儲存圖片：{item.title}" onclick={() => saveArtwork(item, 'overview')}>儲存圖片 <span aria-hidden="true">↓</span></button>
              {/if}
              {#if item.key !== 'avatar'}
                <button class="preview-link" type="button" aria-label="看套用效果：{item.title}" onclick={() => selectArtwork(item.key)}>看套用效果 <span aria-hidden="true">→</span></button>
              {:else}
                <span class="card-note">照片在瀏覽器內處理</span>
              {/if}
            </div>
          </article>
        {/each}
      </div>
      {#if savedArtwork?.key !== 'avatar' && savePlacement === 'overview'}{@render feedback()}{/if}
    </section>

    <section id="make" class="workbench" tabindex="-1">
      <div class="workbench-top">
        <span class="section-label">{CAMPAIGN.title}</span>
        <a href="#artwork">所有素材 <span aria-hidden="true">↑</span></a>
      </div>
      <div class="workspace">
        <div class="work-panel">
          {#if selected === 'avatar'}
            <Editor>
              {#if savedArtwork?.key === 'avatar'}{@render feedback()}{/if}
            </Editor>
          {:else}
            <div class="banner-editor">
              <h2 id="artwork-title" tabindex="-1">{current.title}</h2>
              <p class="format">{current.width} × {current.height} <span aria-hidden="true">·</span> PNG</p>
              <figure class="original" class:portrait={selected === 'line'}>
                <img src={current.src} width={current.width} height={current.height} alt="{current.title}完整圖片" />
                <figcaption>完整圖片</figcaption>
              </figure>
              <button class="btn" type="button" disabled={editor.saving} onclick={() => saveArtwork(current, 'workspace')}>{editor.saving ? '儲存中…' : '儲存圖片'} <span aria-hidden="true">↓</span></button>
              {#if savedArtwork?.key !== 'avatar' && savePlacement === 'workspace'}{@render feedback()}{/if}
            </div>
          {/if}
          <details class="how-to">
            <summary>如何換上</summary>
            <p>{selected === 'avatar' ? '儲存圖片後，在社群媒體的個人檔案中更換頭貼。' : selected === 'facebook' ? '儲存圖片後，前往 Facebook 個人檔案更換封面相片，並確認裁切位置。' : '儲存圖片後，前往 LINE 個人主頁更換背景，並確認裁切位置。'}</p>
            <p>手機可在系統分享選單中儲存圖片；若已下載，請到下載項目或檔案 App 尋找。</p>
            {#if selected === 'line'}
              <a href="https://help.line.me/line/?contentId=20000134&lang=zh-Hant" target="_blank" rel="noreferrer">LINE 官方設定說明 ↗</a>
            {:else if selected === 'facebook'}
              <a href="https://www.facebook.com/help/220070894714080" target="_blank" rel="noreferrer">Facebook 封面相片說明 ↗</a>
            {/if}
          </details>
        </div>
        <div class="preview-panel">
          <SocialPreview artwork={selected} />
        </div>
      </div>
    </section>

    <section class="invitation">
      <div>
        <p class="eyebrow">一起換上</p>
        <h2>讓下一位朋友，也看見 SITCON。</h2>
      </div>
      <div class="share-actions">
        <button type="button" class="btn secondary" onclick={copyInvitation}>複製邀請文字與連結 <span aria-hidden="true">↗</span></button>
        <p class="copy-status" role="status">{copyStatus}</p>
        <details bind:open={shareOpen}>
          <summary>看看分享文字</summary>
          <label for="invitation-text" class="sr-only">邀請文字與年會換圖連結</label>
          <textarea id="invitation-text" readonly rows="4" value={shareText}></textarea>
        </details>
      </div>
    </section>
    <a class="theme-link" href={CAMPAIGN.themeUrl}>
      <span class="theme-number" aria-hidden="true">{CAMPAIGN.theme}</span>
      <span><span class="eyebrow">{CAMPAIGN.name} 年會主題</span><strong>{CAMPAIGN.themeIntro}</strong></span>
      <span class="theme-arrow" aria-hidden="true">↗</span>
    </a>
  </main>
  <footer>
    <span>{CAMPAIGN.name} · 學生計算機年會</span>
    <span>照片僅在你的瀏覽器處理</span>
    <a href={CAMPAIGN.url}>{CAMPAIGN.year} 素材固定連結 ↗</a>
  </footer>
</div>

<style>
  .page { width: min(1160px, 100% - 80px); margin: 0 auto; }
  .skip-link { position: fixed; top: -100px; left: 24px; z-index: 10; background: var(--accent); color: var(--accent-text); padding: 12px 20px; border-radius: 8px; }
  .skip-link:focus { top: 16px; }
  .site-header { display: flex; justify-content: space-between; align-items: center; padding-block: 25px; border-bottom: 1px solid var(--border); }
  .wordmark { font: 800 27px/1 ui-sans-serif, system-ui, sans-serif; text-decoration: none; letter-spacing: -.07em; }
  .wordmark span { margin-left: 10px; color: var(--accent); font-weight: 400; font-size: 17px; letter-spacing: -.04em; }
  .official-link { font-size: 13px; color: var(--muted); text-decoration: none; padding-block: 10px; }
  .official-link span { margin-left: 10px; }
  .intro { padding: 56px 0 32px; }
  .eyebrow, .section-label { font-size: 11px; letter-spacing: .12em; color: var(--muted); }
  .eyebrow { margin: 0 0 16px; }
  .eyebrow span { padding-inline: 12px; color: var(--accent); }
  h1 { margin: 0; font-size: clamp(32px, 4vw, 52px); line-height: 1.3; letter-spacing: -.04em; font-weight: 650; }
  h1 span { color: var(--accent); }
  .intro-bottom { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-top: 20px; }
  .intro-bottom p { font-size: 14px; color: var(--muted); margin: 0; }
  .edition { flex-shrink: 0; font: 12px/1.5 ui-monospace, monospace; color: var(--muted); letter-spacing: .1em; }
  .artwork-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .artwork-card { min-width: 0; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--surface); }
  .artwork-card.chosen { border-color: #77669f; }
  .artwork-visual { height: 200px; display: flex; align-items: center; justify-content: center; position: relative; padding: 28px; background: #080a10; border-bottom: 1px solid var(--border); overflow: hidden; }
  .artwork-visual::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 100%, #7462c322, transparent 75%); pointer-events: none; }
  .asset-index { position: absolute; top: 16px; left: 17px; font: 10px/1 ui-monospace, monospace; color: var(--muted); }
  .sample-avatar { width: 144px; height: 144px; position: relative; flex-shrink: 0; }
  .sample-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; }
  .frame { z-index: 1; }
  .example-label { position: absolute; right: 14px; bottom: 12px; font-size: 10px; color: var(--muted); }
  .artwork-visual.facebook img { position: relative; width: 100%; height: auto; border: 1px solid #565677; border-radius: 7px; transform: rotate(-5deg); }
  .artwork-visual.line img { position: relative; width: 88px; height: auto; border: 3px solid #414760; border-radius: 13px; transform: rotate(8deg); }
  .artwork-caption { padding: 20px; }
  .artwork-caption h2 { margin: 0; font-size: 18px; letter-spacing: -.02em; font-weight: 550; }
  .artwork-caption p { margin: 4px 0 18px; font-size: 12px; color: var(--muted); }
  .preview-link { display: block; width: 100%; min-height: 36px; padding: 10px 0 0; border: 0; background: transparent; color: var(--muted); font-size: 12px; }
  .preview-link:hover { color: var(--text); }
  .card-note { display: block; min-height: 36px; padding-top: 10px; text-align: center; font-size: 12px; color: var(--muted); }
  .workbench { margin-top: 60px; scroll-margin-top: 24px; }
  .workbench-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 28px; }
  .workbench-top a { font-size: 12px; color: var(--muted); text-decoration: none; min-height: 32px; display: inline-flex; align-items: center; gap: 8px; }
  .workspace { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 72px; }
  .work-panel { min-width: 0; }
  .preview-panel { min-width: 0; background: var(--surface); padding: 28px; border: 1px solid var(--border); border-radius: 14px; align-self: start; }
  .banner-editor h2 { margin: 0; font-size: 25px; line-height: 1.4; letter-spacing: -.03em; }
  .format { font: 12px/1.5 ui-monospace, monospace; color: var(--muted); margin: 8px 0 24px; }
  .format span { margin: 0 8px; }
  .original { margin: 0 0 24px; }
  .original img { display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border); }
  .original.portrait img { max-height: 300px; width: auto; margin-inline: auto; }
  .original figcaption { font-size: 11px; margin-top: 8px; color: var(--muted); text-align: center; }
  .how-to { margin-top: 20px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); }
  .how-to p { margin: 8px 0; }
  .how-to a { display: inline-block; margin-top: 4px; color: var(--accent); }
  .save-feedback { margin: 14px 0 0; font-size: 13px; color: #d7cef6; }
  .save-feedback:empty { display: none; }
  .invitation { display: grid; grid-template-columns: 1fr 340px; gap: 48px; align-items: start; padding-block: 44px; margin-top: 64px; border-top: 1px solid var(--border); }
  .invitation h2 { margin: 0; font-weight: 500; font-size: 23px; letter-spacing: -.02em; }
  .invitation .eyebrow { margin-bottom: 8px; }
  .share-actions details { font-size: 12px; }
  .share-actions summary { width: fit-content; }
  .copy-status { font-size: 12px; color: var(--accent); margin: 8px 0 0; }
  .copy-status:empty { display: none; }
  textarea { width: 100%; resize: vertical; padding: 12px; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; }
  .theme-link { display: flex; gap: 28px; align-items: center; border-block: 1px solid var(--border); padding: 28px 0; text-decoration: none; }
  .theme-number { font: 400 64px/1 ui-monospace, monospace; letter-spacing: -.09em; color: var(--accent); }
  .theme-link .eyebrow { display: block; margin: 0 0 7px; font-size: 10px; }
  .theme-link strong { font-weight: 500; font-size: 16px; }
  .theme-arrow { margin-left: auto; color: var(--accent); font-size: 24px; }
  footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px 24px; padding-block: 24px 32px; font-size: 11px; color: var(--muted); }
  footer a { text-decoration: none; }
  @media (max-width: 900px) {
    .page { width: calc(100% - 40px); }
    .workspace { grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 28px; }
    .preview-panel { padding: 20px; }
    .artwork-grid { gap: 12px; }
    .artwork-caption { padding: 16px; }
    .artwork-caption h2 { font-size: 16px; }
    .artwork-visual { height: 170px; padding: 20px; }
    .sample-avatar { width: 120px; height: 120px; }
  }
  @media (max-width: 800px) {
    .workspace { grid-template-columns: minmax(0, 1fr); gap: 28px; }
    .work-panel { max-width: 420px; width: 100%; margin-inline: auto; }
  }
  @media (max-width: 650px) {
    .page { width: calc(100% - 32px); }
    .site-header { padding-block: 16px; }
    .wordmark { font-size: 24px; }
    .intro { padding: 34px 0 24px; }
    h1 { font-size: clamp(29px, 7.5vw, 43px); line-height: 1.4; }
    .intro .eyebrow { font-size: 10px; margin-bottom: 12px; }
    .intro-bottom { margin-top: 12px; }
    .intro-bottom p { font-size: 12px; max-width: 27em; }
    .edition { display: none; }
    .artwork-grid { gap: 8px; }
    .artwork-card { border-radius: 10px; }
    .artwork-visual { height: 112px; padding: 12px; }
    .asset-index { top: 9px; left: 9px; font-size: 8px; }
    .sample-avatar { width: 74px; height: 74px; }
    .example-label { bottom: 6px; right: 7px; font-size: 9px; }
    .artwork-visual.facebook img { border-radius: 4px; }
    .artwork-visual.line img { width: 49px; border-width: 2px; border-radius: 8px; }
    .artwork-caption { padding: 12px 8px 8px; }
    .artwork-caption h2 { font-size: 12px; min-height: 38px; line-height: 1.5; }
    .artwork-caption p { display: none; }
    .artwork-caption .btn { font-size: 12px; min-height: 42px; padding: 8px 4px; gap: 3px; white-space: nowrap; }
    .artwork-caption .btn span { display: none; }
    .preview-link { font-size: 10px; min-height: 36px; padding-top: 6px; }
    .card-note { font-size: 9px; padding-top: 8px; line-height: 1.5; }
    .workspace { grid-template-columns: minmax(0, 1fr); gap: 28px; }
    .workbench { margin-top: 36px; }
    .workbench-top { margin-bottom: 24px; }
    .work-panel { max-width: 420px; width: 100%; margin-inline: auto; }
    .invitation { grid-template-columns: minmax(0, 1fr); gap: 20px; margin-top: 36px; padding-block: 32px; }
    .invitation h2 { font-size: 20px; }
    .theme-link { gap: 20px; padding-block: 24px; }
    .theme-number { font-size: 52px; }
    .theme-link strong { font-size: 13px; }
    footer { flex-direction: column; gap: 7px; padding-bottom: max(24px, env(safe-area-inset-bottom)); }
  }
</style>
