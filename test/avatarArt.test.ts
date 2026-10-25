import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { AVATAR_ART, cardPicture, mapPicture } from '../src/avatarArt.ts';

test('every portrait has its image, and every image is offered', () => {
  const files = readdirSync(new URL('../src/assets/avatars/', import.meta.url)).map(f => f.replace(/\.webp$/, '')).sort();
  assert.deepEqual(AVATAR_ART.map(a => a.id).sort(), files);
});

test('the card shows a photo, else a portrait, else the emoji', () => {
  const blob = {} as Blob;
  assert.deepEqual(cardPicture({ avatar: '🦊', photo: blob, art: 'owl' }), { kind: 'photo' });
  assert.deepEqual(cardPicture({ avatar: '🦊', art: 'owl' }), { kind: 'art', art: 'owl' });
  assert.deepEqual(cardPicture({ avatar: '🦊', art: 'gone' }), { kind: 'emoji', emoji: '🦊' });
});

test('the map shows its own choice, else the card picture', () => {
  assert.deepEqual(mapPicture({ avatar: '🦊', art: 'owl' }), { kind: 'art', art: 'owl' });
  assert.deepEqual(mapPicture({ avatar: '🦊', art: 'owl', mapAvatar: { kind: 'emoji', emoji: '🐸' } }), { kind: 'emoji', emoji: '🐸' });
  assert.deepEqual(mapPicture({ avatar: '🦊', mapAvatar: { kind: 'art', art: 'moose' } }), { kind: 'art', art: 'moose' });
  assert.deepEqual(mapPicture({ avatar: '🦊', mapAvatar: { kind: 'art', art: 'gone' } }), { kind: 'emoji', emoji: '🦊' });
});
