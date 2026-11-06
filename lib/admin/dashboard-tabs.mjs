export const ADMIN_HUB_LABEL = 'Quản trị';

export const ADMIN_DASHBOARD_TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'users', label: 'Danh sách user' },
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'event', label: 'Cài đặt event' },
];

const ADMIN_DASHBOARD_TAB_KEYS = new Set(ADMIN_DASHBOARD_TABS.map((tab_item) => tab_item.key));

export function resolve_admin_dashboard_tab(raw_tab) {
  const normalized_tab = String(raw_tab || '').trim();
  if (ADMIN_DASHBOARD_TAB_KEYS.has(normalized_tab)) return normalized_tab;
  return 'overview';
}

export function admin_dashboard_href(tab_key) {
  const resolved_tab = resolve_admin_dashboard_tab(tab_key);
  if (resolved_tab === 'overview') return '/admin';
  return `/admin?tab=${resolved_tab}`;
}
