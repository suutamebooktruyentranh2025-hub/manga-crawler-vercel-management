import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  format_event_duration,
  resolve_event,
} from './event-countdown.js';

const EVENT = {
  title: 'Bí Cảnh Tông Môn',
  start_at: '2026-08-31T17:00:00+00:00', // 2026-09-01 00:00 +07
  end_at: '2026-09-03T16:00:00+00:00', // 2026-09-03 23:00 +07
  url: 'https://drive.google.com/example',
};

describe('format_event_duration', () => {
  it('includes days when remaining time is at least 24 hours', () => {
    const remaining_ms = (2 * 24 * 60 + 5 * 60) * 60_000;
    assert.equal(format_event_duration(remaining_ms), '2 ngày 5 giờ');
  });

  it('includes leftover minutes when the remaining time is not a whole hour', () => {
    assert.equal(format_event_duration(95 * 60_000), '1 giờ 35 phút');
  });

  it('shows only minutes when less than one hour remains', () => {
    assert.equal(format_event_duration(13 * 60_000), '13 phút');
  });

  it('omits zero leftover minutes after whole hours', () => {
    assert.equal(format_event_duration(5 * 60 * 60_000), '5 giờ');
  });

  it('returns an empty string when no time remains', () => {
    assert.equal(format_event_duration(0), '');
    assert.equal(format_event_duration(-1), '');
  });
});

describe('resolve_event', () => {
  it('hides the button when no event is configured', () => {
    assert.deepEqual(resolve_event(Date.parse('2026-08-29T20:00:00+07:00'), null), {
      visible: false,
      clickable: false,
      label: '',
      url: '',
    });
  });

  it('shows a non-clickable prepare countdown before start', () => {
    const now_ms = Date.parse('2026-08-31T16:47:00+00:00'); // 13 minutes before start
    assert.deepEqual(resolve_event(now_ms, EVENT), {
      visible: true,
      clickable: false,
      label: 'Mở sau 13 phút',
      url: 'https://drive.google.com/example',
    });
  });

  it('shows a clickable remaining countdown during the event', () => {
    const now_ms = Date.parse('2026-09-01T00:00:00+00:00');
    assert.deepEqual(resolve_event(now_ms, EVENT), {
      visible: true,
      clickable: true,
      label: 'Còn 2 ngày 16 giờ',
      url: 'https://drive.google.com/example',
    });
  });

  it('hides the button at and after the end instant', () => {
    assert.equal(resolve_event(Date.parse(EVENT.end_at), EVENT).visible, false);
    assert.equal(
      resolve_event(Date.parse(EVENT.end_at) + 60_000, EVENT).visible,
      false,
    );
  });
});
