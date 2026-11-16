// Facebook: scene list, own-account detection and the in-page redaction/featuring code.
import { sleep, waitFor } from '../lib.mjs';

// `ready` only says the page has rendered something; `settled` is checked after the mobile
// site's "add friends" / "get the app" screens are skipped.
const READY = `document.body && document.body.innerText.trim().length > 20`;
export const SCENES = [
  { device: 'desktop', scene: 'home', url: 'https://www.facebook.com/', ready: READY, settled: `document.querySelector('[aria-label="Create a post"]') && document.querySelector('[aria-label^="Actions for this post"]')` },
  { device: 'desktop', scene: 'profile', url: 'https://www.facebook.com/me', ready: READY, settled: `[...document.querySelectorAll('svg image')].some(i => i.getBoundingClientRect().width >= 150)` },
  { device: 'desktop', scene: 'notifications', url: 'https://www.facebook.com/notifications', ready: READY, settled: `document.querySelector('[role=list][aria-label="Notifications"] [role=listitem]')` },
  { device: 'mobile', scene: 'home', url: 'https://www.facebook.com/', ready: READY, settled: `document.querySelector('[aria-label="What\\'s on your mind?"]') && document.querySelector('[aria-label$=" Profile Picture"] img')` },
  // the mobile site sends /me back to the feed, so the profile is opened from the feed instead
  { device: 'mobile', scene: 'profile', url: 'https://www.facebook.com/', open: '[aria-label="Go to profile"]', ready: READY, settled: `location.pathname !== '/' && [...document.images].some(i => i.getBoundingClientRect().width >= 120 && i.getBoundingClientRect().top < innerHeight)` },
  { device: 'mobile', scene: 'notifications', url: 'https://www.facebook.com/notifications', ready: READY, settled: `document.querySelector('[data-mcomponent=MContainer][role=button][aria-label] img')` },
];

