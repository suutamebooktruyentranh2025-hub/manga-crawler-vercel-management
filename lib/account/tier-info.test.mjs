import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { get_tier_access } from './tier-info.js';

describe('get_tier_access package groups', () => {
  it('shows Free app package with remaining tokens', () => {
    const tier_access = get_tier_access({
      remaining_tokens: 25,
      entitlements: [],
    });

    assert.equal(tier_access.app_package.label, 'Free');
    assert.equal(tier_access.app_package.detail, '25 / 300 token');
    assert.equal(tier_access.catalog_package.label, 'Chưa đăng ký');
  });

  it('shows active app package as Member with lifetime access', () => {
    const tier_access = get_tier_access({
      entitlements: [{ packageKey: 'app', expiresAt: null }],
    });

    assert.equal(tier_access.app_package.label, 'Member');
    assert.equal(tier_access.app_package.detail, 'Vĩnh viễn');
  });

  it('shows active year 1 package as Super Member', () => {
    const tier_access = get_tier_access({
      entitlements: [{ packageKey: 'catalog_y1', expiresAt: '2027-08-21T00:00:00Z' }],
    });

    assert.equal(tier_access.catalog_package.label, 'Super Member');
    assert.equal(tier_access.catalog_package.detail, 'Hết hạn 21/08/2027');
  });

  it('shows active year 2 package as Premium Member', () => {
    const tier_access = get_tier_access({
      entitlements: [
        { packageKey: 'catalog_y1', expiresAt: '2027-08-21T00:00:00Z' },
        { packageKey: 'catalog_y2', expiresAt: '2028-08-21T00:00:00Z' },
      ],
    });

    assert.equal(tier_access.catalog_package.label, 'Premium Member');
    assert.equal(tier_access.catalog_package.detail, 'Hết hạn 21/08/2028');
  });

  it('shows expired year 1 package as inactive with expiry copy', () => {
    const tier_access = get_tier_access({
      entitlements: [{ packageKey: 'catalog_y1', expiresAt: '2026-08-19T00:00:00Z' }],
    });

    assert.equal(tier_access.catalog_package.label, 'Chưa đăng ký');
    assert.equal(tier_access.catalog_package.detail, 'Hết hạn 19/08/2026');
  });

  it('shows admin bypass without implying a purchased package', () => {
    const tier_access = get_tier_access({
      is_admin: true,
      entitlements: [],
    });

    assert.equal(tier_access.app_package.label, 'Admin');
    assert.equal(tier_access.app_package.detail, 'Không giới hạn · Vĩnh viễn');
    assert.equal(tier_access.catalog_package.label, 'Admin');
    assert.equal(tier_access.catalog_package.detail, 'Không giới hạn · Vĩnh viễn');
  });
});
