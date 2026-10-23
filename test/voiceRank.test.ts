import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, voiceScore, englishVoices } from '../src/voiceRank.ts';

const v = (name: string, lang = 'en-US', localService = true) => ({ name, lang, localService, voiceURI: name });

test('a natural voice beats the default robot', () => {
  const list = [{ ...v('Fred'), default: true }, v('Albert'), v('Microsoft David Desktop'), v('Samantha (Enhanced)'), v('Thomas', 'fr-FR')];
  assert.equal(pickVoice(list)!.name, 'Samantha (Enhanced)');
});

test('neural / natural voices rank first, and a Canadian one is preferred', () => {
  assert.ok(voiceScore(v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false)) > voiceScore(v('Microsoft Zira Desktop')));
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
