import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  delete_site_event,
  load_site_event,
  upsert_site_event,
} from './store.js';

function create_event_client_stub({
  row = null,
  select_error = null,
  upsert_error = null,
  delete_error = null,
} = {}) {
  const calls = { upsert_payload: null, deleted: false };
  return {
    calls,
    from(table_name) {
      assert.equal(table_name, 'site_event');
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: row, error: select_error });
        },
        upsert(payload) {
          calls.upsert_payload = payload;
          return Promise.resolve({ error: upsert_error });
        },
        delete() {
          calls.deleted = true;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve({ error: delete_error }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

describe('load_site_event', () => {
  it('returns null when no row exists', async () => {
    const result = await load_site_event(create_event_client_stub());
    assert.equal(result.ok, true);
    assert.equal(result.event, null);
  });

  it('returns the event row with custom title', async () => {
    const result = await load_site_event(
      create_event_client_stub({
        row: {
          title: 'Săn Thưởng',
          start_at: '2026-08-31T17:00:00+00:00',
          end_at: '2026-09-03T16:00:00+00:00',
          url: 'https://drive.google.com/example',
          updated_at: '2026-08-29T00:00:00+00:00',
          updated_by: 'admin@example.com',
        },
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.event.title, 'Săn Thưởng');
    assert.equal(result.event.url, 'https://drive.google.com/example');
  });

  it('falls back to default title when row has no title', async () => {
    const result = await load_site_event(
      create_event_client_stub({
        row: {
          title: null,
          start_at: '2026-08-31T17:00:00+00:00',
          end_at: '2026-09-03T16:00:00+00:00',
          url: 'https://drive.google.com/example',
        },
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.event.title, 'Bí Cảnh Tông Môn');
  });

  it('surfaces a lookup error', async () => {
    const result = await load_site_event(
      create_event_client_stub({ select_error: { message: 'relation missing' } }),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'EVENT_LOOKUP_FAILED');
  });
});

describe('upsert_site_event', () => {
  it('writes id 1 with the validated event fields including title', async () => {
    const client = create_event_client_stub();
    const result = await upsert_site_event(client, {
      title: 'Bí Cảnh Tông Môn',
      start_at: '2026-08-31T17:00:00.000Z',
      end_at: '2026-09-03T16:00:00.000Z',
      url: 'https://drive.google.com/example',
      updated_by: 'admin@example.com',
    });
    assert.equal(result.ok, true);
    assert.equal(client.calls.upsert_payload.id, 1);
    assert.equal(client.calls.upsert_payload.title, 'Bí Cảnh Tông Môn');
    assert.equal(client.calls.upsert_payload.url, 'https://drive.google.com/example');
  });
});

describe('delete_site_event', () => {
  it('deletes the singleton row', async () => {
    const client = create_event_client_stub();
    const result = await delete_site_event(client);
    assert.equal(result.ok, true);
    assert.equal(client.calls.deleted, true);
  });
});
