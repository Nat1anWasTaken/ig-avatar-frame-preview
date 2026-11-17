import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { compileModule } from 'svelte/compiler';

// Compile the real module without reactive scheduling; control only browser I/O.
const compiled = compileModule(readFileSync(new URL('../src/lib/editor.svelte.js', import.meta.url), 'utf8'), {
  filename: 'editor.svelte.js', generate: 'server',
}).js.code.replace(/^import .*;$/gm, '').replace(/\bexport (?=(const|function|async function))/g, '');

function setup({ frameKey = 'sitcon-2027', avatarFile = 'sitcon-2027-avatar.png' } = {}) {
  const urls = new Map(), revoked = new Set(), timers = new Map();
  const images = [], exports = [], downloads = [], shares = [];
  let nextUrl = 0, nextTimer = 0;
  let drawing = [];
  const canvas = {
    getContext: () => ({
      clearRect: () => { drawing = []; },
      drawImage: (image, ...coords) => { drawing.push([image.src, ...coords]); },
    }),
    toBlob: (callback) => { exports.push({ callback, contents: JSON.stringify(drawing) }); },
  };
  const navigator = { userActivation: { isActive: true } };
  const io = { coarse: false, fetchError: false, shareError: null };
  const context = {
    Blob, File, console, tick: () => Promise.resolve(),
    pub: (path) => `/social-kit/${path}`,
    AVATAR: { file: avatarFile },
    PRESETS: [
      { key: frameKey, label: 'Official frame', src: '/official-frame.png' },
      { key: 'none', label: '不加框', src: null },
    ],
    Image: class {
      set src(value) { this.url = value; images.push(this); }
      get src() { return this.url; }
    },
    URL: {
      createObjectURL(blob) { const url = `blob:${++nextUrl}`; urls.set(url, blob); return url; },
      revokeObjectURL(url) { assert.ok(urls.has(url)); revoked.add(url); urls.delete(url); },
    },
    document: {
      createElement(tag) {
        if (tag === 'canvas') return canvas;
        assert.equal(tag, 'a');
        return {
          click() { downloads.push({ url: this.href, filename: this.download, blob: urls.get(this.href) }); },
          remove() {},
        };
      },
      body: { append() {} },
    },
    navigator,
    matchMedia: () => ({ matches: io.coarse }),
    fetch: async (url) => {
      if (io.fetchError) return { ok: false };
      return { ok: true, blob: async () => urls.get(url) || new Blob(['banner'], { type: 'image/png' }) };
    },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const api = runInNewContext(`${compiled}\n({ editor, init, setPhoto, setFrameFile, choosePreset, pan, setZoom, resetCrop, download, save });`, context);
  function load(name, { fail = false, width = 1200, height = 900 } = {}) {
    const image = images.find((item) => !item.done && (item.src === name || urls.get(item.src)?.name === name));
    assert.ok(image, `pending image ${name}`);
    image.done = true;
    image.width = image.naturalWidth = width;
    image.height = image.naturalHeight = height;
    if (fail) image.onerror(); else image.onload();
    return image;
  }
  function runTimers(delay = 60) {
    for (const [id, task] of [...timers]) {
      if (task.delay === delay) { timers.delete(id); task.fn(); }
    }
  }
  function finishExport(index = 0, fail = false) {
    const job = exports.splice(index, 1)[0];
    assert.ok(job, 'pending canvas export');
    const blob = fail ? null : new Blob([job.contents], { type: 'image/png' });
    job.callback(blob);
    return blob;
  }
  async function photo(name = 'photo.png') {
    await api.choosePreset('none');
    const pending = api.setPhoto(new File(['photo'], name, { type: 'image/png' }));
    load(name);
    await pending;
  }
  function enableSharing() {
    io.coarse = true;
    navigator.canShare = () => true;
    navigator.share = async (data) => { shares.push(data); if (io.shareError) throw io.shareError; };
  }
  return { ...api, urls, revoked, exports, downloads, shares, navigator, io, load, runTimers, finishExport, photo, enableSharing };
}

test('the initialized sample is never a downloadable personal avatar', async () => {
  const h = setup();
  const ready = h.init();
  h.load('/official-frame.png');
  h.load('/social-kit/assets/placeholder-avatar.png');
  await ready;
  h.runTimers(); h.finishExport();
  assert.equal(h.editor.hasPhoto, false);
  assert.equal(h.editor.photoThumb, '');
  assert.equal(h.editor.canDownload, false);
  assert.equal(await h.download(), 'unavailable');
  assert.equal(h.downloads.length, 0);
});

for (const file of ['sitcon-2027-facebook-cover.png', 'sitcon-2027-line-background.png']) {
  test(`avatar initialization and edits preserve save feedback for ${file}`, async () => {
    const h = setup();
    const ready = h.init();
    await h.save('/banner.png', file);
    h.load('/official-frame.png');
    h.load('/social-kit/assets/placeholder-avatar.png');
    await ready;
    assert.equal(h.editor.saveStatus, 'download-requested');
    assert.equal(h.editor.saveTarget, file);

    await h.photo();
    h.setZoom(2); h.pan(40, 50);
    assert.equal(h.editor.saveStatus, 'download-requested');
    assert.equal(h.editor.saveTarget, file);
    assert.equal(h.downloads.length, 1);
  });
}

test('the selected campaign supplies the initial frame and avatar filename', async () => {
  const h = setup({ frameKey: 'another-campaign', avatarFile: 'another-avatar.png' });
  const ready = h.init();
  h.load('/official-frame.png');
  h.load('/social-kit/assets/placeholder-avatar.png');
  await ready;
  assert.equal(h.editor.preset, 'another-campaign');
  const photo = h.setPhoto(new File(['photo'], 'photo.png', { type: 'image/png' }));
  h.load('photo.png');
  await photo;
  h.runTimers(); h.finishExport();
  assert.equal(await h.download(), 'download-requested');
  assert.equal(h.downloads[0].filename, 'another-avatar.png');
});

test('failure and cancellation preserve the current photo and crop', async () => {
  const h = setup();
  await h.photo();
  h.setZoom(2); h.pan(80, -40);
  const original = h.editor.photo, url = h.editor.photoThumb;
  const pending = h.setPhoto(new File(['broken'], 'broken.png', { type: 'image/png' }));
  assert.equal(h.editor.busy, true);
  h.load('broken.png', { fail: true });
  assert.equal(await pending, 'error');
  assert.equal(await h.setPhoto(null), 'cancelled');
  assert.equal(h.editor.photo, original);
  assert.equal(h.editor.photoThumb, url);
  assert.equal(h.editor.zoom, 2);
  assert.equal(h.editor.dx, 80);
  assert.equal(h.editor.dy, -40);
  assert.equal(h.editor.busy, false);
  assert.ok(h.editor.error);
  assert.ok(h.urls.has(url));
  assert.equal(h.urls.size, 1);
});

test('a failed default frame remains visible as an error after selecting a photo', async () => {
  const h = setup();
  const initial = h.init();
  h.load('/official-frame.png', { fail: true });
  h.load('/social-kit/assets/placeholder-avatar.png');
  await initial;
  const pending = h.setPhoto(new File(['photo'], 'photo.png', { type: 'image/png' }));
  h.load('photo.png'); await pending;
  h.runTimers(); h.finishExport();
  assert.equal(h.editor.hasPhoto, true);
  assert.ok(h.editor.error.includes('頭貼框'));
  assert.equal(h.editor.canDownload, false);
  assert.equal(await h.download(), 'unavailable');
  await h.choosePreset('none');
  h.runTimers(); h.finishExport();
  assert.equal(h.editor.error, '');
  assert.equal(h.editor.canDownload, true);
});

test('only the latest photo selection may commit, including rejected replacements', async () => {
  const h = setup();
  const first = h.setPhoto(new File(['a'], 'a.png', { type: 'image/png' }));
  const second = h.setPhoto(new File(['b'], 'b.png', { type: 'image/png' }));
  h.load('b.png'); await second;
  const kept = h.editor.photo;
  h.load('a.png');
  assert.equal(await first, 'superseded');
  assert.equal(h.editor.photo, kept);
  assert.equal(h.urls.size, 1);

  const pending = h.setPhoto(new File(['c'], 'c.png', { type: 'image/png' }));
  assert.equal(await h.setPhoto(new File(['text'], 'invalid.txt', { type: 'text/plain' })), 'error');
  h.load('c.png'); await pending;
  assert.equal(h.editor.photo, kept);
  assert.equal(h.editor.busy, false);
  assert.equal(h.urls.size, 1);
});

test('initialization and custom-frame races cannot overwrite newer choices', async () => {
  const h = setup();
  const initial = h.init();
  await h.photo();
  const custom = h.setFrameFile(new File(['frame'], 'custom.png', { type: 'image/png' }));
  h.load('custom.png'); await custom;
  const photo = h.editor.photo, frame = h.editor.frame;
  h.load('/official-frame.png'); h.load('/social-kit/assets/placeholder-avatar.png');
  await initial;
  assert.equal(h.editor.photo, photo);
  assert.equal(h.editor.frame, frame);
  assert.equal(h.editor.preset, null);
  assert.equal(h.editor.hasPhoto, true);

  const stale = h.setFrameFile(new File(['old'], 'old.png', { type: 'image/png' }));
  await h.choosePreset('none');
  h.load('old.png'); await stale;
  assert.equal(h.editor.frame, null);
  assert.equal(h.editor.preset, 'none');
  assert.equal(h.editor.frameThumb, '');
  assert.equal(h.urls.size, 1);
});

test('out-of-order canvas exports cannot replace the current preview', async () => {
  const h = setup();
  await h.photo();
  h.runTimers();
  h.setZoom(2); h.pan(100, 50);
  h.runTimers();
  const newest = h.finishExport(1);
  const url = h.editor.avatarUrl;
  h.finishExport(0);
  assert.equal(h.editor.avatarUrl, url);
  assert.equal(h.urls.get(url), newest);
  assert.equal(h.editor.canDownload, true);
});

test('download flushes pending output and saves exactly that preview', async () => {
  const h = setup();
  await h.photo();
  h.setZoom(2); h.pan(40, 50);
  const pending = h.download();
  const blob = h.finishExport();
  assert.equal(await pending, 'download-requested');
  h.runTimers();
  assert.equal(h.exports.length, 0);
  assert.equal(h.downloads[0].blob, blob);
  assert.equal(h.urls.get(h.editor.avatarUrl), blob);
  assert.equal(h.editor.saveTarget, 'sitcon-2027-avatar.png');
  assert.equal(h.editor.saveStatus, 'download-requested');
  const downloadUrl = h.downloads[0].url;
  h.resetCrop();
  assert.equal(h.editor.saveStatus, 'idle');
  assert.ok(h.urls.has(downloadUrl));
  h.runTimers(60_000);
  assert.equal(h.urls.has(downloadUrl), false);
});

test('failed encoding reports an error and a later render can recover', async () => {
  const h = setup();
  await h.photo();
  h.runTimers(); h.finishExport(0, true);
  assert.equal(h.editor.rendering, false);
  assert.equal(h.editor.canDownload, false);
  assert.ok(h.editor.error);
  h.resetCrop(); h.runTimers(); h.finishExport();
  assert.equal(h.editor.error, '');
  assert.equal(h.editor.canDownload, true);
});

test('cancelled sharing does not silently download, and expired activation falls back', async () => {
  const h = setup();
  h.enableSharing();
  h.io.shareError = { name: 'AbortError' };
  const blob = new Blob(['image'], { type: 'image/png' });
  assert.equal(await h.save(blob, 'cover.png'), 'cancelled');
  assert.equal(h.downloads.length, 0);
  assert.equal(h.editor.saveError, '');
  h.navigator.userActivation.isActive = false;
  assert.equal(await h.save(blob, 'cover.png'), 'download-requested');
  assert.equal(h.shares.length, 1);
  assert.equal(h.downloads.length, 1);
});

test('saving covers is independent of a photo and reports unavailable assets', async () => {
  const h = setup();
  assert.equal(await h.save('/cover.png', 'cover.png'), 'download-requested');
  assert.equal(h.editor.hasPhoto, false);
  h.enableSharing(); h.io.fetchError = true;
  assert.equal(await h.save('/missing.png', 'missing.png'), 'error');
  assert.ok(h.editor.saveError);
  assert.equal(h.editor.saving, false);
  assert.equal(h.editor.saveTarget, 'missing.png');
});
