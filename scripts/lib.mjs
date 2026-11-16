// Shared CDP helpers and the scene runner. Site-specific code lives in platforms/.
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

// ---------------------------------------------------------------- scenes

export const PLATFORMS = ['instagram', 'facebook'];

// Each platform module exports SCENES, detectOwn(tab, opts) and pageMain(o), and optionally
// beforeMain(tab, sc), which runs once the page is ready and before redaction.
export async function loadPlatform(name) {
  if (!PLATFORMS.includes(name)) throw new Error(`unknown platform: ${name} (expected ${PLATFORMS.join(' or ')})`);
  return import(`./platforms/${name}.mjs`);
}

// Load a scene, redact it and feature the avatar, then freeze the page.
// `opts` is shared across scenes: the logged-in account is detected once and cached on it.
export async function prepareScene(tab, sc, opts, platform, { freeze = true } = {}) {
  await tab.send('Page.navigate', { url: sc.url });
  await waitFor(tab, sc.ready);
  await sleep(2500); // let lazy avatars/stories settle
  if (platform.beforeMain) await platform.beforeMain(tab, sc);
  await platform.detectOwn(tab, opts, sc);

  const crops = await tab.evaluate(`(${platform.pageMain})(${JSON.stringify({ ...opts, scene: sc.scene, device: sc.device })})`);
  // freeze the page so the site's own scripts can't re-render our edits mid-capture
  if (freeze) {
    await tab.send('Emulation.setScriptExecutionDisabled', { value: true });
    await sleep(400);
  }
  return crops;
}
