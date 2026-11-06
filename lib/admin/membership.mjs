import {
  defaultExpiresAtIso,
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
} from '../account/entitlements.mjs';

const VALID_USER_TYPES = new Map([
  ['free', 'Free'],
  ['member', 'Member'],
  ['premium member', 'Premium Member'],
  ['super member', 'Super Member'],
  ['admin', 'Admin'],
]);

const PACKAGE_KEYS = [PACKAGE_APP, PACKAGE_CATALOG_Y1, PACKAGE_CATALOG_Y2];

export function normalize_email(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalize_user_type(value) {
  const normalized_type = String(value || 'Free').trim().toLowerCase();
  return VALID_USER_TYPES.get(normalized_type) || 'Free';
}

export function is_admin_type(user_type) {
  return normalize_user_type(user_type) === 'Admin';
}

function count_admins(current_profiles) {
  return (current_profiles || []).filter((row) => is_admin_type(row?.user_type)).length;
}

function find_profile(current_profiles, email) {
  return (current_profiles || []).find(
    (row) => normalize_email(row?.email) === email,
  );
}

function find_current_entitlement(current_entitlements, package_key) {
  return (current_entitlements || []).find((entitlement_row) => {
    const normalized_key = String(
      entitlement_row?.packageKey || entitlement_row?.package_key || '',
    ).trim();
    return normalized_key === package_key;
  }) || null;
}

function normalize_package_expiry(package_key, raw_expiry, now_date, current_entitlement) {
  if (raw_expiry == null || raw_expiry === '') {
    const current_expiry = current_entitlement?.expiresAt ?? current_entitlement?.expires_at;
    if (package_key !== PACKAGE_APP && current_entitlement && (current_expiry == null || current_expiry === '')) {
      return null;
    }
    return defaultExpiresAtIso(package_key, now_date);
  }

  const parsed_date = new Date(raw_expiry);
  if (Number.isNaN(parsed_date.getTime())) {
    return { ok: false, code: 'INVALID_EXPIRES_AT', error: 'Invalid package expiry date.' };
  }

  return parsed_date.toISOString();
}

function normalize_packages(packages, now_date, current_entitlements) {
  const normalized_packages = {};
  for (const package_key of PACKAGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(packages || {}, package_key)) continue;

    const package_value = packages?.[package_key] || {};
    const enabled_flag = package_value.enabled === true;
    if (!enabled_flag) {
      normalized_packages[package_key] = { enabled: false, expires_at: null };
      continue;
    }

    const current_entitlement = find_current_entitlement(current_entitlements, package_key);
    const expires_value = normalize_package_expiry(
      package_key,
      package_value.expires_at ?? package_value.expiresAt ?? null,
      now_date,
      current_entitlement,
    );
    if (typeof expires_value === 'object' && expires_value?.ok === false) {
      return expires_value;
    }

    normalized_packages[package_key] = {
      enabled: true,
      expires_at: expires_value,
    };
  }

  return { ok: true, packages: normalized_packages };
}

function derive_display_type(is_admin, packages) {
  if (is_admin) return 'Admin';
  const has_app = packages?.[PACKAGE_APP]?.enabled === true;
  const has_catalog_y1 = packages?.[PACKAGE_CATALOG_Y1]?.enabled === true;
  const has_catalog_y2 = packages?.[PACKAGE_CATALOG_Y2]?.enabled === true;

  if (has_catalog_y2) return 'Premium Member';
  if (has_catalog_y1) return 'Super Member';
  if (has_app) return 'Member';
  return 'Free';
}

function has_enabled_package(packages) {
  return PACKAGE_KEYS.some((package_key) => packages?.[package_key]?.enabled === true);
}

