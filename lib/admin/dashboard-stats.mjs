import { isEntitlementActive, PACKAGE_APP, PACKAGE_CATALOG_Y1, PACKAGE_CATALOG_Y2 } from '../account/entitlements.mjs';

const USER_TYPE_ORDER = ['Free', 'Member', 'Super Member', 'Premium Member', 'Admin'];

export const PACKAGE_LIST_PRICES = {
  [PACKAGE_APP]: 99_000,
  [PACKAGE_CATALOG_Y1]: 200_000,
  [PACKAGE_CATALOG_Y2]: 200_000,
};

export const PACKAGE_PRICE_ROWS = [
  { package_key: PACKAGE_APP, label: 'Gói App' },
  { package_key: PACKAGE_CATALOG_Y1, label: 'Gói Truyện (năm 1)' },
  { package_key: PACKAGE_CATALOG_Y2, label: 'Gói Truyện (năm 2)' },
];

function pad2(numeric_value) {
  return String(numeric_value).padStart(2, '0');
}

function start_of_local_day(date_value) {
  return new Date(date_value.getFullYear(), date_value.getMonth(), date_value.getDate());
}

function period_key_for_date(date_value, grain) {
  const year_value = date_value.getFullYear();
  const month_value = pad2(date_value.getMonth() + 1);
  const day_value = pad2(date_value.getDate());
  if (grain === 'year') return String(year_value);
  if (grain === 'month') return `${year_value}-${month_value}`;
  return `${year_value}-${month_value}-${day_value}`;
}

function parse_timestamp(raw_value) {
  if (!raw_value) return null;
  const parsed_date = new Date(raw_value);
  if (Number.isNaN(parsed_date.getTime())) return null;
  return parsed_date;
}

function build_day_keys(now_date) {
  const end_date = start_of_local_day(now_date);
  const period_keys = [];
  for (let day_offset = 29; day_offset >= 0; day_offset -= 1) {
    const bucket_date = new Date(end_date);
    bucket_date.setDate(end_date.getDate() - day_offset);
    period_keys.push(period_key_for_date(bucket_date, 'day'));
  }
  return period_keys;
}

function build_month_keys(now_date) {
  const period_keys = [];
  for (let month_offset = 11; month_offset >= 0; month_offset -= 1) {
    const bucket_date = new Date(now_date.getFullYear(), now_date.getMonth() - month_offset, 1);
    period_keys.push(period_key_for_date(bucket_date, 'month'));
  }
  return period_keys;
}

function build_year_keys(now_date, sample_dates) {
  let min_year = now_date.getFullYear();
  for (const sample_date of sample_dates) {
    if (sample_date.getFullYear() < min_year) min_year = sample_date.getFullYear();
  }
  const period_keys = [];
  for (let year_value = min_year; year_value <= now_date.getFullYear(); year_value += 1) {
    period_keys.push(String(year_value));
  }
  return period_keys;
}

function collect_valid_dates(raw_values) {
  const parsed_dates = [];
  for (const raw_value of raw_values) {
    const parsed_date = parse_timestamp(raw_value);
    if (parsed_date) parsed_dates.push(parsed_date);
  }
  return parsed_dates;
}

function build_period_keys(grain, now_date, sample_dates) {
  if (grain === 'month') return build_month_keys(now_date);
  if (grain === 'year') return build_year_keys(now_date, sample_dates);
  return build_day_keys(now_date);
}

function period_label(period_key, grain) {
  if (grain === 'year') return period_key;
  if (grain === 'month') {
    const [year_value, month_value] = period_key.split('-');
    return `${Number(month_value)}/${year_value}`;
  }
  const [year_value, month_value, day_value] = period_key.split('-');
  return `${Number(day_value)}/${Number(month_value)}`;
}

function fill_period_rows(period_keys, grain, count_by_key, value_key) {
  return period_keys.map((period_key) => ({
    key: period_key,
    label: period_label(period_key, grain),
    [value_key]: count_by_key.get(period_key) || 0,
  }));
}

