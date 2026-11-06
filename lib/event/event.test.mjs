import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decide_event_upsert, to_vietnam_input_value } from './event.mjs';

describe('decide_event_upsert', () => {
  it('accepts custom title, Vietnam datetime-local values and stores UTC instants', () => {
    const result = decide_event_upsert({
      title: '  Bí Cảnh Mùa Thu  ',
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-03T23:00',
      url: ' https://drive.google.com/example ',
    });

    assert.equal(result.ok, true);
    assert.equal(result.title, 'Bí Cảnh Mùa Thu');
    assert.equal(result.start_at, new Date('2026-09-01T00:00:00+07:00').toISOString());
    assert.equal(result.end_at, new Date('2026-09-03T23:00:00+07:00').toISOString());
    assert.equal(result.url, 'https://drive.google.com/example');
  });

  it('defaults title to Bí Cảnh Tông Môn when omitted or empty', () => {
    const without_title = decide_event_upsert({
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-03T23:00',
      url: 'https://example.com',
    });
    const empty_title = decide_event_upsert({
      title: '   ',
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-03T23:00',
      url: 'https://example.com',
    });

    assert.equal(without_title.ok, true);
    assert.equal(without_title.title, 'Bí Cảnh Tông Môn');
    assert.equal(empty_title.ok, true);
    assert.equal(empty_title.title, 'Bí Cảnh Tông Môn');
  });

  it('rejects title longer than 50 characters', () => {
    const result = decide_event_upsert({
      title: 'A'.repeat(51),
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-03T23:00',
      url: 'https://example.com',
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'TITLE_TOO_LONG');
  });

  it('keeps explicit timezones instead of forcing +07', () => {
    const result = decide_event_upsert({
      start_at: '2026-09-01T00:00:00Z',
      end_at: '2026-09-03T16:00:00Z',
      url: 'https://example.com/folder',
    });

    assert.equal(result.ok, true);
    assert.equal(result.start_at, '2026-09-01T00:00:00.000Z');
    assert.equal(result.end_at, '2026-09-03T16:00:00.000Z');
  });

  it('rejects missing fields', () => {
    assert.equal(decide_event_upsert({ start_at: '', end_at: '2026-09-03T23:00', url: 'https://x' }).code, 'START_REQUIRED');
    assert.equal(decide_event_upsert({ start_at: '2026-09-01T00:00', end_at: '', url: 'https://x' }).code, 'END_REQUIRED');
    assert.equal(decide_event_upsert({ start_at: '2026-09-01T00:00', end_at: '2026-09-03T23:00', url: '  ' }).code, 'URL_REQUIRED');
  });

  it('rejects non-http urls', () => {
    const result = decide_event_upsert({
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-03T23:00',
      url: 'javascript:alert(1)',
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'INVALID_URL');
  });

  it('rejects an end time that is not after start', () => {
    const same_time = decide_event_upsert({
      start_at: '2026-09-01T00:00',
      end_at: '2026-09-01T00:00',
      url: 'https://example.com',
    });
    assert.equal(same_time.code, 'END_BEFORE_START');
  });

  it('rejects invalid datetimes', () => {
    assert.equal(
      decide_event_upsert({
        start_at: 'not-a-date',
        end_at: '2026-09-03T23:00',
        url: 'https://example.com',
      }).code,
      'INVALID_START',
    );
  });
});

describe('to_vietnam_input_value', () => {
  it('formats a UTC instant as a Vietnam datetime-local value', () => {
    assert.equal(to_vietnam_input_value('2026-08-31T17:00:00.000Z'), '2026-09-01T00:00');
  });

  it('returns an empty string for missing or invalid values', () => {
    assert.equal(to_vietnam_input_value(''), '');
    assert.equal(to_vietnam_input_value('not-a-date'), '');
  });
});
