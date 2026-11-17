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
  const images = [], exports = [], downloads = [], shares = [], fetches = [];
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
  const io = { fetchError: false, fetchGate: null, fetchType: 'image/png', fetchContents: 'banner', shareError: null };
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
    fetch: async (url) => {
      fetches.push(url);
      if (io.fetchGate) await io.fetchGate;
      if (io.fetchError) return { ok: false };
      return { ok: true, blob: async () => urls.get(url) || new Blob([io.fetchContents], { type: io.fetchType }) };
    },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const api = runInNewContext(`${compiled}\n({ editor, init, setPhoto, setFrameFile, choosePreset, pan, setZoom, resetCrop, download, save, supportsSharing, prepareShare, share, shareAvatar });`, context);
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
    navigator.canShare = () => true;
    navigator.share = async (data) => { shares.push(data); if (io.shareError) throw io.shareError; };
  }
  return { ...api, urls, revoked, exports, downloads, shares, fetches, navigator, io, load, runTimers, finishExport, photo, enableSharing };
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
  h.enableSharing();
  assert.equal(await h.shareAvatar(), 'unavailable');
  assert.equal(h.downloads.length, 0);
  assert.equal(h.shares.length, 0);
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

test('a failed new export leaves the old preview URL unusable as the current output', async () => {
  const h = setup();
  h.enableSharing();
  await h.photo(); h.runTimers();
  const blob = h.finishExport();
  const url = h.editor.avatarUrl;
  assert.equal(h.editor.outputReady, true);
  h.setZoom(2); h.runTimers(); h.finishExport(0, true);
  assert.equal(h.editor.avatarUrl, url);
  assert.equal(h.urls.get(url), blob);
  assert.equal(h.editor.rendering, false);
  assert.equal(h.editor.outputReady, false);
  assert.equal(h.editor.canDownload, false);
  assert.equal(await h.shareAvatar(), 'unavailable');
  assert.equal(h.shares.length, 0);
});

test('all artwork downloads bypass sharing and fetch even when sharing is supported', async () => {
  const h = setup();
  h.enableSharing();
  h.io.fetchError = true;
  assert.equal(await h.save('/cover.png', 'cover.png'), 'download-requested');
  assert.equal(await h.save('/background.png', 'background.png'), 'download-requested');
  assert.equal(h.editor.hasPhoto, false);
  await h.photo(); h.runTimers();
  const blob = h.finishExport();
  assert.equal(await h.download(), 'download-requested');
  assert.deepEqual(h.downloads.map((item) => item.filename), ['cover.png', 'background.png', 'sitcon-2027-avatar.png']);
  assert.equal(h.downloads[2].blob, blob);
  assert.equal(h.shares.length, 0);
  assert.equal(h.fetches.length, 0);
});

test('sharing support checks PNG files without depending on device type', () => {
  const h = setup();
  assert.equal(h.supportsSharing(), false);
  h.enableSharing();
  h.navigator.canShare = ({ files }) => {
    assert.equal(files.length, 1);
    assert.ok(files[0] instanceof File);
    assert.equal(files[0].type, 'image/png');
    return true;
  };
  assert.equal(h.supportsSharing(), true);
  h.navigator.canShare = () => false;
  assert.equal(h.supportsSharing(), false);
  h.navigator.canShare = () => { throw new Error('unsupported'); };
  assert.equal(h.supportsSharing(), false);
});

test('preparing a share preserves feedback and does not block downloads while fetching', async () => {
  const h = setup();
  await h.save('/cover.png', 'cover.png');
  let finishFetch;
  h.io.fetchGate = new Promise((resolve) => { finishFetch = resolve; });
  const pending = h.prepareShare('/background.png', 'background.png');
  assert.equal(h.editor.saveStatus, 'download-requested');
  assert.equal(h.editor.saveTarget, 'cover.png');
  assert.equal(h.editor.saving, false);
  assert.equal(await h.save('/background.png', 'background.png'), 'download-requested');
  finishFetch();
  const file = await pending;
  assert.ok(file instanceof File);
  assert.equal(file.name, 'background.png');
  assert.equal(file.type, 'image/png');
  assert.equal(await file.text(), 'banner');
  assert.equal(h.editor.saveStatus, 'download-requested');
  assert.equal(h.editor.saveTarget, 'background.png');
  assert.equal(h.shares.length, 0);
  assert.equal(h.downloads.length, 2);
});

test('failed or invalid share preparation can retry without changing download state', async () => {
  const h = setup();
  h.io.fetchError = true;
  await assert.rejects(h.prepareShare('/cover.png', 'cover.png'), /image unavailable/);
  assert.equal(h.editor.saveStatus, 'idle');
  assert.equal(h.editor.saveError, '');
  assert.equal(await h.save('/cover.png', 'cover.png'), 'download-requested');
  h.io.fetchError = false; h.io.fetchType = 'text/html';
  await assert.rejects(h.prepareShare('/cover.png', 'cover.png'), /invalid image/);
  h.io.fetchType = 'image/png'; h.io.fetchContents = '';
  await assert.rejects(h.prepareShare('/cover.png', 'cover.png'), /invalid image/);
  h.io.fetchContents = 'recovered';
  const file = await h.prepareShare('/cover.png', 'cover.png');
  assert.equal(await file.text(), 'recovered');
  assert.equal(h.editor.saveStatus, 'download-requested');
  assert.equal(h.editor.saveTarget, 'cover.png');
  assert.equal(h.editor.saving, false);
  assert.equal(h.shares.length, 0);
});

