import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKAGE_LIST_PRICES,
  bucket_revenue,
  bucket_signups,
  count_by_user_type,
  estimate_revenue,
} from './dashboard-stats.mjs';

const NOW = new Date(2026, 8, 4, 12, 0, 0);

function local_iso(year_value, month_index, day_value, hour_value = 9) {
  return new Date(year_value, month_index, day_value, hour_value, 0, 0).toISOString();
}

describe('bucket_signups', () => {
  it('fills empty day buckets with zero counts', () => {
    const period_rows = bucket_signups([], 'day', NOW);
    assert.equal(period_rows.length, 30);
    assert.equal(period_rows.at(-1).key, '2026-09-04');
    assert.equal(period_rows[0].key, '2026-08-06');
    assert.equal(
      period_rows.every((period_row) => period_row.count === 0),
      true,
    );
  });

  it('counts created_at into the matching local day and drops dates outside the range', () => {
    const period_rows = bucket_signups(
      [
        { created_at: local_iso(2026, 8, 4) },
        { created_at: local_iso(2026, 7, 6) },
        { created_at: local_iso(2026, 7, 5) },
      ],
      'day',
      NOW,
    );
    const count_by_key = Object.fromEntries(period_rows.map((period_row) => [period_row.key, period_row.count]));
    assert.equal(count_by_key['2026-09-04'], 1);
    assert.equal(count_by_key['2026-08-06'], 1);
    assert.equal(count_by_key['2026-08-05'], undefined);
  });

  it('groups by month and year including empty years between data and now', () => {
    const month_rows = bucket_signups(
      [{ created_at: local_iso(2026, 8, 1) }, { created_at: local_iso(2025, 9, 1) }],
      'month',
      NOW,
    );
    assert.equal(month_rows.length, 12);
    assert.equal(month_rows[0].key, '2025-10');
    assert.equal(month_rows.at(-1).key, '2026-09');
    assert.equal(month_rows.find((period_row) => period_row.key === '2026-09').count, 1);

    const year_rows = bucket_signups(
      [{ created_at: local_iso(2024, 5, 1) }, { created_at: local_iso(2026, 8, 4) }],
      'year',
      NOW,
    );
    assert.deepEqual(
      year_rows.map((period_row) => [period_row.key, period_row.count]),
      [
        ['2024', 1],
        ['2025', 0],
        ['2026', 1],
      ],
    );
  });
});

describe('count_by_user_type', () => {
  it('returns all five ranks including zeros', () => {
    const rank_rows = count_by_user_type([
      { user_type: 'Member' },
      { user_type: 'Member' },
      { user_type: 'Free' },
    ]);
    assert.deepEqual(
      rank_rows.map((rank_row) => [rank_row.user_type, rank_row.count]),
      [
        ['Free', 1],
        ['Member', 2],
        ['Super Member', 0],
        ['Premium Member', 0],
        ['Admin', 0],
      ],
    );
  });
});

describe('estimate_revenue', () => {
  it('returns zero totals and three package rows when empty', () => {
    const revenue_summary = estimate_revenue([], NOW);
    assert.equal(revenue_summary.total_vnd, 0);
    assert.equal(revenue_summary.by_package.length, 3);
    assert.equal(
      revenue_summary.by_package.every((package_row) => package_row.user_count === 0),
      true,
    );
  });

  it('sums active packages, skips Admin and expired or invalid expiry', () => {
    const revenue_summary = estimate_revenue(
      [
        {
          email: 'paid@example.com',
          user_type: 'Premium Member',
          entitlements: [
            { packageKey: 'app', expiresAt: null, updatedAt: local_iso(2026, 8, 1) },
            { packageKey: 'catalog_y1', expiresAt: local_iso(2027, 0, 1), updatedAt: local_iso(2026, 8, 1) },
          ],
        },
        {
          email: 'admin@example.com',
          user_type: 'Admin',
          entitlements: [{ packageKey: 'app', expiresAt: null, updatedAt: local_iso(2026, 8, 1) }],
        },
        {
          email: 'old@example.com',
          user_type: 'Member',
          entitlements: [{ packageKey: 'app', expiresAt: local_iso(2026, 0, 1), updatedAt: local_iso(2025, 0, 1) }],
        },
        {
          email: 'bad@example.com',
          user_type: 'Member',
          entitlements: [{ packageKey: 'app', expiresAt: 'not-a-date', updatedAt: local_iso(2026, 8, 1) }],
        },
      ],
      NOW,
    );
    assert.equal(revenue_summary.total_vnd, PACKAGE_LIST_PRICES.app + PACKAGE_LIST_PRICES.catalog_y1);
    assert.equal(revenue_summary.by_package.find((package_row) => package_row.package_key === 'app').user_count, 1);
    assert.equal(
      revenue_summary.by_package.find((package_row) => package_row.package_key === 'catalog_y1').user_count,
      1,
    );
  });

  it('includes rows missing updated_at in the current total', () => {
    const revenue_summary = estimate_revenue(
      [
        {
          email: 'member@example.com',
          user_type: 'Member',
          entitlements: [{ packageKey: 'app', expiresAt: null }],
        },
      ],
      NOW,
    );
    assert.equal(revenue_summary.total_vnd, PACKAGE_LIST_PRICES.app);
  });
});

describe('bucket_revenue', () => {
  it('places active entitlement amounts on updated_at and omits missing timestamps', () => {
    const period_rows = bucket_revenue(
      [
        {
          email: 'a@example.com',
          user_type: 'Member',
          entitlements: [{ packageKey: 'app', expiresAt: null, updatedAt: local_iso(2026, 8, 4) }],
        },
        {
          email: 'b@example.com',
          user_type: 'Member',
          entitlements: [{ packageKey: 'app', expiresAt: null }],
        },
        {
          email: 'admin@example.com',
          user_type: 'Admin',
          entitlements: [{ packageKey: 'app', expiresAt: null, updatedAt: local_iso(2026, 8, 4) }],
        },
      ],
      'day',
      NOW,
    );
    const today_row = period_rows.find((period_row) => period_row.key === '2026-09-04');
    assert.equal(today_row.amount_vnd, PACKAGE_LIST_PRICES.app);
    assert.equal(
      period_rows.reduce((sum_value, period_row) => sum_value + period_row.amount_vnd, 0),
      PACKAGE_LIST_PRICES.app,
    );
  });
});
