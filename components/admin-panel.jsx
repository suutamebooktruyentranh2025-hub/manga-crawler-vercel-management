'use client';

import { Fragment, useMemo, useState } from 'react';
import { USER_TYPE_OPTIONS, format_vi_date } from '@/lib/ui/format';
import { filter_admin_rows } from '@/lib/admin/filter-rows.mjs';
import {
  isEntitlementActive,
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
} from '@/lib/account/entitlements.mjs';
import {
  find_existing_user,
  build_existing_user_warning,
} from '@/lib/admin/existing-user-warning.mjs';

const SORT_DEFAULT_DIR = {
  email: 'asc',
  user_type: 'asc',
  created_at: 'desc',
  last_login_at: 'desc',
  remaining_tokens: 'desc',
  added_at: 'desc',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const REMOVE_ENABLED = false;
const PACKAGE_FIELDS = [
  { key: PACKAGE_APP, label: 'Gói App' },
  { key: PACKAGE_CATALOG_Y1, label: 'Gói Truyện (năm 1)' },
  { key: PACKAGE_CATALOG_Y2, label: 'Năm 2' },
];

function paginate_rows(rows, page_index, page_size) {
  const total_count = rows.length;
  const total_pages = Math.max(1, Math.ceil(total_count / page_size));
  const safe_page = Math.min(Math.max(page_index, 1), total_pages);
  const start_index = (safe_page - 1) * page_size;
  return {
    page_rows: rows.slice(start_index, start_index + page_size),
    total_count,
    total_pages,
    safe_page,
  };
}

function parse_sort_time(value) {
  const parsed_time = Date.parse(value || '');
  return Number.isNaN(parsed_time) ? 0 : parsed_time;
}

function token_sort_value(row) {
  if (!should_show_tokens(row)) return Number.POSITIVE_INFINITY;
  return Number(row.remaining_tokens ?? 0);
}

function entitlement_map(row) {
  const package_map = new Map();
  for (const entitlement_row of row.entitlements || []) {
    package_map.set(entitlement_row.packageKey, entitlement_row);
  }
  return package_map;
}

function has_active_package(row, package_key) {
  return (row.entitlements || []).some(
    (entitlement_row) =>
      entitlement_row.packageKey === package_key && isEntitlementActive(entitlement_row),
  );
}

function should_show_tokens(row) {
  return row.user_type !== 'Admin' && !has_active_package(row, PACKAGE_APP);
}

function format_vi_datetime(value) {
  if (!value) return '—';
  const parsed_date = new Date(value);
  if (Number.isNaN(parsed_date.getTime())) return '—';
  return parsed_date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function format_badge_date(value) {
  if (!value) return '';
  const parsed_date = new Date(value);
  if (Number.isNaN(parsed_date.getTime())) return '';
  return parsed_date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function is_row_form_dirty(row, current_form) {
  return JSON.stringify(current_form) !== JSON.stringify(create_row_form(row));
}

function format_package_expiry(package_key, expires_at, is_existing_grant = false) {
  if (!expires_at) {
    if (is_existing_grant) return 'Vĩnh viễn';
    return package_key === PACKAGE_APP ? 'Vĩnh viễn' : '+1 năm';
  }
  return format_vi_datetime(expires_at);
}

function resolve_empty_package_label(package_key, current_entitlement) {
  if (package_key === PACKAGE_APP) return 'Vĩnh viễn';
  const current_expiry = current_entitlement?.expiresAt ?? current_entitlement?.expires_at;
  if (current_entitlement && (current_expiry == null || current_expiry === '')) {
    return 'Vĩnh viễn';
  }
  return '+1 năm';
}

function to_local_input_value(iso_value) {
  if (!iso_value) return '';
  const parsed_date = new Date(iso_value);
  if (Number.isNaN(parsed_date.getTime())) return '';
  const offset_time = parsed_date.getTime() - parsed_date.getTimezoneOffset() * 60_000;
  return new Date(offset_time).toISOString().slice(0, 16);
}

function create_empty_form() {
  return {
    is_admin: false,
    packages: {
      [PACKAGE_APP]: { enabled: false, expires_at: '' },
      [PACKAGE_CATALOG_Y1]: { enabled: false, expires_at: '' },
      [PACKAGE_CATALOG_Y2]: { enabled: false, expires_at: '' },
    },
  };
}

function create_row_form(row) {
  const current_form = create_empty_form();
  const package_map = entitlement_map(row);
  for (const package_field of PACKAGE_FIELDS) {
    const entitlement_row = package_map.get(package_field.key);
    if (!entitlement_row) continue;
    current_form.packages[package_field.key] = {
      enabled: true,
      expires_at: to_local_input_value(entitlement_row.expiresAt),
    };
  }
  current_form.is_admin = row.user_type === 'Admin';
  return current_form;
}

function build_request_body(email, current_form) {
  const package_body = {};
  for (const package_field of PACKAGE_FIELDS) {
    const package_form = current_form.packages[package_field.key];
    package_body[package_field.key] = {
      enabled: package_form.enabled,
      expires_at: package_form.enabled ? package_form.expires_at || null : null,
    };
  }
  return {
    email,
    isAdmin: current_form.is_admin,
    packages: package_body,
  };
}

function compare_logged_in_rows(left_row, right_row, sort_key) {
  if (sort_key === 'email') {
    return left_row.email.localeCompare(right_row.email, 'vi', { sensitivity: 'base' });
  }
  if (sort_key === 'user_type') {
    return USER_TYPE_OPTIONS.indexOf(left_row.user_type) - USER_TYPE_OPTIONS.indexOf(right_row.user_type);
  }
  if (sort_key === 'created_at' || sort_key === 'last_login_at' || sort_key === 'added_at') {
    return parse_sort_time(left_row[sort_key]) - parse_sort_time(right_row[sort_key]);
  }
  if (sort_key === 'remaining_tokens') {
    return token_sort_value(left_row) - token_sort_value(right_row);
  }
  return 0;
}

function sort_table_rows(rows, sort_key, sort_dir) {
  const sort_sign = sort_dir === 'desc' ? -1 : 1;
  return [...rows].sort((left_row, right_row) => {
    const compared = compare_logged_in_rows(left_row, right_row, sort_key);
    if (compared !== 0) return compared * sort_sign;
    return left_row.email.localeCompare(right_row.email, 'vi', { sensitivity: 'base' });
  });
}

function SortHeader({ label, column_key, sort_key, sort_dir, onSort }) {
  const is_active = sort_key === column_key;
  const aria_sort = is_active ? (sort_dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th className="px-4 py-3 font-medium" aria-sort={aria_sort}>
      <button
        type="button"
        onClick={() => onSort(column_key)}
        className="inline-flex items-center gap-1 text-left hover:text-zinc-900"
      >
        {label}
        <span aria-hidden="true" className={is_active ? 'text-zinc-900' : 'text-zinc-300'}>
          {is_active ? (sort_dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

function PaginationBar({ total_count, page_index, page_size, onPageChange, onPageSizeChange }) {
  const total_pages = Math.max(1, Math.ceil(total_count / page_size));
  const safe_page = Math.min(Math.max(page_index, 1), total_pages);
  const start_item = total_count === 0 ? 0 : (safe_page - 1) * page_size + 1;
  const end_item = Math.min(safe_page * page_size, total_count);

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        {total_count === 0 ? 'Không có kết quả' : `${start_item}–${end_item} / ${total_count}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Mỗi trang</span>
          <select
            value={page_size}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-zinc-300 bg-white px-2"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={safe_page <= 1}
          onClick={() => onPageChange(safe_page - 1)}
          className="min-h-10 rounded-lg border border-zinc-300 px-3 hover:bg-zinc-50 disabled:opacity-50"
        >
          Trước
        </button>
        <span className="px-1">
          Trang {safe_page}/{total_pages}
        </span>
        <button
          type="button"
          disabled={safe_page >= total_pages}
          onClick={() => onPageChange(safe_page + 1)}
          className="min-h-10 rounded-lg border border-zinc-300 px-3 hover:bg-zinc-50 disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function IconApp({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <rect x="4" y="1.5" width="8" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="12.2" r="0.7" fill="currentColor" />
    </svg>
  );
}

function IconCatalogY1({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M3 3.2h8.2A1.8 1.8 0 0 1 13 5v8.2H4.8A1.8 1.8 0 0 1 3 11.4V3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M5.2 6h5.2M5.2 8.4h3.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function IconCatalogY2({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M3 3.2h8.2A1.8 1.8 0 0 1 13 5v8.2H4.8A1.8 1.8 0 0 1 3 11.4V3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <text x="8" y="10.2" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
        2
      </text>
    </svg>
  );
}

function IconAdmin({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 1.8 13 3.6v4.1c0 3.2-2.1 5.2-5 6.5-2.9-1.3-5-3.3-5-6.5V3.6L8 1.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function package_icon(package_key) {
  if (package_key === 'admin') return IconAdmin;
  if (package_key === PACKAGE_APP) return IconApp;
  if (package_key === PACKAGE_CATALOG_Y1) return IconCatalogY1;
  return IconCatalogY2;
}

function GrantBadges({ current_form, current_row, is_dirty = false }) {
  const badge_items = [];
  if (current_form.is_admin) {
    badge_items.push({
      key: 'admin',
      title: 'Admin',
      icon_key: 'admin',
      expiry_short: '',
      tone: 'admin',
    });
  }
  for (const package_field of PACKAGE_FIELDS) {
    const package_form = current_form.packages[package_field.key];
    if (!package_form.enabled) continue;
    const current_entitlement = current_row
      ? entitlement_map(current_row).get(package_field.key) || null
      : null;
    const expiry_label = package_form.expires_at
      ? format_badge_date(package_form.expires_at)
      : resolve_empty_package_label(package_field.key, current_entitlement);
    const is_lifetime = expiry_label === 'Vĩnh viễn';
    badge_items.push({
      key: package_field.key,
      title: `${package_field.label} · ${expiry_label}`,
      icon_key: package_field.key,
      expiry_short: is_lifetime ? '' : expiry_label,
      tone: 'package',
    });
  }

  if (badge_items.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-zinc-400">Không có gói</span>
        {is_dirty ? <span className="text-xs text-amber-700">Chưa lưu</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badge_items.map((badge_item) => {
        const IconComponent = package_icon(badge_item.icon_key);
        return (
          <span
            key={badge_item.key}
            title={badge_item.title}
            aria-label={badge_item.title}
            className={
              badge_item.tone === 'admin'
                ? 'inline-flex items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-1 text-white'
                : 'inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-1 text-zinc-700'
            }
          >
            <IconComponent className="h-4 w-4" />
            {badge_item.expiry_short ? (
              <span className="text-[10px] font-medium leading-none">{badge_item.expiry_short}</span>
            ) : null}
          </span>
        );
      })}
      {is_dirty ? <span className="text-xs text-amber-700">Chưa lưu</span> : null}
    </div>
  );
}

function GrantEditor({
  current_form,
  disabled,
  onTogglePackage,
  onChangeExpiry,
  current_row,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
      {PACKAGE_FIELDS.map((package_field) => {
        const package_form = current_form.packages[package_field.key];
        const current_entitlement = current_row
          ? entitlement_map(current_row).get(package_field.key) || null
          : null;
        const empty_label = resolve_empty_package_label(package_field.key, current_entitlement);
        return (
          <div
            key={package_field.key}
            className="min-w-[12.5rem] flex-1 rounded-lg border border-zinc-200 px-3 py-2"
          >
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={package_form.enabled}
                disabled={disabled}
                onChange={(event) => onTogglePackage(package_field.key, event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span>{package_field.label}</span>
            </label>
            <input
              type="datetime-local"
              value={package_form.expires_at}
              disabled={disabled || !package_form.enabled}
              onChange={(event) => onChangeExpiry(package_field.key, event.target.value)}
              className="mt-1.5 min-h-9 w-full rounded-md border border-zinc-300 px-2 text-xs disabled:bg-zinc-50"
            />
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Trống = {empty_label}
              {current_row && has_active_package(current_row, package_field.key)
                ? ` · Hiện tại: ${format_package_expiry(
                    package_field.key,
                    current_entitlement?.expiresAt ?? null,
                    true,
                  )}`
                : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function AdminPanel({
  initial_logged_in,
  initial_pending,
  user_type_filter: user_type_filter_prop,
  onUserTypeFilterChange,
  onListsChange,
}) {
  const [active_tab, set_active_tab] = useState('logged_in');
  const [logged_in, set_logged_in] = useState(initial_logged_in);
  const [pending, set_pending] = useState(initial_pending);
  const [search_query, set_search_query] = useState('');
  const [internal_user_type_filter, set_internal_user_type_filter] = useState('');
  const is_filter_controlled = typeof onUserTypeFilterChange === 'function';
  const user_type_filter = is_filter_controlled
    ? user_type_filter_prop ?? ''
    : internal_user_type_filter;
  const [logged_in_sort_key, set_logged_in_sort_key] = useState('created_at');
  const [logged_in_sort_dir, set_logged_in_sort_dir] = useState('desc');
  const [pending_sort_key, set_pending_sort_key] = useState('added_at');
  const [pending_sort_dir, set_pending_sort_dir] = useState('desc');
  const [logged_in_page, set_logged_in_page] = useState(1);
  const [pending_page, set_pending_page] = useState(1);
  const [page_size, set_page_size] = useState(50);
  const [new_email, set_new_email] = useState('');
  const [new_form, set_new_form] = useState(create_empty_form);
  const [draft_map, set_draft_map] = useState({});
  const [busy_email, set_busy_email] = useState('');
  const [editing_email, set_editing_email] = useState('');
  const [status_text, set_status_text] = useState('');
  const [error_text, set_error_text] = useState('');

  const existing_user_warning = useMemo(() => {
    const user = find_existing_user({ logged_in, pending }, new_email);
    return build_existing_user_warning({ user });
  }, [logged_in, pending, new_email]);

  const visible_logged_in = useMemo(
    () =>
      sort_table_rows(
        filter_admin_rows(logged_in, { search_query, user_type: user_type_filter }),
        logged_in_sort_key,
        logged_in_sort_dir,
      ),
    [logged_in, search_query, user_type_filter, logged_in_sort_key, logged_in_sort_dir],
  );
  const visible_pending = useMemo(
    () =>
      sort_table_rows(
        filter_admin_rows(pending, { search_query, user_type: user_type_filter }),
        pending_sort_key,
        pending_sort_dir,
      ),
    [pending, search_query, user_type_filter, pending_sort_key, pending_sort_dir],
  );

  const [applied_user_type_filter, set_applied_user_type_filter] = useState(user_type_filter);
  if (applied_user_type_filter !== user_type_filter) {
    set_applied_user_type_filter(user_type_filter);
    set_logged_in_page(1);
    set_pending_page(1);
    if (is_filter_controlled && user_type_filter) {
      set_active_tab('logged_in');
    }
  }

  async function refresh_lists() {
    const response = await fetch('/api/admin/users');
    const body = await response.json();
    if (!response.ok || !body?.ok) {
      throw new Error(body?.error || `HTTP ${response.status}`);
    }
    set_logged_in(body.logged_in || []);
    set_pending(body.pending || []);
    onListsChange?.(body.logged_in || []);
  }

  async function run_action(busy_key, action) {
    set_busy_email(busy_key);
    set_error_text('');
    set_status_text('');
    try {
      await action();
      await refresh_lists();
      set_draft_map({});
      set_editing_email('');
    } catch (error) {
      set_error_text(String(error?.message || error));
    } finally {
      set_busy_email('');
    }
  }

  function read_form(row) {
    return draft_map[row.email] || create_row_form(row);
  }

  function update_row_form(email, updater) {
    set_draft_map((current_map) => {
      const current_form = current_map[email] || create_row_form(
        [...logged_in, ...pending].find((row) => row.email === email) || { user_type: 'Free', entitlements: [] },
      );
      return {
        ...current_map,
        [email]: updater(current_form),
      };
    });
  }

  function toggle_row_editor(email) {
    set_editing_email((current_email) => (current_email === email ? '' : email));
  }

  function cancel_row_editor(email) {
    set_draft_map((current_map) => {
      const next_map = { ...current_map };
      delete next_map[email];
      return next_map;
    });
    set_editing_email('');
  }

  async function save_user(email, current_form) {
    await run_action(email, async () => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(build_request_body(email, current_form)),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      set_status_text(`Đã cập nhật ${body.email} → ${body.user_type}`);
    });
  }

  async function remove_user(email) {
    if (!REMOVE_ENABLED) return;
    const confirmed = window.confirm(
      `Remove ${email}? Họ sẽ về Free và bị xóa khỏi allowlist.`,
    );
    if (!confirmed) return;
    await run_action(email, async () => {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      set_status_text(`Đã remove ${body.email}`);
    });
  }

  function handle_edit_existing_user(existing_warning) {
    if (!existing_warning) return;
    set_active_tab(existing_warning.tab);
    if (user_type_filter && user_type_filter !== existing_warning.user_type) {
      change_user_type_filter('');
    }
    set_search_query(existing_warning.email);
    set_editing_email(existing_warning.email);
    if (existing_warning.tab === 'logged_in') {
      set_logged_in_page(1);
    } else {
      set_pending_page(1);
    }
    set_new_email('');
    set_new_form(create_empty_form());
  }

  async function add_user(event) {
    event.preventDefault();
    if (existing_user_warning) {
      const confirmed = window.confirm(existing_user_warning.confirm_message);
      if (!confirmed) return;
    }
    await save_user(new_email, new_form);
    set_new_email('');
    set_new_form(create_empty_form());
  }

  function toggle_sort(column_key) {
    const is_logged_in_tab = active_tab === 'logged_in';
    const current_sort_key = is_logged_in_tab ? logged_in_sort_key : pending_sort_key;
    const set_sort_key = is_logged_in_tab ? set_logged_in_sort_key : set_pending_sort_key;
    const set_sort_dir = is_logged_in_tab ? set_logged_in_sort_dir : set_pending_sort_dir;
    if (current_sort_key === column_key) {
      set_sort_dir((current_dir) => (current_dir === 'asc' ? 'desc' : 'asc'));
    } else {
      set_sort_key(column_key);
      set_sort_dir(SORT_DEFAULT_DIR[column_key]);
    }
    if (is_logged_in_tab) set_logged_in_page(1);
    else set_pending_page(1);
  }

  function change_search_query(next_query) {
    set_search_query(next_query);
    set_logged_in_page(1);
    set_pending_page(1);
  }

  function change_user_type_filter(next_user_type) {
    if (is_filter_controlled) onUserTypeFilterChange(next_user_type);
    else set_internal_user_type_filter(next_user_type);
    set_logged_in_page(1);
    set_pending_page(1);
  }

  function change_page_size(next_size) {
    set_page_size(next_size);
    set_logged_in_page(1);
    set_pending_page(1);
  }

  function grant_editor_props(row) {
    return {
      current_form: read_form(row),
      current_row: row,
      disabled: busy_email === row.email,
      onTogglePackage: (package_key, checked_value) =>
        update_row_form(row.email, (current_form) => ({
          ...current_form,
          packages: {
            ...current_form.packages,
            [package_key]: {
              ...current_form.packages[package_key],
              enabled: checked_value,
            },
          },
        })),
      onChangeExpiry: (package_key, next_value) =>
        update_row_form(row.email, (current_form) => ({
          ...current_form,
          packages: {
            ...current_form.packages,
            [package_key]: {
              ...current_form.packages[package_key],
              expires_at: next_value,
            },
          },
        })),
    };
  }

  const current_rows = active_tab === 'logged_in' ? visible_logged_in : visible_pending;
  const current_sort_key = active_tab === 'logged_in' ? logged_in_sort_key : pending_sort_key;
  const current_sort_dir = active_tab === 'logged_in' ? logged_in_sort_dir : pending_sort_dir;
  const current_page = active_tab === 'logged_in' ? logged_in_page : pending_page;
  const pagination = paginate_rows(current_rows, current_page, page_size);

  return (
    <div className="space-y-6">
      <form
        onSubmit={add_user}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Email</span>
            <input
              type="email"
              required
              value={new_email}
              onChange={(event) => set_new_email(event.target.value)}
              placeholder="user@gmail.com"
              className={`min-h-10 rounded-lg border px-3 transition-colors ${
                existing_user_warning
                  ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                  : 'border-zinc-300'
              }`}
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busy_email)}
            className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
              existing_user_warning
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            }`}
          >
            {existing_user_warning ? 'Ghi đè user' : 'Thêm user'}
          </button>
        </div>

        {existing_user_warning ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-sm text-amber-900 shadow-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base leading-none text-amber-600 mt-0.5 shrink-0" aria-hidden="true">
                  ⚠️
                </span>
                <div className="space-y-1 min-w-0">
                  <p className="font-medium text-amber-950">
                    User <span className="font-bold underline">{existing_user_warning.email}</span> đã tồn tại trong hệ thống ({existing_user_warning.status_label}).
                  </p>
                  <p className="text-xs text-amber-900">
                    Hạng hiện tại: <span className="font-semibold">{existing_user_warning.user_type}</span>
                    {existing_user_warning.active_packages.length > 0 ? (
                      <> · Gói đang có: <span className="font-semibold">{existing_user_warning.packages_text}</span></>
                    ) : (
                      <> · <span className="italic text-amber-800">Chưa kích hoạt gói nào</span></>
                    )}
                  </p>
                  <p className="text-xs text-amber-800">
                    Thao tác &quot;Ghi đè user&quot; sẽ <strong>thay thế toàn bộ</strong> gói và hạng hiện tại theo cấu hình bên dưới.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handle_edit_existing_user(existing_user_warning)}
                className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-lg border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-950 shadow-xs hover:bg-amber-100 transition-colors"
              >
                Chuyển đến sửa user này
              </button>
            </div>
          </div>
        ) : null}
        <GrantEditor
          current_form={new_form}
          disabled={Boolean(busy_email)}
          onTogglePackage={(package_key, checked_value) =>
            set_new_form((current_form) => ({
              ...current_form,
              packages: {
                ...current_form.packages,
                [package_key]: {
                  ...current_form.packages[package_key],
                  enabled: checked_value,
                },
              },
            }))
          }
          onChangeExpiry={(package_key, next_value) =>
            set_new_form((current_form) => ({
              ...current_form,
              packages: {
                ...current_form.packages,
                [package_key]: {
                  ...current_form.packages[package_key],
                  expires_at: next_value,
                },
              },
            }))
          }
        />
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-zinc-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => set_active_tab('logged_in')}
            className={`rounded-full px-4 py-2 ${active_tab === 'logged_in' ? 'bg-white shadow-sm' : 'text-zinc-600'}`}
          >
            Đã login ({logged_in.length})
          </button>
          <button
            type="button"
            onClick={() => set_active_tab('pending')}
            className={`rounded-full px-4 py-2 ${active_tab === 'pending' ? 'bg-white shadow-sm' : 'text-zinc-600'}`}
          >
            Chờ login ({pending.length})
          </button>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-xl sm:flex-row">
          <label className="flex min-w-[11rem] flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Hạng hiển thị</span>
            <select
              value={user_type_filter}
              onChange={(event) => change_user_type_filter(event.target.value)}
              className="min-h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Tất cả hạng</option>
              {USER_TYPE_OPTIONS.map((user_type) => (
                <option key={user_type} value={user_type}>
                  {user_type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Tìm kiếm</span>
            <input
              type="search"
              value={search_query}
              onChange={(event) => change_search_query(event.target.value)}
              placeholder="Tìm email, hạng hoặc token"
              className="min-h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
        </div>
      </div>

      {status_text ? <p className="text-sm text-emerald-700">{status_text}</p> : null}
      {error_text ? <p className="text-sm text-red-600">{error_text}</p> : null}

      <div className="rounded-2xl border border-zinc-200 bg-white">
        <PaginationBar
          total_count={pagination.total_count}
          page_index={pagination.safe_page}
          page_size={page_size}
          onPageChange={active_tab === 'logged_in' ? set_logged_in_page : set_pending_page}
          onPageSizeChange={change_page_size}
        />
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              {active_tab === 'logged_in' ? (
                <>
                  <SortHeader
                    label="Email"
                    column_key="email"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Hạng hiển thị"
                    column_key="user_type"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Ngày đăng ký"
                    column_key="created_at"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Last login"
                    column_key="last_login_at"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Token"
                    column_key="remaining_tokens"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                </>
              ) : (
                <>
                  <SortHeader
                    label="Email"
                    column_key="email"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Hạng hiển thị"
                    column_key="user_type"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                  <SortHeader
                    label="Ngày add"
                    column_key="added_at"
                    sort_key={current_sort_key}
                    sort_dir={current_sort_dir}
                    onSort={toggle_sort}
                  />
                </>
              )}
              <th className="px-4 py-3 font-medium">Quyền truy cập</th>
              <th className="px-4 py-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagination.page_rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-zinc-500"
                  colSpan={(active_tab === 'logged_in' ? 7 : 5) + (REMOVE_ENABLED ? 1 : 0)}
                >
                  {search_query.trim() || user_type_filter
                    ? 'Không tìm thấy user khớp.'
                    : 'Không có user nào.'}
                </td>
              </tr>
            ) : (
              pagination.page_rows.map((row) => {
                const current_form = read_form(row);
                const is_editing = editing_email === row.email;
                const is_dirty = is_row_form_dirty(row, current_form);
                const column_count = (active_tab === 'logged_in' ? 7 : 5) + (REMOVE_ENABLED ? 1 : 0);
                return (
                  <Fragment key={row.email}>
                    <tr className="border-t border-zinc-100">
                      <td className="px-4 py-3 font-medium text-zinc-900">{row.email}</td>
                      <td className="px-4 py-3 text-zinc-700">{row.user_type}</td>
                      {active_tab === 'logged_in' ? (
                        <>
                          <td className="px-4 py-3 text-zinc-600">{format_vi_date(row.created_at)}</td>
                          <td className="px-4 py-3 text-zinc-600">{format_vi_date(row.last_login_at)}</td>
                          <td className="px-4 py-3 text-zinc-600">
                            {should_show_tokens(row) ? (row.remaining_tokens ?? 0) : '—'}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-3 text-zinc-600">{format_vi_date(row.added_at)}</td>
                      )}
                      <td className="px-4 py-3">
                        <GrantBadges
                          current_form={current_form}
                          current_row={row}
                          is_dirty={is_dirty}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy_email === row.email}
                            onClick={() => toggle_row_editor(row.email)}
                            className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {is_editing ? 'Đóng' : 'Sửa'}
                          </button>
                          {REMOVE_ENABLED ? (
                            <button
                              type="button"
                              disabled={busy_email === row.email}
                              onClick={() => remove_user(row.email)}
                              className="min-h-9 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {is_editing ? (
                      <tr className="border-t border-zinc-100 bg-zinc-50/80">
                        <td className="px-4 py-3" colSpan={column_count}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <div className="min-w-0 flex-1">
                              <GrantEditor {...grant_editor_props(row)} />
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                disabled={busy_email === row.email}
                                onClick={() => save_user(row.email, current_form)}
                                className="min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                disabled={busy_email === row.email}
                                onClick={() => cancel_row_editor(row.email)}
                                className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-white disabled:opacity-60"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
