import { tick } from 'svelte';
import { pub, PRESETS, AVATAR } from './assets.js';

export const SIZE = 1080;
const canvas = document.createElement('canvas');
canvas.width = canvas.height = SIZE;
const ctx = canvas.getContext('2d');
export const source = canvas;

let previewBlob = null;
let previewVersion = -1;
export const editor = $state({
  photo: null, photoThumb: '', hasPhoto: false,
  frame: null, frameName: '', frameThumb: '', preset: null,
  zoom: 1, dx: 0, dy: 0,
  avatarUrl: pub('assets/default-avatar.png'), version: 0,
  busy: false, rendering: false, photoError: '', frameError: '', renderError: '',
  saveStatus: 'idle', saveError: '', saveTarget: '',
  get error() { return this.frameError || this.photoError || this.renderError; },
  get frameReady() { return this.preset !== null || this.frame !== null; },
  get saving() { return this.saveStatus === 'saving'; },
  get outputReady() {
    return this.hasPhoto && this.frameReady && !this.busy && !this.rendering && previewVersion === this.version;
  },
  get canDownload() { return this.outputReady && !this.saving; },
});

const ownedUrls = new Set();
function objectUrl(blob) {
  const url = URL.createObjectURL(blob);
  ownedUrls.add(url);
  return url;
}
function release(url) {
  if (ownedUrls.delete(url)) URL.revokeObjectURL(url);
}
const releaseAfterUpdate = (url) => tick().then(() => release(url));

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => img.naturalWidth && img.naturalHeight ? resolve(img) : reject(new Error('empty image'));
  img.onerror = () => reject(new Error('invalid image'));
  img.src = src;
});

let photoRequest = 0;
let frameRequest = 0;
let photoLoading = false;
let frameLoading = false;
const updateBusy = () => { editor.busy = photoLoading || frameLoading; };
function clearAvatarSaveStatus() {
  if (!editor.saving && editor.saveTarget === AVATAR.file) {
    editor.saveStatus = 'idle';
    editor.saveError = '';
    editor.saveTarget = '';
  }
}

function render() {
  editor.renderError = '';
  ctx.clearRect(0, 0, SIZE, SIZE);
  const p = editor.photo;
  if (p) {
    const k = Math.max(SIZE / p.width, SIZE / p.height) * editor.zoom;
    const w = p.width * k, h = p.height * k;
    editor.dx = Math.min(Math.max(editor.dx, (SIZE - w) / 2), (w - SIZE) / 2);
    editor.dy = Math.min(Math.max(editor.dy, (SIZE - h) / 2), (h - SIZE) / 2);
    ctx.drawImage(p, (SIZE - w) / 2 + editor.dx, (SIZE - h) / 2 + editor.dy, w, h);
  }
  if (editor.frame) ctx.drawImage(editor.frame, 0, 0, SIZE, SIZE);
  editor.version++;
  clearAvatarSaveStatus();
  clearTimeout(exportTimer);
  exportRequest++;
  editor.rendering = true;
  exportTimer = setTimeout(exportPreview, 60);
}

let exportTimer;
let exportRequest = 0;
let exportingVersion = -1;
let exporting;
function exportPreview() {
  clearTimeout(exportTimer);
  if (previewVersion === editor.version) return Promise.resolve(previewBlob);
  if (exportingVersion === editor.version) return exporting;
  const version = editor.version;
  const request = ++exportRequest;
  exportingVersion = version;
  editor.rendering = true;
  exporting = new Promise((resolve) => {
    const finish = (blob) => {
      if (request !== exportRequest || version !== editor.version) { resolve(null); return; }
      if (blob) {
        const previous = editor.avatarUrl;
        editor.avatarUrl = objectUrl(blob);
        previewBlob = blob;
        previewVersion = version;
        releaseAfterUpdate(previous);
      } else {
        editor.renderError = '無法產生圖片，請重新調整或選擇照片後再試。';
        exportingVersion = -1;
      }
      editor.rendering = false;
      resolve(blob);
    };
    try { canvas.toBlob(finish, 'image/png'); } catch { finish(null); }
  });
  return exporting;
}

// Offsets are canvas pixels; keyboard and pointer controls share these bounds.
export function pan(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  editor.dx += x; editor.dy += y; editor.photoError = ''; render();
}
export function setZoom(z) {
  if (!Number.isFinite(z)) return;
  editor.zoom = Math.min(Math.max(z, 1), 3); editor.photoError = ''; render();
}
export function resetCrop() {
  editor.zoom = 1; editor.dx = editor.dy = 0; editor.photoError = ''; render();
}

