#!/usr/bin/env node
// Dump every scene as a static, redacted HTML snapshot for the web previewer.
//
// Each scene is loaded live, redacted and featured exactly like the screenshot script, then
// serialised: invisible/off-screen nodes, scripts, links and most attributes are dropped, the
// CSS is pruned to rules that still match, and images are pointed at shared assets.
// Avatar slots are tagged data-slot="avatar" so the previewer can swap them.
//
// Usage: pnpm scenes [--port 9222]
//
// Writes public/scenes/*.html, public/assets/ and src/scenes.json.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { CDP, browserWsUrl, openTab, prepareScene, SCENES } from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '9222' },
  },
});

// In-page: turn the live, redacted DOM into a self-contained HTML string.
async function serialize(o) {
  const { AV, PH, POST } = window.__igp;

  // live-DOM fixes first: canvases (story rings) and videos don't survive serialisation
  for (const c of document.querySelectorAll('canvas')) {
    if (!c.width || !c.height) { c.remove(); continue; }
    const img = document.createElement('img');
    try { img.src = c.toDataURL('image/png'); } catch { c.remove(); continue; }
    img.setAttribute('class', c.getAttribute('class') || '');
    img.setAttribute('style', c.getAttribute('style') || '');
    img.style.width = `${c.getBoundingClientRect().width}px`;
    c.replaceWith(img);
  }
  for (const v of document.querySelectorAll('video')) {
    const img = document.createElement('img');
    img.src = POST;
    img.setAttribute('class', v.getAttribute('class') || '');
    img.setAttribute('style', (v.getAttribute('style') || '') + ';object-fit:cover;width:100%;height:100%');
    v.replaceWith(img);
  }
  for (const img of document.querySelectorAll('img')) {
    if (img.src === AV) img.dataset.slot = 'avatar';
    else if (!img.src.startsWith('data:')) img.src = PH;
  }

  // browser extensions inject their own buttons (e.g. downloaders); they are not Instagram UI
  for (const el of document.body.querySelectorAll('[style*="--extension-"]')) {
    let t = el;
    while (t.parentElement && t.parentElement.children.length === 1 && t.parentElement !== document.body) t = t.parentElement;
    t.remove();
  }
  // the extension writes unbalanced `url(` values into <html style>, which makes the browser read
  // the rest of the attribute (Instagram's theme variables) as one value; cut them from the raw text
  const rootStyle = document.documentElement.getAttribute('style') || '';
  document.documentElement.setAttribute('style', rootStyle.replace(/--extension-[\w-]+:[^;]*;\s*/g, ''));

  // mark what nobody can see: hidden, or entirely outside the viewport
  const W = innerWidth, H = innerHeight;
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    // display:contents wrappers have no box of their own; judge their children instead
    if (getComputedStyle(el).display === 'contents') continue;
    let gone = !el.checkVisibility({ visibilityProperty: true });
    if (!gone) {
      const r = el.getBoundingClientRect();
      // zero-area wrappers (e.g. a 0px-wide fixed rail) still host visible children
      gone = r.width && r.height && (r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W);
    }
    if (gone) el.setAttribute('data-igp-drop', '');
  }

  const root = document.documentElement.cloneNode(true);
  root.querySelectorAll('[data-igp-drop], script, noscript, link, meta, style, iframe, template, title, input[type=hidden]').forEach((e) => e.remove());
  for (const el of document.body.querySelectorAll('[data-igp-drop]')) el.removeAttribute('data-igp-drop');

  const KEEP = new Set(['class', 'style', 'role', 'aria-hidden', 'dir', 'type', 'placeholder', 'src', 'width', 'height', 'data-slot', 'colspan', 'rowspan']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (el.nodeType === 8) { comments.push(el); continue; }
    const inSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(a.name);
      else if (inSvg) { if ((/href$/.test(n) && !a.value.startsWith('#')) || n === 'aria-label' || n === 'title') el.removeAttribute(a.name); }
      else if (!KEEP.has(n) && !(n === 'lang' && el === root)) el.removeAttribute(a.name);
    }
  }
  comments.forEach((c) => c.remove());

  // CSS: keep rules whose selector still matches something in the snapshot
  const matches = (sel) => {
    if (/(^|[\s,>+~(])(html|:root|body|\*)/.test(sel)) return true;
    const loose = sel.replace(/::?[a-zA-Z-]+(\((?:[^()]|\([^()]*\))*\))?/g, '').trim();
    // querySelector never matches the root itself, and theme variables hang off <html> classes
    try { return root.matches(loose || '*') || !!root.querySelector(loose || '*'); } catch { return true; }
  };
  const prune = (rules) => {
    let out = '';
    for (const r of rules) {
      if (r instanceof CSSStyleRule) { if (matches(r.selectorText)) out += r.cssText + '\n'; }
      else if (r instanceof CSSFontFaceRule) { if (!/url\((?!["']?data:)/.test(r.cssText)) out += r.cssText + '\n'; }
      else if (r instanceof CSSImportRule) continue;
      else if (r.cssRules && !(r instanceof CSSKeyframesRule)) {
        const inner = prune(r.cssRules);
        if (inner) out += r.cssText.slice(0, r.cssText.indexOf('{')) + '{\n' + inner + '}\n';
      } else out += r.cssText + '\n';
    }
    return out;
  };
  let css = '';
  for (const sh of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
    try { css += prune(sh.cssRules); } catch (e) { console.warn('unreadable stylesheet', sh.href); }
  }

  const htmlAttrs = [...root.attributes].map((a) => ` ${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join('');
  return `<!doctype html>
<html${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${o.title}</title>
<style>
${css}
</style>
<style>
/* static snapshot: no motion, no scrolling, no interaction */
*, *::before, *::after { animation: none !important; transition: none !important; }
html, body { overflow: hidden !important; height: 100%; }
body { pointer-events: none; }
</style>
</head>
${root.querySelector('body').outerHTML}
</html>
`;
}

const root = path.resolve(import.meta.dirname, '..');
const sceneDir = path.join(root, 'public/scenes');
const assetDir = path.join(root, 'public/assets');
// rings are content-hashed, so clear old ones instead of letting them pile up
fs.rmSync(path.join(assetDir, 'rings'), { recursive: true, force: true });
fs.mkdirSync(sceneDir, { recursive: true });
fs.mkdirSync(path.join(assetDir, 'rings'), { recursive: true });

// The avatar used while dumping is a throwaway marker: every slot is re-pointed at
// assets/default-avatar.png, which the previewer replaces with the uploaded one.
const marker = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const cdp = await CDP.connect(await browserWsUrl(args.port));
const opts = { avatar: marker, username: 'your.username', name: 'Your Name', note: 'SITCON 2027 見！', message: 'Sent an attachment', caption: 'Placeholder caption for the preview post ✨' };
const manifest = [];
const report = [];

const writeAsset = (dataUrl, name) => {
  const [, ext, b64] = dataUrl.match(/^data:image\/(\w+);base64,(.*)$/);
  const file = `${name}.${ext === 'jpeg' ? 'jpg' : ext}`;
  fs.writeFileSync(path.join(assetDir, file), Buffer.from(b64, 'base64'));
  return `../assets/${file}`;
};

try {
  for (const sc of SCENES) {
    const tab = await openTab(cdp, sc.device);
    try {
      const crops = await prepareScene(tab, sc, opts, { freeze: false });
      const id = `${sc.device}-${sc.scene}`;
      let html = await tab.evaluate(`(${serialize})(${JSON.stringify({ title: id })})`);
      const { AV, PH, POST } = await tab.evaluate('window.__igp');

      // nothing may point back at Instagram's servers
      html = html.replace(/url\((?!\s*["']?data:)[^)<>\n]*\)/g, 'none');
      html = html.split(AV).join('../assets/default-avatar.png');
      html = html.split(PH).join(writeAsset(PH, 'placeholder-avatar'));
      html = html.split(POST).join(writeAsset(POST, 'placeholder-post'));
      // story rings (and any other baked canvas) → deduplicated files
      html = html.replace(/data:image\/png;base64,[A-Za-z0-9+/=]{200,}/g, (d) => {
        const h = crypto.createHash('sha1').update(d).digest('hex').slice(0, 12);
        const f = path.join(assetDir, 'rings', `${h}.png`);
        if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
        return `../assets/rings/${h}.png`;
      });
      const leaks = html.match(/https?:\/\/[^\s"')]*(instagram|fbcdn|facebook)[^\s"')]*/g);
      if (leaks) throw new Error(`${id}: external references left: ${leaks.slice(0, 3)}`);

      // leak check: which original strings from the live page still appear in the snapshot?
      const orig = await tab.evaluate('window.__igpOrig');
      const body = html.slice(html.indexOf('<body'));
      // compare against visible text and attribute values (not class names), decoded
      const decode = (x) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, '\u00a0').trim();
      const segments = [...body.matchAll(/>([^<]+)</g), ...body.matchAll(/(?:src|placeholder)="([^"]*)"/g)].map((m) => decode(m[1])).filter(Boolean);
      const survivors = orig.filter((t) => segments.some((seg) => seg === t || (t.length >= 4 && seg.includes(t))));
      report.push(`===== ${id}: ${survivors.length} original strings remain\n${survivors.map((t) => `  ${JSON.stringify(t)}`).join('\n')}`);

      fs.writeFileSync(path.join(sceneDir, `${id}.html`), html);
      const vp = { desktop: [1440, 900], mobile: [390, 844] }[sc.device];
      manifest.push({ id, device: sc.device, scene: sc.scene, width: vp[0], height: vp[1], crops });
      console.log(`✓ ${id}  ${(html.length / 1024).toFixed(0)} KB, crops: ${crops.map((c) => c.name).join(', ')}`);
    } finally {
      await cdp.send('Target.closeTarget', { targetId: tab.targetId });
    }
  }
} finally {
  cdp.close();
}
fs.writeFileSync(path.join(root, 'src/scenes.json'), JSON.stringify(manifest, null, 2) + '\n');
// the report quotes live page text, so it stays outside the published directory
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out/leak-report.txt'), report.join('\n\n') + '\n');
console.log('leak report: out/leak-report.txt');
