import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const campaignUrl = 'https://sitcon.org/social-kit/2027/';
const socialUrl = 'https://sitcon.org/social-kit/social/sitcon-2027.png';

for (const entry of ['index.html', '2027/index.html']) {
  test(`${entry} is a static campaign entry with usable assets and sharing metadata`, () => {
    const html = readFileSync(new URL(entry, dist), 'utf8');
    assert.match(html, /<html lang="zh-Hant-TW" data-campaign="2027">/);
    assert.match(html, /<title>換上 SITCON 2027｜頭貼、封面與背景<\/title>/);
    assert.ok(html.includes(`<link rel="canonical" href="${campaignUrl}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${campaignUrl}">`));
    assert.ok(html.includes(`<meta property="og:image" content="${socialUrl}">`));
    assert.match(html, /<meta property="og:image:alt" content="[^"]+">/);

    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
    assert.ok(scripts.length > 0, 'the static entry must load the app');
    for (const [, src] of scripts) {
      assert.ok(src.startsWith('/social-kit/assets/'), 'app paths must retain the deployment base');
      assert.ok(readFileSync(new URL(src.slice('/social-kit/'.length), dist)).length > 0);
    }
    const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
    assert.ok(styles.length > 0, 'the campaign must include its styles');
    const css = styles.map(([, href]) => {
      assert.ok(href.startsWith('/social-kit/assets/'));
      return readFileSync(new URL(href.slice('/social-kit/'.length), dist), 'utf8');
    }).join('\n');
    assert.match(css, /html\[data-campaign=["']?2027["']?\]/);
  });
}

test('the annual sharing image preserves the released artwork and its dimensions', () => {
  const image = readFileSync(new URL('social/sitcon-2027.png', dist));
  assert.deepEqual(image, readFileSync(new URL('../src/campaigns/2027/artwork/facebook-cover.png', import.meta.url)));
  for (const entry of ['index.html', '2027/index.html']) {
    const html = readFileSync(new URL(entry, dist), 'utf8');
    assert.ok(html.includes(`<meta property="og:image:width" content="${image.readUInt32BE(16)}">`));
    assert.ok(html.includes(`<meta property="og:image:height" content="${image.readUInt32BE(20)}">`));
  }
});
