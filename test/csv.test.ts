import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../src/csv.ts';

test('formulas are neutralised, numbers are not', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('-63.570000'), '-63.570000');
  assert.equal(csvCell('-a'), "'-a");
});

test('quotes, commas and newlines are quoted', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line\nbreak'), '"line\nbreak"');
  assert.equal(csvCell(''), '');
});
