import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse_display_rate, rate_badge_class } from './rate.mjs';

describe('parse_display_rate', () => {
  it('returns null for missing or placeholder rates', () => {
    assert.equal(parse_display_rate(''), null);
    assert.equal(parse_display_rate(null), null);
    assert.equal(parse_display_rate('-'), null);
    assert.equal(parse_display_rate('—'), null);
    assert.equal(parse_display_rate('N/A'), null);
  });

  it('parses numeric rates including comma decimals', () => {
    assert.equal(parse_display_rate('9.26'), 9.26);
    assert.equal(parse_display_rate('9,04'), 9.04);
    assert.equal(parse_display_rate('★ 8.5'), 8.5);
  });
});

describe('rate_badge_class', () => {
  it('matches crawler score bands', () => {
    assert.equal(rate_badge_class('9.26'), 'bg-rose-400/15 text-rose-500');
    assert.equal(rate_badge_class('8.5'), 'bg-emerald-400/15 text-emerald-600');
    assert.equal(rate_badge_class('7.1'), 'bg-amber-400/15 text-amber-600');
    assert.equal(rate_badge_class('-'), 'bg-zinc-100 text-zinc-600');
  });
});
