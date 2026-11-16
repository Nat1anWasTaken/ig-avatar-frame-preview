// Shared CDP helpers and the in-page redaction/featuring code.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------- CDP plumbing

export async function browserWsUrl(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (r.ok) return (await r.json()).webSocketDebuggerUrl;
  } catch {}
  // Chrome/Brave "chrome://inspect/#remote-debugging" mode only exposes the browser websocket,
  // whose path is written to DevToolsActivePort in the profile directory.
  const support = path.join(os.homedir(), 'Library/Application Support');
  for (const dir of ['BraveSoftware/Brave-Browser', 'Google/Chrome', 'Google/Chrome Canary', 'Chromium', 'Microsoft Edge']) {
    const f = path.join(support, dir, 'DevToolsActivePort');
    if (!fs.existsSync(f)) continue;
    const [p, wsPath] = fs.readFileSync(f, 'utf8').trim().split('\n');
    if (p === String(port)) return `ws://127.0.0.1:${port}${wsPath}`;
  }
  throw new Error(`no CDP browser endpoint found on port ${port}`);
}

export class CDP {
  static async connect(url) {
    const c = new CDP();
    c.seq = 0;
    c.pending = new Map();
    c.ws = new WebSocket(url);
    c.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const p = m.id && c.pending.get(m.id);
      if (!p) return;
      c.pending.delete(m.id);
      m.error ? p.reject(new Error(`${p.method}: ${m.error.message}`)) : p.resolve(m.result);
    };
    await new Promise((resolve, reject) => { c.ws.onopen = resolve; c.ws.onerror = reject; });
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }));
  }
  close() { this.ws.close(); }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
};
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export async function openTab(cdp, device) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', background: true });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);
  await send('Page.enable');
  // background tabs are hidden and throttled; make this one behave like a focused, visible tab
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.setWebLifecycleState', { state: 'active' });
  await send('Emulation.setDeviceMetricsOverride', VIEWPORTS[device]);
  if (device === 'mobile') {
    await send('Emulation.setUserAgentOverride', { userAgent: MOBILE_UA, platform: 'iPhone' });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { targetId, send, evaluate };
}

export async function waitFor(tab, expr, timeout = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await tab.evaluate(expr).catch(() => false)) return;
    await sleep(300);
  }
  throw new Error(`timed out waiting for: ${expr}`);
}

// ---------------------------------------------------------------- in-page code

