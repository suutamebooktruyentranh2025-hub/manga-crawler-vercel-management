import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filter_admin_rows } from './filter-rows.mjs';

const SAMPLE_ROWS = [
  { email: 'free@example.com', user_type: 'Free', remaining_tokens: 300 },
  { email: 'member@example.com', user_type: 'Member', remaining_tokens: null },
  { email: 'super@example.com', user_type: 'Super Member', remaining_tokens: null },
  { email: 'premium@example.com', user_type: 'Premium Member', remaining_tokens: null },
  { email: 'admin@example.com', user_type: 'Admin', remaining_tokens: null },
];

describe('filter_admin_rows', () => {
  it('returns all rows when search and rank are empty', () => {
    assert.deepEqual(filter_admin_rows(SAMPLE_ROWS, {}), SAMPLE_ROWS);
  });

  it('filters by displayed rank exactly', () => {
    const filtered_rows = filter_admin_rows(SAMPLE_ROWS, { user_type: 'Member' });
    assert.deepEqual(
      filtered_rows.map((row) => row.email),
      ['member@example.com'],
    );
  });

  it('does not treat Super Member or Premium Member as Member', () => {
    const filtered_rows = filter_admin_rows(SAMPLE_ROWS, { user_type: 'Member' });
    assert.equal(
      filtered_rows.some((row) => row.user_type.includes('Member') && row.user_type !== 'Member'),
      false,
    );
  });

  it('search without rank still matches Super Member and Premium Member', () => {
    const filtered_rows = filter_admin_rows(SAMPLE_ROWS, { search_query: 'member' });
    assert.deepEqual(
      filtered_rows.map((row) => row.email),
      ['member@example.com', 'super@example.com', 'premium@example.com'],
    );
  });

  it('combines rank filter with search query', () => {
    const filtered_rows = filter_admin_rows(SAMPLE_ROWS, {
      user_type: 'Free',
      search_query: '300',
    });
    assert.equal(filtered_rows.length, 1);
    assert.equal(filtered_rows[0].email, 'free@example.com');
  });

  it('returns empty when rank matches but search does not', () => {
    const filtered_rows = filter_admin_rows(SAMPLE_ROWS, {
      user_type: 'Admin',
      search_query: 'missing',
    });
    assert.deepEqual(filtered_rows, []);
  });
});
