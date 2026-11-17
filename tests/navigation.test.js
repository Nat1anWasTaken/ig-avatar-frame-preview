import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artworkFromHash } from '../src/lib/navigation.js';

test('annual and legacy asset hashes resolve while page anchors stay independent', () => {
  assert.equal(artworkFromHash('#avatar'), 'avatar');
  assert.equal(artworkFromHash('#instagram'), 'avatar');
  assert.equal(artworkFromHash('#facebook'), 'facebook');
  assert.equal(artworkFromHash('#line'), 'line');
  for (const hash of ['#make', '#artwork', '#unknown', '#constructor', '#__proto__']) {
    assert.equal(artworkFromHash(hash), null);
  }
});

test('returning to the entry without a hash restores the avatar task', () => {
  assert.equal(artworkFromHash(''), 'avatar');
});
