import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  find_existing_user,
  format_user_entitlements_summary,
  build_existing_user_warning,
} from './existing-user-warning.mjs';
import {
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
} from '../account/entitlements.mjs';

describe('find_existing_user', () => {
  const logged_in = [
    {
      email: 'member@example.com',
      user_type: 'Member',
      entitlements: [{ packageKey: PACKAGE_APP, expiresAt: null }],
    },
    {
      email: 'super@example.com',
      user_type: 'Super Member',
      entitlements: [
        { packageKey: PACKAGE_APP, expiresAt: null },
        { packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2027-08-20T00:00:00.000Z' },
      ],
    },
  ];

  const pending = [
    {
      email: 'pending@example.com',
      user_type: 'Premium Member',
      entitlements: [{ packageKey: PACKAGE_CATALOG_Y2, expiresAt: '2027-12-31T23:59:59.000Z' }],
    },
  ];

  it('returns null for empty or whitespace-only email', () => {
    assert.equal(find_existing_user({ logged_in, pending }, ''), null);
    assert.equal(find_existing_user({ logged_in, pending }, '   '), null);
    assert.equal(find_existing_user({ logged_in, pending }, null), null);
  });

  it('finds user in logged_in with case-insensitive trim', () => {
    const result = find_existing_user({ logged_in, pending }, '  Member@Example.com  ');
    assert.ok(result);
    assert.equal(result.email, 'member@example.com');
    assert.equal(result.user_type, 'Member');
    assert.equal(result.source, 'logged_in');
  });

  it('finds user in pending list', () => {
    const result = find_existing_user({ logged_in, pending }, 'pending@example.com');
    assert.ok(result);
    assert.equal(result.email, 'pending@example.com');
    assert.equal(result.user_type, 'Premium Member');
    assert.equal(result.source, 'pending');
  });

  it('returns null if email does not exist in either list', () => {
    const result = find_existing_user({ logged_in, pending }, 'brand_new@example.com');
    assert.equal(result, null);
  });

  it('works when passed an array of combined rows', () => {
    const all_rows = [...logged_in, ...pending];
    const result = find_existing_user(all_rows, 'super@example.com');
    assert.ok(result);
    assert.equal(result.email, 'super@example.com');
  });
});

describe('format_user_entitlements_summary', () => {
  it('formats lifetime and dated packages correctly', () => {
    const entitlements = [
      { packageKey: PACKAGE_APP, expiresAt: null },
      { packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2027-08-20T00:00:00.000Z' },
    ];
    const summaries = format_user_entitlements_summary(entitlements);
    assert.equal(summaries.length, 2);
    assert.ok(summaries.some((s) => s.includes('Gói App') && s.includes('Vĩnh viễn')));
    assert.ok(summaries.some((s) => s.includes('Gói Truyện (năm 1)') && s.includes('20/08/2027')));
  });

  it('returns empty array when user has no entitlements', () => {
    assert.deepEqual(format_user_entitlements_summary([]), []);
    assert.deepEqual(format_user_entitlements_summary(null), []);
  });
});

describe('build_existing_user_warning', () => {
  it('returns null when user is null', () => {
    assert.equal(build_existing_user_warning({ user: null }), null);
  });

  it('builds warning object with confirm message and banner details', () => {
    const user = {
      email: 'test@example.com',
      user_type: 'Super Member',
      source: 'logged_in',
      entitlements: [
        { packageKey: PACKAGE_APP, expiresAt: null },
        { packageKey: PACKAGE_CATALOG_Y1, expiresAt: '2027-08-20T00:00:00.000Z' },
      ],
    };
    const warning = build_existing_user_warning({ user });
    assert.ok(warning);
    assert.equal(warning.email, 'test@example.com');
    assert.equal(warning.user_type, 'Super Member');
    assert.equal(warning.source, 'logged_in');
    assert.equal(warning.status_label, 'Đã đăng ký');
    assert.equal(warning.tab, 'logged_in');
    assert.equal(warning.active_packages.length, 2);
    assert.ok(warning.confirm_message.includes('test@example.com'));
    assert.ok(warning.confirm_message.includes('GHI ĐÈ'));
    assert.ok(warning.confirm_message.includes('Super Member'));
  });

  it('marks pending status label properly', () => {
    const user = {
      email: 'pending@example.com',
      user_type: 'Member',
      source: 'pending',
      entitlements: [],
    };
    const warning = build_existing_user_warning({ user });
    assert.ok(warning);
    assert.equal(warning.status_label, 'Chờ login');
    assert.equal(warning.tab, 'pending');
    assert.ok(warning.confirm_message.includes('Chưa có gói'));
  });
});
