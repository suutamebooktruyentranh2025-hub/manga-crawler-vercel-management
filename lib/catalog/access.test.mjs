import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  can_see_catalog_download,
  can_see_year1_download,
  can_see_year_download,
  can_show_year_tabs,
  can_view_year2,
  sanitize_catalog_item,
} from './access.mjs';

const APP_SESSION = {
  entitlements: [{ packageKey: 'app', expiresAt: null }],
};

const CATALOG_Y1_SESSION = {
  entitlements: [{ packageKey: 'catalog_y1', expiresAt: null }],
};

const CATALOG_Y2_SESSION = {
  entitlements: [{ packageKey: 'catalog_y2', expiresAt: null }],
};

const FULL_CATALOG_SESSION = {
  entitlements: [
    { packageKey: 'catalog_y1', expiresAt: null },
    { packageKey: 'catalog_y2', expiresAt: null },
  ],
};

const EXPIRED_Y1_SESSION = {
  entitlements: [{ packageKey: 'catalog_y1', expiresAt: '2026-08-19T00:00:00Z' }],
};

const ADMIN_SESSION = {
  isAdmin: true,
  entitlements: [],
};

describe('can_see_year1_download', () => {
  it('denies year 1 download without catalog_y1', () => {
    assert.equal(can_see_year1_download(null), false);
    assert.equal(can_see_year1_download({ entitlements: [] }), false);
    assert.equal(can_see_year1_download(APP_SESSION), false);
  });

  it('allows year 1 when catalog_y1 is active', () => {
    assert.equal(can_see_year1_download(CATALOG_Y1_SESSION), true);
  });

  it('denies year 1 when catalog_y1 is expired', () => {
    assert.equal(can_see_year1_download(EXPIRED_Y1_SESSION), false);
  });
});

describe('can_show_year_tabs', () => {
  it('shows tabs for every visitor', () => {
    assert.equal(can_show_year_tabs(null), true);
    assert.equal(can_show_year_tabs({ entitlements: [] }), true);
    assert.equal(can_show_year_tabs(CATALOG_Y1_SESSION), true);
  });
});

describe('can_view_year2', () => {
  it('allows guests and signed-in users to view year 2 listings', () => {
    assert.equal(can_view_year2(null), true);
    assert.equal(can_view_year2({ entitlements: [] }), true);
    assert.equal(can_view_year2(CATALOG_Y2_SESSION), true);
  });
});

describe('can_see_year_download', () => {
  it('denies guests for both years', () => {
    assert.equal(can_see_year_download(1, null), false);
    assert.equal(can_see_year_download(2, null), false);
  });

  it('denies free and app-only users from year 1 downloads', () => {
    assert.equal(can_see_year_download(1, { entitlements: [] }), false);
    assert.equal(can_see_year_download(1, APP_SESSION), false);
  });

  it('allows year 1 only when catalog_y1 is active', () => {
    assert.equal(can_see_year_download(1, CATALOG_Y1_SESSION), true);
    assert.equal(can_see_year_download(1, EXPIRED_Y1_SESSION), false);
  });

  it('requires catalog_y2 for year 2 downloads', () => {
    assert.equal(can_see_year_download(2, { entitlements: [] }), false);
    assert.equal(can_see_year_download(2, CATALOG_Y1_SESSION), false);
    assert.equal(can_see_year_download(2, CATALOG_Y2_SESSION), true);
    assert.equal(can_see_year_download(2, FULL_CATALOG_SESSION), true);
  });

  it('allows admin for both years', () => {
    assert.equal(can_see_year_download(1, ADMIN_SESSION), true);
    assert.equal(can_see_year_download(2, ADMIN_SESSION), true);
  });
});

describe('can_see_catalog_download', () => {
  it('denies guests and users without catalog packages', () => {
    assert.equal(can_see_catalog_download(null), false);
    assert.equal(can_see_catalog_download({ entitlements: [] }), false);
    assert.equal(can_see_catalog_download(APP_SESSION), false);
  });

  it('allows users with catalog_y1', () => {
    assert.equal(can_see_catalog_download(CATALOG_Y1_SESSION), true);
  });

  it('allows users with catalog_y2', () => {
    assert.equal(can_see_catalog_download(CATALOG_Y2_SESSION), true);
  });

  it('allows admin users', () => {
    assert.equal(can_see_catalog_download(ADMIN_SESSION), true);
  });

  it('denies expired catalog entitlement', () => {
    assert.equal(can_see_catalog_download(EXPIRED_Y1_SESSION), false);
  });
});

describe('sanitize_catalog_item', () => {
  const catalog_item = {
    title: 'Solo Leveling',
    author: 'Chugong',
    source: 'MangaDex',
    download_url: 'https://drive.google.com/file/d/abc/view',
  };

  it('keeps download_url when allowed', () => {
    const sanitized_item = sanitize_catalog_item(catalog_item, { can_see_link: true });
    assert.equal(sanitized_item.download_url, catalog_item.download_url);
    assert.equal(sanitized_item.title, 'Solo Leveling');
  });

  it('strips download_url when not allowed', () => {
    const sanitized_item = sanitize_catalog_item(catalog_item, { can_see_link: false });
    assert.equal(sanitized_item.download_url, '');
    assert.equal(sanitized_item.title, 'Solo Leveling');
    assert.equal(catalog_item.download_url, 'https://drive.google.com/file/d/abc/view');
  });

  it('strips source so the public catalog never exposes it', () => {
    const sanitized_item = sanitize_catalog_item(catalog_item, { can_see_link: true });
    assert.equal(sanitized_item.source, '');
    assert.equal(catalog_item.source, 'MangaDex');
  });
});
