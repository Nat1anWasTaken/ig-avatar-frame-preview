#!/usr/bin/env node
// Preview an avatar (frame) across Instagram web, purely by rewriting the DOM over CDP.
// Nothing is uploaded; every change lives only in a throwaway tab that is closed afterwards.
//
// Usage:
//   pnpm screenshots --avatar framed.jpg [--frame frame.png] [--out dir]
//        [--username your.username] [--name "Your Name"] [--note "SITCON 2027 見！"]
//        [--message "Sent an attachment"] [--caption "..."] [--post post.jpg] [--port 9222]
//
// --avatar  the final avatar image (already framed), or the base photo when --frame is given
// --frame   optional PNG with a transparent centre, composited over --avatar

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { CDP, browserWsUrl, openTab, prepareScene, SCENES, sleep } from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    avatar: { type: 'string' },
    frame: { type: 'string' },
    post: { type: 'string' },
    out: { type: 'string', default: 'ig-avatar-preview-out' },
    username: { type: 'string', default: 'your.username' },
    name: { type: 'string', default: 'Your Name' },
    note: { type: 'string', default: 'SITCON 2027 見！' },
    message: { type: 'string', default: 'Sent an attachment' },
    caption: { type: 'string', default: 'Placeholder caption for the preview post ✨' },
    port: { type: 'string', default: '9222' },
    keep: { type: 'boolean', default: false }, // keep tabs open for inspection
  },
});
if (!args.avatar) {
  console.error('usage: pnpm screenshots --avatar <image> [--frame <png>] [--out <dir>]');
  process.exit(1);
}

const dataUrl = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
};

// ---------------------------------------------------------------- main

const out = path.resolve(args.out);
fs.mkdirSync(out, { recursive: true });
const cdp = await CDP.connect(await browserWsUrl(args.port));
const opts = {
  avatar: dataUrl(args.avatar),
  frame: args.frame && dataUrl(args.frame),
  post: args.post && dataUrl(args.post),
  username: args.username, name: args.name, note: args.note, message: args.message, caption: args.caption,
};
const written = [];

try {
  for (const sc of SCENES) {
    const tab = await openTab(cdp, sc.device);
    try {
      const crops = await prepareScene(tab, sc, opts);

      const prefix = `${sc.device}-${sc.scene}`;
      const save = async (name, clip) => {
        // hidden tabs occasionally hand back an empty (all-black) frame; a black PNG is tiny, so retry
        let data;
        for (let attempt = 0; attempt < 5; attempt++) {
          ({ data } = await tab.send('Page.captureScreenshot', { format: 'png', ...(clip && { clip: { ...clip, scale: 1 } }) }));
          if (data.length > 4000) break;
          await sleep(500);
        }
        const f = path.join(out, `${name}.png`);
        fs.writeFileSync(f, Buffer.from(data, 'base64'));
        written.push(f);
      };
      await save(prefix);
      for (const c of crops) await save(`${prefix}--${c.name}`, c);
      console.log(`✓ ${prefix} (${crops.map((c) => c.name).join(', ')})`);
    } finally {
      if (!args.keep) await cdp.send('Target.closeTarget', { targetId: tab.targetId });
    }
  }
} finally {
  cdp.close();
}
console.log(`\n${written.length} screenshots in ${out}`);
