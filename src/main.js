import './style.css';
import scenes from './scenes.json';
import sitconFrame from '../frames/sitcon-2027-frame.png';

// scene snapshots and the assets they reference are served as-is from public/
const pub = (p) => import.meta.env.BASE_URL + p;
const FRAMES = { 'sitcon-2027': sitconFrame };

const LABELS = {
  'home': '首頁', 'inbox': '私訊',
  'story-normal': '限時動態', 'story-close-friends': '摯友限時動態', 'post-author': '貼文作者',
  'own-sidebar': '右上角帳號', 'own-nav': '導覽列', 'note': '便利貼', 'chat-list': '聊天列表',
};
const $ = (s) => document.querySelector(s);

// ------------------------------------------------------------ compositing
const canvas = $('#preview');
const ctx = canvas.getContext('2d');
const S = canvas.width;
const state = { photo: null, frame: null, zoom: 1, dx: 0, dy: 0 };
let avatarUrl = pub('assets/default-avatar.png');

const loadImage = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});

function draw() {
  ctx.clearRect(0, 0, S, S);
  const p = state.photo;
  if (p) {
    const k = Math.max(S / p.width, S / p.height) * state.zoom;
    const w = p.width * k, h = p.height * k;
    // keep the photo covering the square, whatever the offset
    state.dx = Math.min(Math.max(state.dx, (S - w) / 2), (w - S) / 2);
    state.dy = Math.min(Math.max(state.dy, (S - h) / 2), (h - S) / 2);
    ctx.drawImage(p, (S - w) / 2 + state.dx, (S - h) / 2 + state.dy, w, h);
  }
  if (state.frame) ctx.drawImage(state.frame, 0, 0, S, S);
  scheduleExport();
}

let exportTimer;
function scheduleExport() {
  clearTimeout(exportTimer);
  exportTimer = setTimeout(() => canvas.toBlob((b) => {
    if (avatarUrl.startsWith('blob:')) URL.revokeObjectURL(avatarUrl);
    avatarUrl = URL.createObjectURL(b);
    applyAll();
  }, 'image/png'), 60);
}

// drag to reposition
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = S / canvas.getBoundingClientRect().width;
  state.dx += (e.clientX - drag.x) * r; state.dy += (e.clientY - drag.y) * r;
  drag = { x: e.clientX, y: e.clientY };
  draw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
$('#zoom').addEventListener('input', (e) => { state.zoom = +e.target.value; draw(); });
$('#reset').addEventListener('click', () => { state.zoom = 1; state.dx = state.dy = 0; $('#zoom').value = 1; draw(); });
$('#download').addEventListener('click', () => {
  const a = document.createElement('a'); a.href = avatarUrl; a.download = 'avatar-with-frame.png'; a.click();
});

function setupDrop(dropEl, input, onFile) {
  input.addEventListener('change', () => input.files[0] && onFile(input.files[0]));
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => {
    e.preventDefault(); dropEl.classList.remove('over');
    const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) onFile(f);
  });
}
setupDrop($('#photoDrop'), $('#photoInput'), async (f) => {
  const url = URL.createObjectURL(f);
  state.photo = await loadImage(url);
  state.zoom = 1; state.dx = state.dy = 0; $('#zoom').value = 1;
  $('#photoThumb').style.backgroundImage = `url("${url}")`;
  $('#photoName').textContent = f.name;
  draw();
});
async function setFrame(src, name) {
  state.frame = src ? await loadImage(src) : null;
  $('#frameThumb').style.backgroundImage = src ? `url("${src}")` : 'none';
  $('#frameName').textContent = name;
  draw();
}
setupDrop($('#frameDrop'), $('#frameInput'), (f) => {
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
  setFrame(URL.createObjectURL(f), f.name);
});
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  const src = FRAMES[chip.dataset.frame];
  setFrame(src, src ? chip.textContent : '不加框');
}));

// ------------------------------------------------------------ scenes
const frames = [];
function applyTo(iframe) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.querySelectorAll('img[data-slot="avatar"]').forEach((img) => { img.src = avatarUrl; });
}
function applyAll() { frames.forEach(applyTo); }

// An iframe rendering a scene at its native viewport, scaled into `box`.
// With a crop, only that rectangle of the scene is shown.
function sceneView(scene, crop, maxWidth) {
  const box = document.createElement('div');
  box.className = 'viewport';
  const iframe = document.createElement('iframe');
  iframe.src = pub(`scenes/${scene.id}.html`);
  iframe.title = `${scene.device} ${LABELS[scene.scene]}`;
  iframe.setAttribute('tabindex', '-1');
  iframe.width = scene.width; iframe.height = scene.height;
  iframe.addEventListener('load', () => applyTo(iframe));
  frames.push(iframe);
  box.appendChild(iframe);

  const fit = () => {
    const r = crop || { x: 0, y: 0, width: scene.width, height: scene.height };
    const avail = maxWidth ? Math.min(maxWidth, innerWidth - 64) : box.parentElement.clientWidth;
    const z = crop ? Math.min(avail / r.width, crop.zoom) : avail / r.width;
    box.style.width = `${r.width * z}px`;
    box.style.height = `${r.height * z}px`;
    iframe.style.transform = `scale(${z}) translate(${-r.x}px, ${-r.y}px)`;
  };
  new ResizeObserver(fit).observe(document.body);
  requestAnimationFrame(fit);
  return box;
}

for (const sc of scenes) {
  const fig = document.createElement('figure');
  fig.className = 'scene';
  $(`.scenes[data-device="${sc.device}"]`).appendChild(fig);
  fig.appendChild(sceneView(sc));
  fig.insertAdjacentHTML('beforeend', `<figcaption>${LABELS[sc.scene]}</figcaption>`);

  for (const c of sc.crops) {
    const card = document.createElement('figure');
    card.className = 'closeup';
    $(`.closeups[data-device="${sc.device}"]`).appendChild(card);
    // small spots get magnified more; large ones are capped by the card width
    const zoom = c.width < 160 ? (sc.device === 'mobile' ? 2 : 2.4) : 1.2;
    card.appendChild(sceneView(sc, { ...c, zoom }, 340));
    card.insertAdjacentHTML('beforeend', `<figcaption>${LABELS[c.name] || c.name} · ${LABELS[sc.scene]}</figcaption>`);
  }
}

// default: placeholder person inside the SITCON frame
(async () => {
  state.photo = await loadImage(pub('assets/placeholder-avatar.png'));
  await setFrame(sitconFrame, 'SITCON 2027');
})();