export function evaluate_role_change({
  actor_email,
  target_email,
  next_user_type,
  current_profiles,
}) {
  const normalized_actor = normalize_email(actor_email);
  const normalized_target = normalize_email(target_email);
  const canonical_type = normalize_user_type(next_user_type);

  if (!normalized_target) {
    return { ok: false, code: 'EMAIL_REQUIRED', error: 'Email is required.' };
  }

  if (normalized_actor && normalized_actor === normalized_target) {
    return {
      ok: false,
      code: 'CANNOT_CHANGE_SELF',
      error: 'You cannot change your own role.',
    };
  }

  const target_profile = find_profile(current_profiles, normalized_target);
  const target_is_admin = is_admin_type(target_profile?.user_type);
  if (target_is_admin && canonical_type !== 'Admin' && count_admins(current_profiles) <= 1) {
    return {
      ok: false,
      code: 'LAST_ADMIN',
      error: 'Cannot demote the last remaining Admin.',
    };
  }

  return {
    ok: true,
    target_email: normalized_target,
    next_user_type: canonical_type,
  };
}

export function evaluate_remove({ actor_email, target_email, current_profiles }) {
  const normalized_actor = normalize_email(actor_email);
  const normalized_target = normalize_email(target_email);

  if (!normalized_target) {
    return { ok: false, code: 'EMAIL_REQUIRED', error: 'Email is required.' };
  }

  if (normalized_actor && normalized_actor === normalized_target) {
    return {
      ok: false,
      code: 'CANNOT_REMOVE_SELF',
      error: 'You cannot remove yourself.',
    };
  }

  const target_profile = find_profile(current_profiles, normalized_target);
  if (is_admin_type(target_profile?.user_type) && count_admins(current_profiles) <= 1) {
    return {
      ok: false,
      code: 'LAST_ADMIN',
      error: 'Cannot remove the last remaining Admin.',
    };
  }

  return { ok: true, target_email: normalized_target };
}

export function decide_upsert({ actor_email, target_email, user_type, current_profiles }) {
  const next_user_type = normalize_user_type(user_type);
  if (next_user_type === 'Free') {
    return {
      next_user_type,
      ...evaluate_remove({ actor_email, target_email, current_profiles }),
    };
  }
  return evaluate_role_change({
    actor_email,
    target_email,
    next_user_type,
    current_profiles,
  });
}

export function decide_package_upsert({
  actor_email,
  target_email,
  is_admin,
  packages,
  current_entitlements = [],
  current_profiles,
  now = new Date(),
}) {
  const normalized_target = normalize_email(target_email);
  const package_result = normalize_packages(packages, now, current_entitlements);
  if (!package_result.ok) {
    return package_result;
  }

  const normalized_packages = package_result.packages;
  const is_admin_enabled = is_admin === true;
  const should_remove = !is_admin_enabled && !has_enabled_package(normalized_packages);
  const next_user_type = derive_display_type(is_admin_enabled, normalized_packages);

  if (should_remove) {
    return {
      is_admin: false,
      next_user_type,
      packages: normalized_packages,
      ...evaluate_remove({ actor_email, target_email: normalized_target, current_profiles }),
    };
  }

  const role_result = evaluate_role_change({
    actor_email,
    target_email: normalized_target,
    next_user_type,
    current_profiles,
  });
  if (!role_result.ok) {
    return role_result;
  }

  return {
    ...role_result,
    is_admin: is_admin === true,
    packages: normalized_packages,
  };
}

export function split_admin_lists({ profiles, allowlist, entitlements_by_email = new Map() }) {
  const logged_in = (profiles || []).map((row) => ({
    email: normalize_email(row.email),
    user_type: normalize_user_type(row.user_type),
    created_at: row.created_at || null,
    last_login_at: row.last_login_at || null,
    remaining_tokens:
      row.remaining_tokens == null ? null : Number(row.remaining_tokens),
    entitlements: entitlements_by_email.get(normalize_email(row.email)) || [],
  }));

  const logged_in_emails = new Set(logged_in.map((row) => row.email));
  const pending = (allowlist || [])
    .map((row) => ({
      email: normalize_email(row.email),
      user_type: normalize_user_type(row.user_type),
      added_at: row.created_at || row.added_at || null,
      entitlements: entitlements_by_email.get(normalize_email(row.email)) || [],
    }))
    .filter((row) => row.email && !logged_in_emails.has(row.email));

  return { logged_in, pending };
}

export { VALID_USER_TYPES };