function is_admin_row(user_row) {
  return String(user_row?.user_type || '').trim() === 'Admin';
}

function active_billable_entitlements(user_rows, now_date) {
  const now_ms = now_date.getTime();
  const billed_rows = [];
  for (const user_row of user_rows || []) {
    if (is_admin_row(user_row)) continue;
    for (const entitlement_row of user_row.entitlements || []) {
      if (!isEntitlementActive(entitlement_row, now_ms)) continue;
      const package_key = String(entitlement_row.packageKey || entitlement_row.package_key || '');
      if (!Object.prototype.hasOwnProperty.call(PACKAGE_LIST_PRICES, package_key)) continue;
      billed_rows.push({
        package_key,
        updated_at: entitlement_row.updatedAt ?? entitlement_row.updated_at ?? null,
        amount_vnd: PACKAGE_LIST_PRICES[package_key],
      });
    }
  }
  return billed_rows;
}

export function bucket_signups(profiles, grain, now_date = new Date()) {
  const sample_dates = collect_valid_dates((profiles || []).map((profile_row) => profile_row.created_at));
  const period_keys = build_period_keys(grain, now_date, sample_dates);
  const allowed_keys = new Set(period_keys);
  const count_by_key = new Map();
  for (const profile_row of profiles || []) {
    const created_date = parse_timestamp(profile_row.created_at);
    if (!created_date) continue;
    const period_key = period_key_for_date(created_date, grain);
    if (!allowed_keys.has(period_key)) continue;
    count_by_key.set(period_key, (count_by_key.get(period_key) || 0) + 1);
  }
  return fill_period_rows(period_keys, grain, count_by_key, 'count');
}

export function count_by_user_type(profiles) {
  const count_by_type = new Map(USER_TYPE_ORDER.map((user_type) => [user_type, 0]));
  for (const profile_row of profiles || []) {
    const user_type = String(profile_row.user_type || '').trim();
    if (!count_by_type.has(user_type)) continue;
    count_by_type.set(user_type, count_by_type.get(user_type) + 1);
  }
  return USER_TYPE_ORDER.map((user_type) => ({
    user_type,
    count: count_by_type.get(user_type) || 0,
  }));
}

export function estimate_revenue(user_rows, now_date = new Date()) {
  const billed_rows = active_billable_entitlements(user_rows, now_date);
  const count_by_package = new Map(PACKAGE_PRICE_ROWS.map((package_row) => [package_row.package_key, 0]));
  let total_vnd = 0;
  for (const billed_row of billed_rows) {
    total_vnd += billed_row.amount_vnd;
    count_by_package.set(billed_row.package_key, (count_by_package.get(billed_row.package_key) || 0) + 1);
  }
  return {
    total_vnd,
    by_package: PACKAGE_PRICE_ROWS.map((package_row) => {
      const user_count = count_by_package.get(package_row.package_key) || 0;
      const price_vnd = PACKAGE_LIST_PRICES[package_row.package_key];
      return {
        package_key: package_row.package_key,
        label: package_row.label,
        price_vnd,
        user_count,
        subtotal_vnd: user_count * price_vnd,
      };
    }),
  };
}

export function bucket_revenue(user_rows, grain, now_date = new Date()) {
  const billed_rows = active_billable_entitlements(user_rows, now_date);
  const sample_dates = collect_valid_dates(billed_rows.map((billed_row) => billed_row.updated_at));
  const period_keys = build_period_keys(grain, now_date, sample_dates);
  const allowed_keys = new Set(period_keys);
  const amount_by_key = new Map();
  for (const billed_row of billed_rows) {
    const updated_date = parse_timestamp(billed_row.updated_at);
    if (!updated_date) continue;
    const period_key = period_key_for_date(updated_date, grain);
    if (!allowed_keys.has(period_key)) continue;
    amount_by_key.set(period_key, (amount_by_key.get(period_key) || 0) + billed_row.amount_vnd);
  }
  return fill_period_rows(period_keys, grain, amount_by_key, 'amount_vnd');
}

export function format_vnd(amount_vnd) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount_vnd) || 0)}đ`;
}
