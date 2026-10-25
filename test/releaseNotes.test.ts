import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RELEASES, CURRENT } from '../src/releaseNotes.ts';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

test('the newest release is the version package.json carries, and the changelog has it', () => {
  assert.equal(CURRENT.version, pkg.version);
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.match(changelog, new RegExp(`^## ${pkg.version.replace(/\./g, '\\.')}\\b`, 'm'));
});

test('releases are newest first, each with notes', () => {
  const n = (v: string) => v.split('.').map(Number).reduce((a, x) => a * 1000 + x, 0);
  for (let i = 1; i < RELEASES.length; i++) assert.ok(n(RELEASES[i - 1].version) > n(RELEASES[i].version));
  for (const r of RELEASES) assert.ok(r.notes.length > 0);
});