test('sharing calls the browser synchronously with the exact prepared file', async () => {
  const h = setup();
  h.enableSharing();
  const file = await h.prepareShare('/cover.png', 'cover.png');
  const pending = h.share(file);
  assert.equal(h.shares.length, 1);
  assert.equal(h.shares[0].files[0], file);
  assert.deepEqual(Object.keys(h.shares[0]), ['files']);
  assert.equal(h.editor.saving, true);
  assert.equal(await pending, 'shared');
  assert.equal(h.editor.saveTarget, 'cover.png');
  assert.equal(h.editor.saveError, '');
  assert.equal(h.downloads.length, 0);
});

test('cancelled, rejected, or expired sharing never silently downloads', async () => {
  const h = setup();
  h.enableSharing();
  const file = new File(['image'], 'cover.png', { type: 'image/png' });
  h.io.shareError = { name: 'AbortError' };
  assert.equal(await h.share(file), 'cancelled');
  assert.equal(h.editor.saveError, '');
  h.io.shareError = { name: 'DataError' };
  assert.equal(await h.share(file), 'error');
  assert.equal(h.editor.saveError, '無法分享，請改用下載。');
  h.io.shareError = null; h.navigator.userActivation.isActive = false;
  assert.equal(await h.share(file), 'error');
  assert.equal(h.shares.length, 2);
  assert.equal(h.editor.saving, false);
  assert.equal(h.downloads.length, 0);
  assert.equal(h.fetches.length, 0);
});

test('sharing rejects invalid files and checks actual file support', async () => {
  const h = setup();
  h.enableSharing();
  const file = new File(['image'], 'cover.png', { type: 'image/png' });
  assert.equal(await h.share(new Blob(['image'], { type: 'image/png' })), 'error');
  assert.equal(await h.share(new File([], 'empty.png', { type: 'image/png' })), 'error');
  assert.equal(await h.share(new File(['text'], 'text.txt', { type: 'text/plain' })), 'error');
  h.navigator.canShare = ({ files }) => files[0] !== file;
  assert.equal(h.supportsSharing(), true);
  assert.equal(await h.share(file), 'error');
  assert.equal(h.shares.length, 0);
  assert.equal(h.downloads.length, 0);
});

test('avatar sharing uses the latest confirmed output without starting an export', async () => {
  const h = setup();
  h.enableSharing();
  await h.photo(); h.runTimers(); h.finishExport();
  h.setZoom(2); h.pan(40, 50);
  assert.equal(await h.shareAvatar(), 'unavailable');
  assert.equal(h.exports.length, 0);
  assert.equal(h.shares.length, 0);
  h.runTimers();
  const blob = h.finishExport();
  const pending = h.shareAvatar();
  assert.equal(h.shares.length, 1);
  assert.equal(await pending, 'shared');
  const file = h.shares[0].files[0];
  assert.equal(file.name, 'sitcon-2027-avatar.png');
  assert.equal(file.type, 'image/png');
  assert.equal(await file.text(), await blob.text());
  assert.equal(h.urls.get(h.editor.avatarUrl), blob);
  assert.equal(h.exports.length, 0);
  assert.equal(h.fetches.length, 0);
  assert.equal(h.downloads.length, 0);
});

test('a pending share keeps the confirmed output ready while preventing another export action', async () => {
  const h = setup();
  h.enableSharing();
  await h.photo(); h.runTimers();
  const blob = h.finishExport();
  const url = h.editor.avatarUrl;
  let finishShare;
  h.navigator.share = (data) => {
    h.shares.push(data);
    return new Promise((resolve) => { finishShare = resolve; });
  };
  const pending = h.shareAvatar();
  assert.equal(h.editor.saving, true);
  assert.equal(h.editor.outputReady, true);
  assert.equal(h.editor.canDownload, false);
  assert.equal(h.editor.avatarUrl, url);
  assert.equal(h.urls.get(url), blob);
  assert.equal(await h.shareAvatar(), 'unavailable');
  assert.equal(h.shares.length, 1);
  finishShare();
  assert.equal(await pending, 'shared');
  assert.equal(h.editor.outputReady, true);
  assert.equal(h.editor.canDownload, true);
});

test('avatar sharing preserves the confirmed result after a failed replacement', async () => {
  const h = setup();
  h.enableSharing();
  await h.photo(); h.setZoom(2); h.pan(80, -40); h.runTimers();
  const blob = h.finishExport();
  const pending = h.setPhoto(new File(['broken'], 'broken.png', { type: 'image/png' }));
  assert.equal(await h.shareAvatar(), 'unavailable');
  h.load('broken.png', { fail: true });
  assert.equal(await pending, 'error');
  assert.equal(await h.setPhoto(null), 'cancelled');
  assert.equal(await h.shareAvatar(), 'shared');
  assert.equal(await h.shares[0].files[0].text(), await blob.text());
  assert.equal(h.editor.zoom, 2);
  assert.equal(h.editor.dx, 80);
  assert.equal(h.editor.dy, -40);
  assert.equal(h.downloads.length, 0);
});