// Facebook's own icons, logos and sprites: public files the dump keeps as local copies.
export const STATIC = /https:\/\/(?:[\w-]*static\.xx\.fbcdn\.net\/rsrc\.php|www\.facebook\.com\/(?:images|rsrc\.php))\/[^\s"'()<>]*/;

// Only ever dismisses prompts; nothing is sent, followed or added.
const DISMISS = `(() => {
  const el = [...document.querySelectorAll('a, button, [role=button], span')]
    .find((e) => ['Skip', 'Not now'].includes(e.textContent.trim()) && e.getBoundingClientRect().width);
  if (!el) return false;
  el.click();
  return true;
})()`;

async function dismissPrompts(tab) {
  for (let i = 0; i < 4; i++) {
    // a click that navigates throws away the evaluation context; that still counts as a click
    if (!await tab.evaluate(DISMISS).catch(() => true)) return;
    await sleep(4000);
  }
}

export async function beforeMain(tab, sc) {
  if (sc.device === 'mobile') await dismissPrompts(tab);
  if (sc.open) {
    await waitFor(tab, `document.querySelector('${sc.open}')`);
    await tab.evaluate(`document.querySelector('${sc.open}').click()`);
    await sleep(5000);
    if (sc.device === 'mobile') await dismissPrompts(tab);
  }
  await waitFor(tab, sc.settled);
  await tab.evaluate('scrollTo(0, 0)');
  await sleep(1500);
}

// Own account: the profile photo's file name (the same file is served in every size and crop),
// plus the display name from the desktop left sidebar. Detected once and reused for every scene.
const OWN_PHOTO = `(() => {
  const el = document.querySelector('[aria-label="Your profile"] image, [aria-label="Go to profile"] img');
  const url = el && (el.getAttribute('xlink:href') || el.getAttribute('href') || el.src);
  return url && new URL(url).pathname.split('/').pop();
})()`;

export async function detectOwn(tab, opts, sc) {
  if (!opts.ownPhoto) opts.ownPhoto = await tab.evaluate(OWN_PHOTO);
  if (!opts.ownPhoto) {
    // some pages (mobile notifications, the mobile profile) don't show it; read it off the feed and come back
    await tab.send('Page.navigate', { url: 'https://www.facebook.com/' });
    await waitFor(tab, READY);
    if (sc.device === 'mobile') await dismissPrompts(tab);
    await waitFor(tab, `!!${OWN_PHOTO}`);
    opts.ownPhoto = await tab.evaluate(OWN_PHOTO);
    await tab.send('Page.navigate', { url: sc.url });
    await waitFor(tab, sc.ready);
    await beforeMain(tab, sc);
  }
  if (!opts.ownName) {
    opts.ownName = await tab.evaluate(`(() => {
      const own = ${JSON.stringify(opts.ownPhoto)};
      const a = [...document.querySelectorAll('[role=navigation] a[href]')]
        .find((a) => a.textContent.trim() && [...a.querySelectorAll('image, img')].some((i) => (i.getAttribute('xlink:href') || i.src || '').includes(own)));
      return a ? a.textContent.trim() : null;
    })()`);
  }
}

// Runs inside facebook.com. Builds the assets, features the avatar, then redacts everything else.
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
    while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (t && !w.currentNode.parentElement.closest('script, style')) orig.add(t); }
    for (const el of document.querySelectorAll('[alt],[aria-label],[title],[placeholder]'))
      for (const a of ['alt', 'aria-label', 'title', 'placeholder']) { const v = el.getAttribute(a); if (v) orig.add(v.trim()); }
    window.__igpOrig = [...orig];
  }

  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const hrefOf = (im) => im.getAttribute('href') || im.getAttribute('xlink:href') || '';
  const srcOf = (im) => (im.tagName === 'IMG' ? im.src : hrefOf(im));
  const setImg = (im, src) => {
    if (im.tagName === 'IMG') { im.removeAttribute('srcset'); im.removeAttribute('sizes'); im.src = src; } else { im.removeAttribute('xlink:href'); im.setAttribute('href', src); }
  };
  const textNodes = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim() && !n.parentElement.closest('script, style') ? 1 : 2 });
    const out = []; while (w.nextNode()) out.push(w.currentNode); return out;
  };
  const leafTexts = (root) => textNodes(root).filter((n) => !n.parentElement.closest('svg'));
  // text written here is final; the redaction pass leaves it alone
  const mine = new WeakSet();
  const setText = (t, s) => { t.textContent = s; mine.add(t); };
  const tall = (el, min) => { while (el && el.getBoundingClientRect().height < min) el = el.parentElement; return el; };

  // icons, logos and stickers are Facebook UI, not anybody's content (same files as STATIC above)
  const STATIC = /^https:\/\/([\w-]*static\.xx\.fbcdn\.net\/rsrc\.php|www\.facebook\.com\/(images|rsrc\.php))\//;
  const own = o.ownPhoto;

  // --- 1. images: own profile photo → the new avatar, other people → placeholder, photos → placeholder post
  if (o.device === 'mobile') {
    // the mobile site sizes images with script; pin them to their boxes so the snapshot keeps the layout
    for (const img of document.querySelectorAll('[data-mcomponent=ImageArea] > img')) Object.assign(img.style, { left: '0', top: '0', width: '100%', height: '100%', objectFit: 'cover' });
  }
  for (const im of document.querySelectorAll('img, svg image')) {
    const src = srcOf(im);
    if (!src || src.startsWith('data:') || STATIC.test(src)) continue;
    if (own && src.includes(own)) { setImg(im, AV); if (im.tagName === 'IMG') im.style.objectFit = 'cover'; continue; }
    const r = im.getBoundingClientRect();
    const label = im.closest('[aria-label]')?.getAttribute('aria-label') || '';
    const avatarish = im.tagName !== 'IMG' || /profile picture/i.test(label) || (r.width <= 200 && Math.abs(r.width - r.height) < 2);
    setImg(im, avatarish ? PH : POST);
    if (im.tagName === 'IMG') im.style.objectFit = 'cover';
  }
  for (const el of document.querySelectorAll('[style*="background-image"]')) {
    const m = el.style.backgroundImage.match(/url\("?([^")]*)/);
    if (m && !m[1].startsWith('data:') && !STATIC.test(m[1])) el.style.backgroundImage = `url(${PH})`;
  }
  const isAV = (im) => srcOf(im) === AV;

  // --- 2. own name → placeholder name
  const names = [o.ownName, o.ownName?.split(' ')[0]].filter((n) => n && n.length > 1);
  for (const t of textNodes(document.body)) {
    let s = t.textContent;
    for (const n of names) s = s.split(n).join(o.name);
    if (s !== t.textContent) setText(t, s.replace(/\b(his|her)\b/g, 'their'));
  }
  for (const el of document.querySelectorAll('[placeholder]')) {
    if (/^What.s on your mind/.test(el.getAttribute('placeholder'))) el.setAttribute('placeholder', "What's on your mind?");
  }

  const cropEls = [];
  const crop = (name, el, pad = 8, maxHeight = Infinity) => { if (el) cropEls.push({ name, el, pad, maxHeight }); };

  // --- 3. scene specific featuring
  crop('own-nav', document.querySelector('[aria-label="Your profile"]'), 14);

  if (o.scene === 'home') {
    if (o.device === 'desktop') {
      const side = [...document.querySelectorAll('[role=navigation] a[href]')].find((a) => [...a.querySelectorAll('image')].some(isAV) && a.textContent.trim());
      crop('own-sidebar', side, 8);
      crop('composer', document.querySelector('[aria-label="Create a post"]')?.closest('[role=region]') || tall(document.querySelector('[aria-label="Create a post"]'), 60), 4);
    } else {
      const me = document.querySelector('[aria-label="Go to profile"]');
      crop('composer', me && tall(me, 70), 0);
      const card = [...document.querySelectorAll('img')].find((i) => isAV(i) && i.getBoundingClientRect().height > 100);
      crop('create-story', card?.closest('[role=button]'), 6);
    }

    // feed: the first post becomes "ours"
    let post, header;
    if (o.device === 'desktop') {
      // [role=article] only marks loading skeletons; a real post is found through its menu button
      post = tall(document.querySelector('[aria-label^="Actions for this post"]'), 300);
      header = post?.querySelector('svg image');
    } else {
      const pp = document.querySelector('[aria-label$=" Profile Picture"]');
      header = pp?.querySelector('img');
      post = pp && tall(pp, 300);
      // the author's name sits next to the picture as plain text
      const author = pp?.getAttribute('aria-label').replace(/ Profile Picture$/, '');
      if (post && author) for (const t of leafTexts(post)) if (t.textContent.trim() === author) setText(t, o.name);
    }
    if (post) {
      if (header) setImg(header, AV);
      const top = post.getBoundingClientRect().top;
      const texts = leafTexts(post);
      // desktop: the author is the first link with text in the header
      const link = texts.find((t) => t.parentElement.closest('a[href]') && t.parentElement.getBoundingClientRect().top < top + 60 && !mine.has(t));
      if (o.device === 'desktop' && link) setText(link, o.name);
      // the rest of the header is "· Follow" and the date, which Facebook scrambles into
      // dozens of tiny pieces against scraping; one plain time replaces all of it (on mobile,
      // where every piece has a fixed position, it is just cleared)
      texts.filter((t) => !mine.has(t) && t.parentElement.getBoundingClientRect().top < top + 70)
        .forEach((t, k) => setText(t, k === 0 && o.device === 'desktop' ? '2h' : ''));
      const caption = texts.find((t) => !mine.has(t) && !t.parentElement.closest('a[href]') && t.textContent.trim().length > 12 && t.parentElement.getBoundingClientRect().top > top + 40);
      if (caption) setText(caption, o.caption);
      crop('post-author', post, 8, o.device === 'mobile' ? 560 : 640);
    }
  }

  if (o.scene === 'profile') {
    // the biggest round own photo on screen (a "updated their profile picture" post further down can be bigger)
    const pic = [...document.querySelectorAll('img, svg image')]
      .filter((i) => isAV(i) && i.getBoundingClientRect().top < innerHeight - 100)
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    if (pic) crop('profile-picture', pic.tagName === 'IMG' ? pic.closest('[data-mcomponent=ImageArea]') || pic : pic.closest('svg'), 16);
  }

  if (o.scene === 'notifications') {
    // the account may have no notifications from people, so copy a real row and fill it in
    const row = o.device === 'desktop'
      ? document.querySelector('[role=list][aria-label="Notifications"] [role=listitem]:has(svg image, img)')
      : document.querySelector('[data-mcomponent=MContainer][role=button][aria-label]:has(img)');
    // a nag card about push notifications sits above the list on desktop
    const nag = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Your push notifications are off');
    if (nag) tall(nag, 120)?.remove();
    if (row) {
      // the mobile site lays rows out with script, so copies would stack; it gets the one row.
      // Its text keeps line breaks as written, hence the \n (a space on desktop).
      const fill = [
        { avatar: AV, text: `${o.name} commented on your post:\n“${o.note}”`, time: '5m' },
        { avatar: PH, text: 'Person 01 reacted to your photo.', time: '1h' },
        { avatar: PH, text: 'Person 02 shared your post.', time: '3h' },
      ].slice(0, o.device === 'mobile' ? 1 : 3);
      // find the parts on the real row, where there is layout: the biggest image is the avatar
      // (the small one is the type badge), the widest text the sentence; hidden labels go blank
      const width = (el) => el.getBoundingClientRect().width;
      const imgs = [...row.querySelectorAll('img, svg image')];
      const avatarAt = imgs.indexOf(imgs.reduce((a, b) => (width(b) > width(a) ? b : a), imgs[0]));
      const texts = leafTexts(row);
      const sentenceAt = texts.indexOf(texts.reduce((a, b) => (width(b.parentElement) > width(a.parentElement) ? b : a), texts[0]));
      const copies = fill.map((f) => {
        const c = row.cloneNode(true);
        const avatar = c.querySelectorAll('img, svg image')[avatarAt];
        if (avatar) setImg(avatar, f.avatar);
        leafTexts(c).forEach((t, k) => setText(t, k === sentenceAt ? f.text : /\d/.test(t.textContent) ? f.time : ''));
        row.before(c);
        return c;
      });
      // the copies stand in for the real row
      row.remove();
      crop('notification', copies[0], 4);
    }
  }

  // --- 4. everything else that isn't Facebook UI text is replaced
  const UI = new Set([
    'Home', 'Reels', 'Friends', 'Groups', 'Marketplace', 'Watch', 'Gaming', 'Meta AI', 'Memories', 'Saved', 'Feeds', 'Events',
    'Ads Manager', 'Pages', 'Messenger', 'Video', 'Fundraisers', 'Climate Science Center', 'See more', 'See less', 'Find friends',
    'Create story', 'Share a photo, video or write something', "What's on your mind?", 'Live video', 'Photo/video', 'Photo',
    'Feeling/activity', 'Life update', 'Follow', 'Like', 'Comment', 'Share', 'Send', 'Reply', 'Privacy', 'Terms', 'Advertising',
    'Ad Choices', 'Cookies', 'More', 'Meta', 'Notifications', 'All', 'Unread', 'New', 'Earlier', 'Today', 'See all', 'See previous notifications',
    'About', 'Photos', 'Videos', 'Check-ins', 'Posts', 'Filters', 'Manage posts', 'List view', 'Grid view', 'Edit profile', 'Add to story',
    'Personal details', 'Highlights', 'Add highlights', 'See all friends', 'See all photos', 'Intro', 'Add bio', 'Edit details',
    'Add featured', 'Create a post', 'Get more out of Facebook', "We've made it easier to add the stuff you're into, and see which friends like it too.",
    'Update your profile', 'Add friend', 'People you may know', 'Open app', 'See translation', 'Sponsored', 'Shortcuts', 'Your shortcuts',
    'Contacts', 'Group conversations', 'Most relevant', 'Public', 'Suggested for you', 'Get app', 'Search', 'Search Facebook', 'Edit',
    'Write a comment…', 'Write a comment...', 'View more comments', 'Most recent', 'Your profile', 'Settings & privacy', 'Help & support',
    "See who's also on Facebook. Tap here to get help finding friends.", 'Mark all as read', 'Profile', 'Menu', 'Chats', 'Stories',
    'Add Your Friends', 'Done', 'Featured', 'Reels and short videos', 'People', 'Add', 'Message', 'Remove', 'Delete', 'Hide',
    'Facebook', 'Facebook Menu', 'Shared with Public', 'Learn More', 'People You May Know', 'Share a thought...', 'Feed posts',
    'Add cover photo', 'Edit cover photo', 'Create avatar profile picture',
  ]);
  const THEIR = /^updated (his|her|their) (profile picture|cover photo)\.$/;
  const TIME = /^(\d+\s?[smhdwy]|Just now|Yesterday( at .*)?|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}( at \d{1,2}:\d{2}\s?[AP]M)?|\d{1,2}:\d{2}\s?[AP]M)$/;
  // single characters are the pieces Facebook scrambles dates and "Sponsored" into
  const keep = (s) => UI.has(s) || TIME.test(s) || /^[\d,.]+[KkM]?\+?$/.test(s) || /^Followed by [\d,.]+[KkM]?$/.test(s)
    || /^[\s·•…|/\-.,:;!?()͏​-‏]*$/.test(s) || [...s].length === 1;
  let pn = 2;
  const person = () => `Person ${String(++pn).padStart(2, '0')}`;
  // what got replaced goes into the dump's leak report, to spot UI text missing from the list above
  window.__igpReplaced = window.__igpReplaced || [];
  for (const t of textNodes(document.body)) {
    if (mine.has(t)) continue;
    const s = t.textContent.replace(/\s+/g, ' ').replace(/[‘’]/g, "'").trim();
    if (THEIR.test(s)) { t.textContent = s.replace(THEIR, 'updated their $2.'); continue; }
    if (keep(s)) continue;
    const named = t.parentElement.closest('a[href], h1, h2, h3, h4, strong, [role=heading]');
    window.__igpReplaced.push(s);
    t.textContent = named && s.length <= 40 ? person() : 'Placeholder text';
  }
  for (const el of document.querySelectorAll('[placeholder]')) if (!keep(el.getAttribute('placeholder'))) el.setAttribute('placeholder', '');
  document.title = 'Facebook';

  await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  const crops = cropEls.map(({ name, el, pad, maxHeight }) => {
    const r = rect(el);
    return { name, x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: Math.min(r.height, maxHeight) + pad * 2 };
  });
  // keep crops inside the viewport
  return crops.map((c) => {
    const x = Math.max(0, c.x), y = Math.max(0, c.y);
    return { ...c, x, y, width: Math.min(innerWidth - x, c.width - (x - c.x)), height: Math.min(innerHeight - y, c.height - (y - c.y)) };
  }).filter((c) => c.width > 4 && c.height > 4);
}
