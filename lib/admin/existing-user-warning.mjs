import {
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
} from '../account/entitlements.mjs';
import { normalize_email } from './membership.mjs';

const PACKAGE_LABELS = {
  [PACKAGE_APP]: 'Gói App',
  [PACKAGE_CATALOG_Y1]: 'Gói Truyện (năm 1)',
  [PACKAGE_CATALOG_Y2]: 'Gói Truyện (năm 2)',
};

function format_date(value) {
  if (!value) return '';
  const parsed_date = new Date(value);
  if (Number.isNaN(parsed_date.getTime())) return '';
  return parsed_date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function find_existing_user(lists_or_rows, email) {
  const normalized = normalize_email(email);
  if (!normalized) return null;

  if (Array.isArray(lists_or_rows)) {
    const found = lists_or_rows.find((row) => normalize_email(row?.email) === normalized);
    if (!found) return null;
    return {
      ...found,
      source: found.source || (found.last_login_at || found.created_at ? 'logged_in' : 'pending'),
    };
  }

  const logged_in = Array.isArray(lists_or_rows?.logged_in) ? lists_or_rows.logged_in : [];
  const pending = Array.isArray(lists_or_rows?.pending) ? lists_or_rows.pending : [];

  const found_logged_in = logged_in.find((row) => normalize_email(row?.email) === normalized);
  if (found_logged_in) {
    return { ...found_logged_in, source: 'logged_in' };
  }

  const found_pending = pending.find((row) => normalize_email(row?.email) === normalized);
  if (found_pending) {
    return { ...found_pending, source: 'pending' };
  }

  return null;
}

export function format_user_entitlements_summary(entitlements = []) {
  if (!Array.isArray(entitlements) || entitlements.length === 0) return [];
  const summaries = [];
  for (const ent of entitlements) {
    const key = ent?.packageKey || ent?.package_key;
    const label = PACKAGE_LABELS[key] || key || 'Gói khác';
    const expires = ent?.expiresAt ?? ent?.expires_at;
    if (!expires) {
      summaries.push(`${label} (Vĩnh viễn)`);
    } else {
      const formatted_date = format_date(expires);
      summaries.push(`${label} (đến ${formatted_date})`);
    }
  }
  return summaries;
}

export function build_existing_user_warning({ user }) {
  if (!user || !user.email) return null;
  const email = normalize_email(user.email);
  const user_type = user.user_type || 'Free';
  const source = user.source === 'pending' ? 'pending' : 'logged_in';
  const status_label = source === 'pending' ? 'Chờ login' : 'Đã đăng ký';
  const tab = source;
  const active_packages = format_user_entitlements_summary(user.entitlements || []);
  const packages_text = active_packages.length > 0 ? active_packages.join(', ') : 'Chưa có gói';

  const confirm_message =
    `Cảnh báo: User "${email}" đã tồn tại trong hệ thống!\n` +
    `• Trạng thái: ${status_label}\n` +
    `• Hạng hiện tại: ${user_type}\n` +
    `• Gói hiện có: ${packages_text}\n\n` +
    `Thao tác này sẽ GHI ĐÈ toàn bộ thông tin và quyền hạn hiện tại của user theo cấu hình mới.\n` +
    `Bạn có chắc chắn muốn tiếp tục ghi đè không?`;

  return {
    email,
    user_type,
    source,
    status_label,
    tab,
    active_packages,
    packages_text,
    confirm_message,
  };
}
