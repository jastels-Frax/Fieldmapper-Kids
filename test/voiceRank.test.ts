import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, voiceScore, englishVoices, castVoices as castAll, isCloudVoice } from '../src/voiceRank.ts';

const v = (name: string, lang = 'en-US', localService = true) => ({ name, lang, localService, voiceURI: name });

test('a natural voice beats the default robot', () => {
  const list = [{ ...v('Fred'), default: true }, v('Albert'), v('Microsoft David Desktop'), v('Samantha (Enhanced)'), v('Thomas', 'fr-FR')];
  assert.equal(pickVoice(list)!.name, 'Samantha (Enhanced)');
});

test('neural / natural voices rank first, and a Canadian one is preferred', () => {
  assert.ok(voiceScore(v('Microsoft Aria (Natural) - English (United States)')) > voiceScore(v('Microsoft Zira Desktop')));
  assert.ok(voiceScore(v('Karen', 'en-CA')) > voiceScore(v('Karen', 'en-AU')));
});

test('novelty and non-English voices are never picked', () => {
  assert.equal(pickVoice([v('Zarvox'), v('Bad News'), v('Amélie', 'fr-CA')]), null);
  assert.deepEqual(englishVoices([v('Zarvox'), v('Daniel', 'en-GB'), v('Anna', 'de-DE')]).map(x => x.name), ['Daniel']);
});

test('a chosen voice wins while it is installed', () => {
  const list = [v('Samantha (Enhanced)'), v('Daniel', 'en-GB')];
  assert.equal(pickVoice(list, 'Daniel')!.name, 'Daniel');
  assert.equal(pickVoice(list, 'Gone')!.name, 'Samantha (Enhanced)');
});

import { CHARACTER_VOICES, castVoices, voiceRange } from '../src/voiceRank.ts';
import { GUIDES } from '../src/guides.ts';

const mk = (name: string, lang = 'en-US', local = true) => ({ name, lang, localService: local, voiceURI: name });

test('every character is cast, and each pitch stays in the natural range', () => {
  const cast = castVoices([mk('Samantha (Enhanced)'), mk('Daniel (Enhanced)', 'en-GB')]);
  for (const g of [...GUIDES, 'scout' as const]) {
    assert.ok(cast[g], g);
    const c = CHARACTER_VOICES[g];
    assert.ok(c.pitch >= 0.8 && c.pitch <= 1.2, `${g} pitch`);
    assert.ok(c.rate >= 0.85 && c.rate <= 1.1, `${g} rate`);
  }
  assert.equal(cast.bear?.name, 'Daniel (Enhanced)', 'a deeper character gets the deeper voice');
  assert.equal(cast.frog?.name, 'Samantha (Enhanced)', 'a higher character gets the higher voice');
});

test('with plenty of voices the characters are spread over different ones', () => {
  const voices = ['Samantha (Enhanced)', 'Ava (Premium)', 'Allison (Enhanced)', 'Daniel (Enhanced)', 'Oliver (Enhanced)', 'Evan (Enhanced)'].map(n => mk(n));
  const cast = castVoices(voices);
  assert.notEqual(cast.frog?.name, cast.rat?.name);
  assert.notEqual(cast.moose?.name, cast.bear?.name);
  assert.ok(new Set(Object.values(cast).map(v => v?.name)).size >= 5);
});

test('one voice, or none: everyone shares it, or nobody crashes', () => {
  const one = castVoices([mk('Karen', 'en-AU')]);
  assert.ok(Object.values(one).every(v => v?.name === 'Karen'));
  const none = castVoices([]);
  assert.ok(Object.values(none).every(v => v === null));
});

test('a robotic voice is never cast just to be different', () => {
  const cast = castVoices([mk('Samantha (Enhanced)'), mk('Daniel (Enhanced)'), mk('eSpeak English'), mk('Fred')]);
  for (const v of Object.values(cast)) assert.ok(!/espeak|fred/i.test(v!.name));
});

test('voice range from the voice name', () => {
  assert.equal(voiceRange('Google UK English Male'), 'deeper');
  assert.equal(voiceRange('Google UK English Female'), 'higher');
  assert.equal(voiceRange('Microsoft Aria Online (Natural)'), 'higher');
  assert.equal(voiceRange('Microsoft Guy Online (Natural)'), 'deeper');
  assert.equal(voiceRange('Mystery voice'), 'unknown');
});

test('a voice that reads over the internet is never chosen automatically, for one voice or for the characters', () => {
  // Edge and Chrome on Windows: cloud voices with "nicer" names beside the device's own.
  const edge = [v('Microsoft Clara Online (Natural) - English (Canada)', 'en-CA', false), v('Google US English', 'en-US', false), v('Microsoft Zira - English (United States)'), v('Microsoft David - English (United States)')];
  assert.equal(pickVoice(edge)!.name, 'Microsoft Zira - English (United States)');
  const cast = castAll(edge);
  for (const [g, voice] of Object.entries(cast)) assert.ok(voice && !isCloudVoice(voice), `${g} got ${voice?.name}`);
  // Only cloud voices: silence, never the cloud.
  assert.equal(pickVoice([v('Google US English', 'en-US', false)]), null);
  assert.ok(Object.values(castAll([v('Google US English', 'en-US', false)])).every(x => x === null));
  // A grown-up's choice of a cloud voice counts only once they confirmed it reads over the internet.
  assert.equal(pickVoice(edge, 'Google US English')!.name, 'Microsoft Zira - English (United States)');
  assert.equal(pickVoice(edge, 'Google US English', 'CA', true)!.name, 'Google US English');
});
