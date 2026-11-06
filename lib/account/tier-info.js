import {
  hasApp,
  hasCatalogY1,
  hasCatalogY2,
  isEntitlementActive,
} from './entitlements.mjs';

export const CONTACT_LINKS = [
  {
    label: 'Email',
    href: 'mailto:suutamebooktruyentranh@gmail.com',
    text: 'suutamebooktruyentranh@gmail.com',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/alexdandan',
    text: 't.me/alexdandan',
  },
  {
    label: 'Kênh',
    href: 'https://t.me/suutamebooktruyentranh',
    text: 't.me/suutamebooktruyentranh',
  },
  {
    label: 'Đăng ký',
    href: 'https://t.me/suutamebooktruyentranhdangky',
    text: 't.me/suutamebooktruyentranhdangky',
  },
];

const TOKEN_MAX = 300;

const TIER_BADGES = {
  Free: 'bg-zinc-100 text-zinc-700',
  'Chưa đăng ký': 'bg-zinc-100 text-zinc-500',
  Member: 'bg-emerald-50 text-emerald-800',
  'Super Member': 'bg-violet-50 text-violet-800',
  'Premium Member': 'bg-amber-50 text-amber-900',
  Admin: 'bg-zinc-900 text-white',
};

function normalize_tier_profile(profile) {
  return {
    entitlements: Array.isArray(profile?.entitlements) ? profile.entitlements : [],
    isAdmin: profile?.isAdmin === true || profile?.is_admin === true,
    userType: profile?.userType || profile?.user_type || '',
    remainingTokens:
      profile?.remainingTokens == null
        ? profile?.remaining_tokens == null
          ? 0
          : Number(profile.remaining_tokens)
        : Number(profile.remainingTokens),
  };
}

function format_short_vi_date(value) {
  if (!value) return '';
  const parsed_date = new Date(value);
  if (Number.isNaN(parsed_date.getTime())) return '';
  const day_value = String(parsed_date.getDate()).padStart(2, '0');
  const month_value = String(parsed_date.getMonth() + 1).padStart(2, '0');
  const year_value = String(parsed_date.getFullYear());
  return `${day_value}/${month_value}/${year_value}`;
}

function find_package_rows(profile, package_key) {
  return profile.entitlements.filter((row) => {
    const entitlement_key = String(row?.packageKey || row?.package_key || '');
    return entitlement_key === package_key;
  });
}

function find_active_row(profile, package_key) {
  return find_package_rows(profile, package_key).find((row) => isEntitlementActive(row));
}

function find_latest_expired_row(profile, package_keys) {
  let latest_row = null;
  let latest_ms = Number.NEGATIVE_INFINITY;
  for (const package_key of package_keys) {
    for (const entitlement_row of find_package_rows(profile, package_key)) {
      if (isEntitlementActive(entitlement_row)) continue;
      const raw_expiry = entitlement_row?.expiresAt ?? entitlement_row?.expires_at;
      const expiry_ms = Date.parse(raw_expiry || '');
      if (!Number.isFinite(expiry_ms)) continue;
      if (expiry_ms > latest_ms) {
        latest_ms = expiry_ms;
        latest_row = entitlement_row;
      }
    }
  }
  return latest_row;
}

function build_app_package(profile) {
  if (profile.isAdmin) {
    return {
      title: 'Gói App',
      label: 'Admin',
      detail: 'Không giới hạn · Vĩnh viễn',
      badge_class: TIER_BADGES.Admin,
    };
  }

  const active_row = find_active_row(profile, 'app');
  if (hasApp(profile)) {
    const raw_expiry = active_row?.expiresAt ?? active_row?.expires_at;
    return {
      title: 'Gói App',
      label: 'Member',
      detail: raw_expiry ? format_short_vi_date(raw_expiry) : 'Vĩnh viễn',
      badge_class: TIER_BADGES.Member,
    };
  }

  return {
    title: 'Gói App',
    label: 'Free',
    detail: `${Math.max(0, profile.remainingTokens || 0)} / ${TOKEN_MAX} token`,
    badge_class: TIER_BADGES.Free,
  };
}

function later_active_expires_at(expires_at_values) {
  const present_values = expires_at_values.filter((value) => value !== undefined);
  if (present_values.length === 0) return null;
  if (present_values.some((value) => value == null || value === '')) return null;
  return present_values.reduce((latest_value, current_value) => {
    return Date.parse(current_value) >= Date.parse(latest_value)
      ? current_value
      : latest_value;
  });
}

function build_catalog_package(profile) {
  if (profile.isAdmin) {
    return {
      title: 'Gói Truyện',
      label: 'Admin',
      detail: 'Không giới hạn · Vĩnh viễn',
      badge_class: TIER_BADGES.Admin,
    };
  }

  if (hasCatalogY2(profile)) {
    const y1_row = hasCatalogY1(profile) ? find_active_row(profile, 'catalog_y1') : null;
    const y2_row = find_active_row(profile, 'catalog_y2');
    const display_dates = [];
    if (y1_row) display_dates.push(y1_row.expiresAt ?? y1_row.expires_at ?? null);
    display_dates.push(y2_row?.expiresAt ?? y2_row?.expires_at ?? null);
    const raw_expiry = later_active_expires_at(display_dates);
    return {
      title: 'Gói Truyện',
      label: 'Premium Member',
      detail: raw_expiry ? `Hết hạn ${format_short_vi_date(raw_expiry)}` : 'Vĩnh viễn',
      badge_class: TIER_BADGES['Premium Member'],
    };
  }

  if (hasCatalogY1(profile)) {
    const active_row = find_active_row(profile, 'catalog_y1');
    const raw_expiry = active_row?.expiresAt ?? active_row?.expires_at;
    return {
      title: 'Gói Truyện',
      label: 'Super Member',
      detail: raw_expiry ? `Hết hạn ${format_short_vi_date(raw_expiry)}` : 'Vĩnh viễn',
      badge_class: TIER_BADGES['Super Member'],
    };
  }

  const expired_row = find_latest_expired_row(profile, ['catalog_y1', 'catalog_y2']);
  const raw_expiry = expired_row?.expiresAt ?? expired_row?.expires_at;
  return {
    title: 'Gói Truyện',
    label: 'Chưa đăng ký',
    detail: raw_expiry ? `Hết hạn ${format_short_vi_date(raw_expiry)}` : '',
    badge_class: TIER_BADGES['Chưa đăng ký'],
  };
}

export function get_tier_access(profile) {
  const normalized_profile = normalize_tier_profile(profile);

  return {
    app_package: build_app_package(normalized_profile),
    catalog_package: build_catalog_package(normalized_profile),
  };
}
