import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { campaignForYear } from '../src/campaigns/index.js';

test('the published year selects its artwork, filenames and links', () => {
  const campaign = campaignForYear('2027');
  assert.equal(campaign.year, 2027);
  assert.equal(campaign.theme, '42');
  assert.equal(campaign.url, 'https://sitcon.org/social-kit/2027/');
  assert.equal(campaign.themeUrl, 'https://sitcon.org/2027/cfp/#theme');
  assert.deepEqual(campaign.artwork.map((item) => item.file), [
    'sitcon-2027-avatar.png', 'sitcon-2027-facebook-cover.png', 'sitcon-2027-line-background.png',
  ]);
  for (const item of campaign.artwork) {
    const image = readFileSync(new URL(item.src));
    assert.equal(image.readUInt32BE(16), item.width);
    assert.equal(image.readUInt32BE(20), item.height);
  }
});

test('missing or unknown years never fall back to the current campaign', () => {
  for (const year of [undefined, '', '2026', '2028', 'constructor', '__proto__']) {
    assert.throws(() => campaignForYear(year), /Unknown campaign year/);
  }
});