export async function setPhoto(file) {
  if (!file) return 'cancelled';
  const request = ++photoRequest;
  photoLoading = true; updateBusy();
  editor.photoError = '';
  clearAvatarSaveStatus();
  let url;
  let committed = false;
  try {
    if (!(file instanceof Blob) || !file.type.startsWith('image/')) throw new Error('invalid file');
    url = objectUrl(file);
    const photo = await loadImage(url);
    if (request !== photoRequest) return 'superseded';
    const previous = editor.photoThumb;
    editor.photo = photo;
    editor.photoThumb = url;
    editor.hasPhoto = true;
    committed = true;
    resetCrop();
    releaseAfterUpdate(previous);
    return 'ready';
  } catch {
    if (request === photoRequest) editor.photoError = '無法讀取這張照片，請改用 JPG、PNG 或 WebP 圖片再試。';
    return 'error';
  } finally {
    if (!committed) release(url);
    if (request === photoRequest) { photoLoading = false; updateBusy(); }
  }
}

async function setFrame({ src, label, key = null, file = null }) {
  const request = ++frameRequest;
  frameLoading = true; updateBusy();
  editor.frameError = '';
  clearAvatarSaveStatus();
  let committed = false;
  try {
    if (file) {
      if (!(file instanceof Blob) || !file.type.startsWith('image/')) throw new Error('invalid file');
      src = objectUrl(file);
    }
    const frame = src ? await loadImage(src) : null;
    if (request !== frameRequest) return 'superseded';
    const previous = editor.frameThumb;
    editor.frame = frame;
    editor.frameThumb = src || '';
    editor.frameName = label;
    editor.preset = key;
    committed = true;
    render();
    releaseAfterUpdate(previous);
    return 'ready';
  } catch {
    if (request === frameRequest) editor.frameError = '無法讀取頭貼框，請重新選擇或換一張圖片。';
    return 'error';
  } finally {
    if (file && !committed) release(src);
    if (request === frameRequest) { frameLoading = false; updateBusy(); }
  }
}
export function setFrameFile(file) {
  return file ? setFrame({ file, label: file.name }) : Promise.resolve('cancelled');
}
export function choosePreset(key) {
  const preset = PRESETS.find((p) => p.key === key);
  if (preset) return setFrame(preset);
  frameRequest++; frameLoading = false; updateBusy();
  editor.frameError = '找不到這個頭貼框，請重新選擇。';
  return Promise.resolve('error');
}

export async function save(url, filename) {
  if (editor.saving) return 'unavailable';
  editor.saveStatus = 'saving'; editor.saveError = ''; editor.saveTarget = filename;
  let temporaryUrl;
  try {
    const a = document.createElement('a');
    a.href = typeof url === 'string' ? url : (temporaryUrl = objectUrl(url));
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    return editor.saveStatus = 'download-requested';
  } catch {
    editor.saveError = '無法儲存圖片，請稍後重試。';
    return editor.saveStatus = 'error';
  } finally {
    // Give the browser time to consume a download before releasing its private URL.
    if (temporaryUrl) setTimeout(() => release(temporaryUrl), 60_000);
  }
}

export async function download() {
  if (!editor.hasPhoto || !editor.frameReady || editor.busy || editor.saving) return 'unavailable';
  editor.saveTarget = AVATAR.file;
  const version = editor.version;
  const blob = previewVersion === version ? previewBlob : await exportPreview();
  if (!blob || version !== editor.version || editor.busy) return 'unavailable';
  return save(blob, AVATAR.file);
}

export function supportsSharing() {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [new File([], 'image.png', { type: 'image/png' })] });
  } catch { return false; }
}

export async function prepareShare(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('image unavailable');
  const blob = await response.blob();
  if (!blob.size || !blob.type.startsWith('image/')) throw new Error('invalid image');
  return new File([blob], filename, { type: blob.type });
}

export async function share(file) {
  if (editor.saving) return 'unavailable';
  editor.saveStatus = 'saving'; editor.saveError = ''; editor.saveTarget = file instanceof File ? file.name : '';
  try {
    if (!(file instanceof File) || !file.size || !file.type.startsWith('image/')
      || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function'
      || navigator.userActivation?.isActive === false || !navigator.canShare({ files: [file] })) {
      throw new Error('cannot share');
    }
    await navigator.share({ files: [file] });
    return editor.saveStatus = 'shared';
  } catch (error) {
    if (error?.name === 'AbortError') return editor.saveStatus = 'cancelled';
    editor.saveError = '無法分享，請改用下載。';
    return editor.saveStatus = 'error';
  }
}

export function shareAvatar() {
  if (!editor.canDownload) return Promise.resolve('unavailable');
  return share(new File([previewBlob], AVATAR.file, { type: previewBlob.type }));
}

let initialization;
export function init() {
  if (initialization) return initialization;
  const tasks = [];
  if (!photoRequest) {
    const request = ++photoRequest;
    photoLoading = true; updateBusy();
    tasks.push(loadImage(pub('assets/placeholder-avatar.png')).then((photo) => {
      if (request !== photoRequest) return;
      editor.photo = photo;
      resetCrop();
    }).catch(() => {
      if (request === photoRequest) editor.photoError = '示意圖片載入失敗，仍可選擇自己的照片。';
    }).finally(() => {
      if (request === photoRequest) { photoLoading = false; updateBusy(); }
    }));
  }
  if (!frameRequest) tasks.push(choosePreset(PRESETS[0].key));
  initialization = Promise.all(tasks);
  return initialization;
}
