import { pub, PRESETS } from './assets.js';

// The avatar is composited on an offscreen square; visible canvases copy it.
export const SIZE = 1080;
const canvas = document.createElement('canvas');
canvas.width = canvas.height = SIZE;
const ctx = canvas.getContext('2d');
export const source = canvas;

export const editor = $state({
  photo: null, photoName: '點擊或拖曳圖片到這裡', photoThumb: '',
  frame: null, frameName: '中間透明的 PNG', frameThumb: '', preset: null,
  zoom: 1, dx: 0, dy: 0,
  avatarUrl: pub('assets/default-avatar.png'),
  // bumped on every render so views know to redraw
  version: 0,
});

const loadImage = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});

function render() {
  ctx.clearRect(0, 0, SIZE, SIZE);
  const p = editor.photo;
  if (p) {
    const k = Math.max(SIZE / p.width, SIZE / p.height) * editor.zoom;
    const w = p.width * k, h = p.height * k;
    // keep the photo covering the square, whatever the offset
    editor.dx = Math.min(Math.max(editor.dx, (SIZE - w) / 2), (w - SIZE) / 2);
    editor.dy = Math.min(Math.max(editor.dy, (SIZE - h) / 2), (h - SIZE) / 2);
    ctx.drawImage(p, (SIZE - w) / 2 + editor.dx, (SIZE - h) / 2 + editor.dy, w, h);
  }
  if (editor.frame) ctx.drawImage(editor.frame, 0, 0, SIZE, SIZE);
  editor.version++;
  scheduleExport();
}

let exportTimer;
function scheduleExport() {
  clearTimeout(exportTimer);
  exportTimer = setTimeout(() => canvas.toBlob((b) => {
    if (editor.avatarUrl.startsWith('blob:')) URL.revokeObjectURL(editor.avatarUrl);
    editor.avatarUrl = URL.createObjectURL(b);
  }, 'image/png'), 60);
}

// offsets are in canvas pixels
export function pan(x, y) { editor.dx += x; editor.dy += y; render(); }
export function setZoom(z) { editor.zoom = Math.min(Math.max(z, 1), 3); render(); }
function reset() { editor.zoom = 1; editor.dx = editor.dy = 0; render(); }

export async function setPhoto(file) {
  const url = URL.createObjectURL(file);
  editor.photo = await loadImage(url);
  editor.photoThumb = url;
  editor.photoName = file.name;
  reset();
}

async function setFrame(src, name) {
  editor.frame = src ? await loadImage(src) : null;
  editor.frameThumb = src || '';
  editor.frameName = name;
  render();
}
export function setFrameFile(file) {
  editor.preset = null;
  return setFrame(URL.createObjectURL(file), file.name);
}
export function choosePreset(key) {
  const p = PRESETS.find((x) => x.key === key);
  editor.preset = key;
  return setFrame(p.src, p.label);
}

export function download() {
  const a = document.createElement('a'); a.href = editor.avatarUrl; a.download = 'avatar-with-frame.png'; a.click();
}

// default: placeholder person inside the SITCON frame
export async function init() {
  editor.photo = await loadImage(pub('assets/placeholder-avatar.png'));
  await choosePreset('sitcon-2027');
}
