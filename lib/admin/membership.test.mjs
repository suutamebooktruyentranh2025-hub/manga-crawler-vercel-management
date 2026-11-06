import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize_email,
  normalize_user_type,
  evaluate_role_change,
  evaluate_remove,
  split_admin_lists,
  decide_upsert,
  decide_package_upsert,
} from './membership.mjs';
import {
  defaultExpiresAtIso,
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
} from '../account/entitlements.mjs';

describe('normalize_email', () => {
  it('trims and lowercases email', () => {
    assert.equal(normalize_email('  TranHoang@Gmail.com '), 'tranhoang@gmail.com');
  });

  it('returns empty string for missing values', () => {
    assert.equal(normalize_email(null), '');
    assert.equal(normalize_email('   '), '');
  });
});

describe('normalize_user_type', () => {
  it('maps known types to canonical labels', () => {
    assert.equal(normalize_user_type('member'), 'Member');
    assert.equal(normalize_user_type('Premium Member'), 'Premium Member');
    assert.equal(normalize_user_type('super member'), 'Super Member');
    assert.equal(normalize_user_type('ADMIN'), 'Admin');
    assert.equal(normalize_user_type('free'), 'Free');
  });

  it('falls back to Free for unknown types', () => {
    assert.equal(normalize_user_type('vip'), 'Free');
    assert.equal(normalize_user_type(''), 'Free');
  });
});

