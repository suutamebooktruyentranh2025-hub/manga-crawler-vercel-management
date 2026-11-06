import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { load_admin_lists } from './store.js';

function create_service_client_stub({ profiles, allowlist, entitlements, credits }) {
  const client_stub = {
    used_credit_in_filter: false,
    from(table_name) {
      const result_by_table = {
        user_profiles: { data: profiles, error: null },
        user_type_allowlist: { data: allowlist, error: null },
        user_entitlements: { data: entitlements, error: null },
        free_user_credits: { data: credits, error: null },
      };
      const query = {
        select() {
          return query;
        },
        order() {
          return query;
        },
        in() {
          if (table_name === 'free_user_credits') {
            client_stub.used_credit_in_filter = true;
          }
          return Promise.resolve({
            data: null,
            error: { message: 'TypeError: fetch failed' },
          });
        },
        then(resolve, reject) {
          return Promise.resolve(
            result_by_table[table_name] || { data: [], error: null },
          ).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return client_stub;
}

describe('load_admin_lists', () => {
  it('maps remaining tokens without .in() on a large user id list', async () => {
    const service_client = create_service_client_stub({
      profiles: [
        {
          id: 'user-1',
          email: 'free@example.com',
          user_type: 'Free',
          created_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      allowlist: [],
      entitlements: [],
      credits: [{ user_id: 'user-1', remaining_tokens: 300 }],
    });

    const lists = await load_admin_lists(service_client);

    assert.equal(lists.ok, true);
    assert.equal(service_client.used_credit_in_filter, false);
    assert.equal(lists.profiles[0].remaining_tokens, 300);
    assert.equal(lists.logged_in[0].remaining_tokens, 300);
  });

  it('maps entitlement updated_at onto logged-in rows', async () => {
    const service_client = create_service_client_stub({
      profiles: [
        {
          id: 'user-1',
          email: 'member@example.com',
          user_type: 'Member',
          created_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-01-02T00:00:00.000Z',
        },
      ],
      allowlist: [],
      entitlements: [
        {
          email: 'member@example.com',
          package_key: 'app',
          expires_at: null,
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      credits: [],
    });

    const lists = await load_admin_lists(service_client);

    assert.equal(lists.ok, true);
    assert.deepEqual(lists.logged_in[0].entitlements, [
      {
        packageKey: 'app',
        expiresAt: null,
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ]);
  });
});