// Runs inside instagram.com. Builds the assets, redacts everything, then features the avatar.
// Returns the rects (CSS px) of the featured spots for close-up crops.
export async function pageMain(o) {
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  // --- assets (cached on window so every scene reuses them)
  if (!window.__igp) {
    const S = 512;
    const [ac, a] = canvas(S, S);
    const base = await loadImg(o.avatar);
    const k = Math.max(S / base.width, S / base.height);
    a.drawImage(base, (S - base.width * k) / 2, (S - base.height * k) / 2, base.width * k, base.height * k);
    if (o.frame) a.drawImage(await loadImg(o.frame), 0, 0, S, S);

    const [pc, p] = canvas(256, 256);
    p.fillStyle = '#c7c9cf'; p.fillRect(0, 0, 256, 256);
    p.fillStyle = '#f2f3f5';
    p.beginPath(); p.arc(128, 100, 46, 0, Math.PI * 2); p.fill();
    p.beginPath(); p.ellipse(128, 250, 92, 82, 0, Math.PI, 0); p.fill();

    let post = o.post;
    if (!post) {
      const [qc, q] = canvas(1080, 1350);
      const g = q.createLinearGradient(0, 0, 1080, 1350);
      g.addColorStop(0, '#2b2d42'); g.addColorStop(1, '#6d597a');
      q.fillStyle = g; q.fillRect(0, 0, 1080, 1350);
      q.fillStyle = 'rgba(255,255,255,.85)'; q.textAlign = 'center';
      q.font = '600 64px -apple-system, "PingFang TC", sans-serif';
      q.fillText('Placeholder post', 540, 690);
      post = qc.toDataURL('image/jpeg', 0.9);
    }
    window.__igp = { AV: ac.toDataURL('image/png'), PH: pc.toDataURL('image/png'), POST: post };
  }
  const { AV, PH, POST } = window.__igp;

  // every original string on the page, so the dump can prove none of them survive
  if (!window.__igpOrig) {
    const orig = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (t) orig.add(t); }
    for (const el of document.querySelectorAll('[alt],[aria-label],[title],[href]'))
      for (const a of ['alt', 'aria-label', 'title', 'href']) { const v = el.getAttribute(a); if (v) orig.add(v.trim()); }
    window.__igpOrig = [...orig];
  }

  const own = o.ownUsername;
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const isProfileAlt = (alt) => /'s profile picture$/.test(alt || '');
  const setSrc = (img, src) => { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = src; };
  const textNodes = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim() ? 1 : 2 });
    const out = []; while (w.nextNode()) out.push(w.currentNode); return out;
  };
  const leafTexts = (root) => textNodes(root).filter((n) => !n.parentElement.closest('svg'));
  const UI_TEXT = /^(•|·|\.\.\.|…|more|… more|Follow|Following|Switch|See all|Suggested for you|Your story|Your note|Messages|Requests|Search|Send message|Add a comment…|See translation|Liked by|and|others|View all \d+ comments|\d[\d,.]*[KkMm萬]?|\d+[smhdw]|\d+ (second|minute|hour|day|week)s? ago|Active.*|Seen.*|Sent.*|Unread)$/;
  const lw = (c) => { const css = c.getBoundingClientRect().width || 1; return (css > 60 ? 3 : 2) * (c.width / css); };

  // Re-draw a story ring. Cloning detaches the canvas from Instagram's own renderer.
  const ring = (cv, kind) => {
    if (!cv) return;
    const c = cv.cloneNode(); c.width = cv.width; c.height = cv.height; cv.replaceWith(c);
    const x = c.getContext('2d'), W = c.width, l = lw(c);
    const g = x.createLinearGradient(0, W, W, 0);
    const stops = kind === 'close' ? ['#1bb954', '#2fd16b', '#5fe08a'] : ['#ffd600', '#ff7a00', '#ff0069', '#d300c5'];
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    x.clearRect(0, 0, W, W);
    x.strokeStyle = g; x.lineWidth = l;
    x.beginPath(); x.arc(W / 2, W / 2, W / 2 - l / 2, 0, Math.PI * 2); x.stroke();
    return c;
  };

  // --- 1. collect every real username we can see, map to placeholders
  const names = new Set();
  for (const img of document.querySelectorAll('img')) if (isProfileAlt(img.alt)) names.add(img.alt.replace(/'s profile picture$/, ''));
  for (const el of document.querySelectorAll('[aria-label^="Story by "]')) names.add(el.getAttribute('aria-label').replace(/^Story by /, '').replace(/,.*$/, ''));
  for (const a of document.querySelectorAll('a[href]')) {
    const m = a.getAttribute('href').match(/^\/([A-Za-z0-9._]{2,30})\/$/);
    if (m && !['explore', 'reels', 'direct', 'accounts', 'stories'].includes(m[1])) names.add(m[1]);
  }
  names.delete(own);
  let n = 0;
  const map = new Map([[own, o.username], ...[...names].map((u) => [u, `user_${String(++n).padStart(2, '0')}`])]);
  if (o.ownName) map.set(o.ownName, o.name);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp([...map.keys()].filter(Boolean).sort((a, b) => b.length - a.length).map(esc).join('|'), 'g');
  const scrub = (s) => s.replace(re, (m) => map.get(m)).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, 'hidden@example.com');

  let ph = 0;
  const placeholderName = () => `user_${String(++ph + 50).padStart(2, '0')}`;

  // --- 2. every image becomes a placeholder (own avatar → the new avatar)
  for (const img of document.querySelectorAll('img')) {
    const r = img.getBoundingClientRect();
    const avatarish = isProfileAlt(img.alt) || img.closest('[role=link], a[href^="/"]') && r.width <= 170 && Math.abs(r.width - r.height) < 2 || r.width <= 64;
    setSrc(img, avatarish ? (img.alt === `${own}'s profile picture` ? AV : PH) : POST);
    if (!avatarish) img.style.objectFit = 'cover';
    if (img.alt) img.alt = scrub(img.alt);
  }
  for (const v of document.querySelectorAll('video')) {
    v.pause(); v.removeAttribute('src'); v.poster = POST; v.load();
  }
  for (const el of document.querySelectorAll('[style*="background-image"]')) if (/url\(/.test(el.style.backgroundImage)) el.style.backgroundImage = `url(${PH})`;
  for (const t of textNodes(document.body)) t.textContent = scrub(t.textContent);
  for (const el of document.querySelectorAll('[aria-label],[title]')) {
    if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', scrub(el.getAttribute('aria-label')));
    if (el.hasAttribute('title')) el.setAttribute('title', scrub(el.getAttribute('title')));
  }
  document.title = 'Instagram';

  const crops = [];
  const crop = (name, el, pad = 12) => { if (el) { const r = rect(el); crops.push({ name, x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 }); } };

  // --- 3. scene specific redaction + featuring
  // story/note tray items: desktop wraps each in an <li>, the mobile story tray only in a role=button
  const trayItems = (size) => [...new Set([...document.querySelectorAll('img')]
    .filter((i) => Math.round(i.getBoundingClientRect().width) === size)
    .map((i) => i.closest('li') || i.closest('[role=button]')).filter(Boolean))];

  if (o.scene === 'home') {
    // stories: first two "other" stories get the avatar, normal and close-friends ring
    const items = trayItems(74).filter((li) => li.getBoundingClientRect().x < innerWidth);
    const others = items.filter((li) => !/Your story/.test(li.textContent));
    const yours = items.find((li) => /Your story/.test(li.textContent));
    if (yours) setSrc(yours.querySelector('img'), AV);
    others.forEach((li, i) => {
      const img = li.querySelector('img');
      const label = leafTexts(li).at(-1);
      if (i < 2) {
        setSrc(img, AV);
        if (label) label.textContent = o.username;
        ring(li.querySelector('canvas'), i === 0 ? 'story' : 'close');
        crop(i === 0 ? 'story-normal' : 'story-close-friends', li, 10);
      } else ring(li.querySelector('canvas'), 'story');
    });

    // feed: first article is "our" post, the rest are anonymised
    // feature the first single-author post (collab posts show two avatars and "A and B")
    const articles = [...document.querySelectorAll('main article')];
    const featured = articles.find((art) => art.querySelectorAll('img[alt$="profile picture"]').length === 1) || articles[0];
    if (featured !== articles[0]) articles[0].before(featured); // keep it at the top of the feed
    articles.forEach((art) => {
      const mine = art === featured;
      const author = mine ? o.username : placeholderName();
      const hdrImg = art.querySelector('img');
      if (mine && hdrImg) setSrc(hdrImg, AV);
      art.querySelectorAll('svg[aria-label="Verified"]').forEach((s) => s.style.display = 'none');
      let captioned = false, counts = 0;
      for (const t of leafTexts(art)) {
        const s = t.textContent.trim();
        const a = t.parentElement.closest('a');
        if (a && /^\/[^/]+\/$/.test(a.getAttribute('href') || '')) t.textContent = author;
        else if (a && /explore\/locations/.test(a.getAttribute('href'))) t.textContent = 'Taipei, Taiwan';
        else if (/^\d[\d,.]*[KkMm萬]?$/.test(s)) t.textContent = ['128', '12', '4', '2'][counts++ % 4]; // real post stats
        else if (UI_TEXT.test(s)) continue;
        else if (!captioned && s.length > 3 && !/AI/.test(s)) { t.textContent = mine ? o.caption : 'Placeholder caption'; captioned = true; }
        else t.textContent = '';
      }
      if (mine) {
        const top = rect(art);
        crops.push({ name: 'post-author', x: top.x - 8, y: top.y - 8, width: top.width + 16, height: Math.min(top.height, o.device === 'mobile' ? 560 : 640) + 16 });
      }
    });

    // right sidebar (desktop): own account row + suggestions
    const side = [...document.querySelectorAll(`main img[src="${AV}"]`)].find((i) => !i.closest('article, li'));
    if (side && o.device === 'desktop') {
      let row = side; for (let k = 0; k < 6 && row.parentElement && row.getBoundingClientRect().width < 280; k++) row = row.parentElement;
      crop('own-sidebar', row, 10);
    }
    for (const btn of [...document.querySelectorAll('main [role=button], main button')].filter((b) => b.textContent.trim() === 'Follow')) {
      let row = btn; while (row.parentElement && !row.querySelector('img')) row = row.parentElement;
      const texts = leafTexts(row).filter((t) => t.textContent.trim() !== 'Follow');
      texts.forEach((t, k) => t.textContent = k === 0 ? placeholderName() : k === 1 ? 'Suggested for you' : '');
    }
  }

  if (o.scene === 'inbox') {
    // notes (便利貼)
    const items = trayItems(74);
    items.forEach((li) => {
      const mine = /Your note/.test(li.textContent);
      const featured = !mine && li === items.find((x) => !/Your note/.test(x.textContent));
      const img = li.querySelector('img');
      if (mine || featured) setSrc(img, AV);
      if (mine) return;
      const label = leafTexts(li).at(-1);
      // note bubble: the element(s) above the avatar
      const bubble = [...li.querySelectorAll('div')].find((d) => d.querySelector('span[style*="line-clamp"], svg') && !d.contains(img));
      const bubbleTexts = bubble ? leafTexts(bubble) : [];
      bubbleTexts.forEach((t, k) => t.textContent = k === 0 ? (featured ? o.note : 'Placeholder note') : '');
      bubble?.querySelectorAll('svg').forEach((s) => s.style.display = 'none');
      if (label) label.textContent = featured ? o.name : placeholderName();
      if (featured) crop('note', li, 8);
    });

    // thread list: rows have a time <abbr>
    const rows = [...new Set([...document.querySelectorAll('abbr')].map((a) => a.closest('[role=button], [role=listitem], a')).filter(Boolean))];
    rows.forEach((row, i) => {
      const img = row.querySelector('img');
      if (img) setSrc(img, i === 0 ? AV : PH);
      const texts = leafTexts(row).filter((t) => !t.parentElement.closest('abbr') && !/^[·•]$/.test(t.textContent.trim()));
      texts.forEach((t, k) => t.textContent = k === 0 ? (i === 0 ? o.name : placeholderName()) : k === 1 ? (i === 0 ? o.message : 'Message preview') : '');
      if (i === 0) crop('chat-list', row, 4);
    });
  }

  // own avatar in nav (desktop left rail / mobile bottom bar)
  const navOwn = [...document.querySelectorAll(`img[src="${AV}"]`)].find((i) => i.getBoundingClientRect().width <= 32 && !i.closest('main'));
  if (navOwn) crop('own-nav', navOwn, 18);

  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  // keep crops inside the viewport
  return crops.map((c) => {
    const x = Math.max(0, c.x), y = Math.max(0, c.y);
    return { ...c, x, y, width: Math.min(innerWidth - x, c.width - (x - c.x)), height: Math.min(innerHeight - y, c.height - (y - c.y)) };
  }).filter((c) => c.width > 4 && c.height > 4);
}


export const SCENES = [
  { device: 'desktop', scene: 'home', url: 'https://www.instagram.com/', ready: `document.querySelector('main article img') && document.querySelectorAll('main li img').length > 2` },
  { device: 'desktop', scene: 'inbox', url: 'https://www.instagram.com/direct/inbox/', ready: `document.querySelectorAll('abbr').length > 2 && [...document.querySelectorAll('li img')].length > 2` },
  { device: 'mobile', scene: 'home', url: 'https://www.instagram.com/', ready: `document.querySelector('main article img') && document.querySelectorAll('[aria-label^="Story by"] img').length > 2` },
  { device: 'mobile', scene: 'inbox', url: 'https://www.instagram.com/direct/inbox/', ready: `document.querySelectorAll('abbr').length > 2 && [...document.querySelectorAll('li img')].length > 2` },
];

// Load a scene, redact it and feature the avatar, then freeze the page.
// `opts` is shared across scenes: the logged-in account is detected once and cached on it.
export async function prepareScene(tab, sc, opts, { freeze = true } = {}) {
  await tab.send('Page.navigate', { url: sc.url });
  await waitFor(tab, sc.ready);
  await sleep(2500); // let lazy avatars/stories settle

  // Own account: the profile picture in the navigation, plus the display name from the
  // desktop sidebar when it exists. Detected once and reused for every scene.
  if (!opts.ownUsername) {
    const own = await tab.evaluate(`(() => {
      const img = [...document.querySelectorAll('img[alt$="\\'s profile picture"]')].find(i => !i.closest('main') || i.width <= 32);
      return img && img.alt.replace(/'s profile picture$/, '');
    })()`);
    if (!own) throw new Error('could not detect the logged-in username');
    opts.ownUsername = own;
  }
  if (!opts.ownName) {
    opts.ownName = await tab.evaluate(`(() => {
      const a = document.querySelector('main a[href="/${opts.ownUsername}/"]:not(:has(img))');
      let row = a; for (let i = 0; i < 6 && row; i++) { row = row.parentElement; const t = [...row.querySelectorAll('span')].map(s => s.textContent.trim()).filter(s => s && s !== '${opts.ownUsername}' && s !== 'Switch'); if (t.length) return t.at(-1); }
      return null;
    })()`);
  }

  const crops = await tab.evaluate(`(${pageMain})(${JSON.stringify({ ...opts, scene: sc.scene, device: sc.device })})`);
  // freeze the page so Instagram's React can't re-render our edits mid-capture
  if (freeze) {
    await tab.send('Emulation.setScriptExecutionDisabled', { value: true });
    await sleep(400);
  }
  return crops;
}
