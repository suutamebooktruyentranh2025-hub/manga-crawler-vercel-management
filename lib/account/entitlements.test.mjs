import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
  hasApp,
  hasCatalogY1,
  hasCatalogY2,
  defaultExpiresAtIso,
} from './entitlements.mjs';

describe('packageEntitlements', () => {
  const now = Date.parse('2026-08-20T00:00:00Z');

  it('catalog-only does not grant app', () => {
    const session = {
      userType: 'Super Member',
      entitlements: [{ packageKey: PACKAGE_CATALOG_Y1, expiresAt: null }],
    };
    assert.equal(hasApp(session, now), false);
    assert.equal(hasCatalogY1(session, now), true);
    assert.equal(hasCatalogY2(session, now), false);
  });

  it('expired catalog_y1 is inactive', () => {
    const session = {
      entitlements: [{ packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2026-08-19T00:00:00Z' }],
    };
    assert.equal(hasCatalogY1(session, now), false);
  });

  it('admin bypasses all packages', () => {
    assert.equal(hasApp({ isAdmin: true, entitlements: [] }, now), true);
    assert.equal(hasCatalogY1({ userType: 'Admin', entitlements: [] }, now), true);
  });

  it('app default expiry is lifetime', () => {
    assert.equal(defaultExpiresAtIso(PACKAGE_APP, new Date(now)), null);
  });

  it('catalog default expiry uses one calendar year', () => {
    const reference_date = new Date('2023-03-01T00:00:00Z');
    const expected_date = new Date(reference_date);
    expected_date.setFullYear(expected_date.getFullYear() + 1);

    assert.equal(defaultExpiresAtIso(PACKAGE_CATALOG_Y2, reference_date), expected_date.toISOString());
  });

  it('later active package row grants access', () => {
    const session = {
      entitlements: [
        { packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2026-08-19T00:00:00Z' },
        { packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2026-08-21T00:00:00Z' },
      ],
    };

    assert.equal(hasCatalogY1(session, now), true);
  });

  it('legacy Super session without entitlements still has app and catalog y1', () => {
    const session = { userType: 'Super Member' };
    assert.equal(hasApp(session, now), true);
    assert.equal(hasCatalogY1(session, now), true);
    assert.equal(hasCatalogY2(session, now), false);
  });

  it('explicit empty entitlements do not fall back to userType ladder', () => {
    const session = { userType: 'Super Member', entitlements: [] };
    assert.equal(hasApp(session, now), false);
    assert.equal(hasCatalogY1(session, now), false);
  });
});