describe('evaluate_role_change', () => {
  const admin_profiles = [
    { email: 'admin@example.com', user_type: 'Admin' },
    { email: 'member@example.com', user_type: 'Member' },
  ];

  it('rejects empty email', () => {
    const result = evaluate_role_change({
      actor_email: 'admin@example.com',
      target_email: ' ',
      next_user_type: 'Member',
      current_profiles: admin_profiles,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'EMAIL_REQUIRED');
  });

  it('allows promoting a member to Admin', () => {
    const result = evaluate_role_change({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      next_user_type: 'Admin',
      current_profiles: admin_profiles,
    });
    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Admin');
    assert.equal(result.target_email, 'member@example.com');
  });

  it('blocks an admin from changing their own type', () => {
    const result = evaluate_role_change({
      actor_email: 'admin@example.com',
      target_email: 'admin@example.com',
      next_user_type: 'Member',
      current_profiles: admin_profiles,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'CANNOT_CHANGE_SELF');
  });

  it('blocks demoting the last remaining Admin', () => {
    const result = evaluate_role_change({
      actor_email: 'admin@example.com',
      target_email: 'only-admin@example.com',
      next_user_type: 'Member',
      current_profiles: [{ email: 'only-admin@example.com', user_type: 'Admin' }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'LAST_ADMIN');
  });

  it('allows demoting an Admin when another Admin remains', () => {
    const result = evaluate_role_change({
      actor_email: 'admin@example.com',
      target_email: 'second@example.com',
      next_user_type: 'Member',
      current_profiles: [
        { email: 'admin@example.com', user_type: 'Admin' },
        { email: 'second@example.com', user_type: 'Admin' },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Member');
  });
});

describe('evaluate_remove', () => {
  it('blocks an admin from removing themselves', () => {
    const result = evaluate_remove({
      actor_email: 'admin@example.com',
      target_email: 'admin@example.com',
      current_profiles: [{ email: 'admin@example.com', user_type: 'Admin' }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'CANNOT_REMOVE_SELF');
  });

  it('blocks removing the last remaining Admin', () => {
    const result = evaluate_remove({
      actor_email: 'admin@example.com',
      target_email: 'only-admin@example.com',
      current_profiles: [{ email: 'only-admin@example.com', user_type: 'Admin' }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'LAST_ADMIN');
  });

  it('allows removing a pending allowlist email with no profile', () => {
    const result = evaluate_remove({
      actor_email: 'admin@example.com',
      target_email: 'pending@example.com',
      current_profiles: [{ email: 'admin@example.com', user_type: 'Admin' }],
    });
    assert.equal(result.ok, true);
    assert.equal(result.target_email, 'pending@example.com');
  });
});

describe('split_admin_lists', () => {
  it('puts profiles on logged-in tab and unmatched allowlist on pending tab', () => {
    const result = split_admin_lists({
      profiles: [
        {
          email: 'admin@example.com',
          user_type: 'Admin',
          created_at: '2026-01-01T00:00:00.000Z',
          last_login_at: '2026-08-01T00:00:00.000Z',
          remaining_tokens: 0,
        },
        {
          email: 'free@example.com',
          user_type: 'Free',
          created_at: '2026-02-01T00:00:00.000Z',
          last_login_at: '2026-08-02T00:00:00.000Z',
          remaining_tokens: 87,
        },
      ],
      allowlist: [
        { email: 'admin@example.com', user_type: 'Admin' },
        {
          email: 'pending@example.com',
          user_type: 'Member',
          created_at: '2026-07-15T00:00:00.000Z',
        },
      ],
    });

    assert.equal(result.logged_in.length, 2);
    assert.deepEqual(
      result.pending.map((row) => row.email),
      ['pending@example.com'],
    );
    assert.equal(result.pending[0].user_type, 'Member');
    assert.equal(result.pending[0].added_at, '2026-07-15T00:00:00.000Z');
  });
});

describe('decide_upsert', () => {
  const admin_profiles = [
    { email: 'admin@example.com', user_type: 'Admin' },
    { email: 'member@example.com', user_type: 'Member' },
  ];

  it('treats Free as a remove', () => {
    const result = decide_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      user_type: 'Free',
      current_profiles: admin_profiles,
    });
    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Free');
    assert.equal(result.target_email, 'member@example.com');
  });

  it('promotes a pending email to Member', () => {
    const result = decide_upsert({
      actor_email: 'admin@example.com',
      target_email: 'new@example.com',
      user_type: 'member',
      current_profiles: admin_profiles,
    });
    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Member');
    assert.equal(result.target_email, 'new@example.com');
  });
});

describe('defaultExpiresAtIso', () => {
  it('enabling catalog_y1 without date uses +365 days', () => {
    const now_date = new Date('2026-08-20T00:00:00Z');
    const expires_iso = defaultExpiresAtIso(PACKAGE_CATALOG_Y1, now_date);
    assert.equal(expires_iso.startsWith('2027-08-20'), true);
  });

  it('enabling app without date stores null expiry', () => {
    assert.equal(defaultExpiresAtIso(PACKAGE_APP, new Date()), null);
  });
});

describe('decide_package_upsert', () => {
  const admin_profiles = [
    { email: 'admin@example.com', user_type: 'Admin' },
    { email: 'member@example.com', user_type: 'Member' },
  ];

  it('catalog_y2 only does not treat as remove', () => {
    const result = decide_package_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      is_admin: false,
      packages: {
        catalog_y2: { enabled: true, expires_at: '' },
      },
      current_profiles: admin_profiles,
    });

    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Premium Member');
    assert.equal(result.packages.catalog_y2.enabled, true);
  });

  it('catalog_y1 only does not imply Admin', () => {
    const result = decide_package_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      is_admin: false,
      packages: {
        catalog_y1: { enabled: true, expires_at: '' },
      },
      current_profiles: admin_profiles,
    });

    assert.equal(result.ok, true);
    assert.equal(result.next_user_type, 'Super Member');
    assert.equal(result.is_admin, false);
  });

  it('enabling catalog_y1 without date uses calendar +1 year', () => {
    const now_date = new Date('2026-08-20T00:00:00Z');
    const result = decide_package_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      is_admin: false,
      packages: {
        catalog_y1: { enabled: true, expires_at: '' },
      },
      current_profiles: admin_profiles,
      now: now_date,
    });

    assert.equal(result.ok, true);
    assert.equal(result.packages.catalog_y1.expires_at.startsWith('2027-08-20'), true);
  });

  it('enabling catalog_y1 without date keeps existing lifetime entitlement null', () => {
    const now_date = new Date('2026-08-20T00:00:00Z');
    const result = decide_package_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      is_admin: false,
      packages: {
        catalog_y1: { enabled: true, expires_at: '' },
      },
      current_profiles: admin_profiles,
      current_entitlements: [
        {
          packageKey: PACKAGE_CATALOG_Y1,
          expiresAt: null,
        },
      ],
      now: now_date,
    });

    assert.equal(result.ok, true);
    assert.equal(result.packages.catalog_y1.expires_at, null);
  });

  it('enabling app without date stores null expiry', () => {
    const result = decide_package_upsert({
      actor_email: 'admin@example.com',
      target_email: 'member@example.com',
      is_admin: false,
      packages: {
        app: { enabled: true, expires_at: '' },
      },
      current_profiles: admin_profiles,
    });

    assert.equal(result.ok, true);
    assert.equal(result.packages.app.expires_at, null);
  });

  it('last-admin still blocked when is_admin goes false', () => {
    const result = decide_package_upsert({
      actor_email: 'owner@example.com',
      target_email: 'only-admin@example.com',
      is_admin: false,
      packages: {
        app: { enabled: true, expires_at: null },
      },
      current_profiles: [{ email: 'only-admin@example.com', user_type: 'Admin' }],
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'LAST_ADMIN');
  });
});
