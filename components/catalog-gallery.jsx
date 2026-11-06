'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CatalogCard } from '@/components/catalog-card';
import { CatalogListItem } from '@/components/catalog-list-item';
import { CatalogLightbox } from '@/components/catalog-lightbox';
import {
  apply_catalog_filters,
  collect_filter_options,
  has_active_column_filter,
} from '@/lib/catalog/filters.mjs';

const PAGE_CHUNK = 24;

const view_mode_listeners = new Set();
function notify_view_mode_change() {
  for (const listener of view_mode_listeners) listener();
}

function subscribe_view_mode(callback) {
  view_mode_listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    view_mode_listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function get_view_mode_snapshot() {
  try {
    const saved = localStorage.getItem('catalog_view_mode');
    return saved === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function get_view_mode_server_snapshot() {
  return 'grid';
}

function format_count(number) {
  return new Intl.NumberFormat('vi-VN').format(number);
}

function FilterSelect({ label, options, selected_values, on_change }) {
  const details_ref = useRef(null);
  const selected_set = new Set(selected_values);

  useEffect(() => {
    function on_pointer_down(event) {
      if (details_ref.current?.hasAttribute('open') && !details_ref.current.contains(event.target)) {
        details_ref.current.removeAttribute('open');
      }
    }

    function on_key_down(event) {
      if (event.key === 'Escape' && details_ref.current?.hasAttribute('open')) {
        details_ref.current.removeAttribute('open');
      }
    }

    document.addEventListener('pointerdown', on_pointer_down);
    document.addEventListener('keydown', on_key_down);
    return () => {
      document.removeEventListener('pointerdown', on_pointer_down);
      document.removeEventListener('keydown', on_key_down);
    };
  }, []);

  function toggle_value(option_value) {
    const next_values = selected_set.has(option_value)
      ? selected_values.filter((value) => value !== option_value)
      : [...selected_values, option_value];
    on_change(next_values);
  }

  return (
    <details ref={details_ref} className="relative">
      <summary className="cursor-pointer list-none rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400">
        {label}
        {selected_values.length ? ` (${selected_values.length})` : ''}
      </summary>
      <div className="absolute z-20 mt-2 max-h-64 w-56 overflow-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
        {options.length === 0 ? (
          <p className="px-2 py-1 text-xs text-zinc-500">Không có giá trị</p>
        ) : (
          options.map((option_value) => (
            <label
              key={option_value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={selected_set.has(option_value)}
                onChange={() => toggle_value(option_value)}
              />
              <span className="min-w-0 break-words">{option_value}</span>
            </label>
          ))
        )}
      </div>
    </details>
  );
}

export function CatalogGallery({
  initial_catalog,
}) {
  const [catalog_result, set_catalog_result] = useState(initial_catalog);
  const view_mode = useSyncExternalStore(
    subscribe_view_mode,
    get_view_mode_snapshot,
    get_view_mode_server_snapshot,
  );
  const [is_refreshing, set_is_refreshing] = useState(false);
  const [refresh_error, set_refresh_error] = useState('');
  const [search_query, set_search_query] = useState('');
  const [column_filters, set_column_filters] = useState({});
  const [page_state, set_page_state] = useState({ key: '||{}', count: PAGE_CHUNK });
  const [preview_item, set_preview_item] = useState(null);
  const sentinel_ref = useRef(null);

  function switch_view_mode(mode) {
    try {
      localStorage.setItem('catalog_view_mode', mode);
    } catch {
      // Ignore localStorage errors
    }
    notify_view_mode_change();
  }

  const catalog_items = useMemo(
    () => (catalog_result?.ok ? catalog_result.items : []),
    [catalog_result],
  );
  const can_see_link = Boolean(catalog_result?.can_see_link);

  const filtered_items = useMemo(
    () => apply_catalog_filters(catalog_items, search_query, column_filters),
    [catalog_items, search_query, column_filters],
  );
  const filter_options = useMemo(() => collect_filter_options(catalog_items), [catalog_items]);
  const filter_key = `${search_query}|${JSON.stringify(column_filters)}`;
  const visible_count = page_state.key === filter_key ? page_state.count : PAGE_CHUNK;
  const visible_items = filtered_items.slice(0, visible_count);

  useEffect(() => {
    const sentinel_node = sentinel_ref.current;
    if (!sentinel_node) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        set_page_state((current_state) => {
          const current_count =
            current_state.key === filter_key ? current_state.count : PAGE_CHUNK;
          return {
            key: filter_key,
            count: Math.min(current_count + PAGE_CHUNK, filtered_items.length),
          };
        });
      }
    });
    observer.observe(sentinel_node);
    return () => observer.disconnect();
  }, [filtered_items.length, filter_key]);

  function set_set_filter(filter_key, selected_values) {
    set_column_filters((previous_filters) => {
      const next_filters = { ...previous_filters };
      if (!selected_values.length) delete next_filters[filter_key];
      else next_filters[filter_key] = { kind: 'set', values: selected_values };
      return next_filters;
    });
  }

  function set_rate_filter(rate_text) {
    set_column_filters((previous_filters) => {
      const next_filters = { ...previous_filters };
      const parsed_rate = parseFloat(String(rate_text || '').replace(/,/g, ''));
      if (!String(rate_text || '').trim() || !Number.isFinite(parsed_rate)) {
        delete next_filters.rate;
      } else {
        next_filters.rate = { kind: 'rateCompare', op: 'gte', value: parsed_rate };
      }
      return next_filters;
    });
  }

  async function refresh_catalog() {
    set_is_refreshing(true);
    set_refresh_error('');
    try {
      const response = await fetch('/api/catalog', { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        set_refresh_error(body?.error || 'Không làm mới được catalog.');
        return;
      }
      set_catalog_result(body);
    } catch {
      set_refresh_error('Không làm mới được catalog.');
    } finally {
      set_is_refreshing(false);
    }
  }

  const is_filtered = Boolean(search_query || has_active_column_filter(column_filters));
  const selected_status = column_filters.status?.kind === 'set' ? column_filters.status.values : [];
  const selected_genre = column_filters.genre?.kind === 'set' ? column_filters.genre.values : [];
  const rate_value =
    column_filters.rate?.kind === 'rateCompare' && Number.isFinite(column_filters.rate.value)
      ? String(column_filters.rate.value)
      : '';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Danh sách truyện</h1>
          {catalog_result?.ok ? (
            <p className="mt-1.5 text-sm text-zinc-500">
              {is_filtered ? (
                <>
                  Tìm thấy <span className="font-semibold text-zinc-800">{format_count(filtered_items.length)}</span> / {format_count(catalog_items.length)} bộ truyện
                </>
              ) : (
                <>
                  Tổng cộng <span className="font-semibold text-zinc-800">{format_count(catalog_items.length)}</span> bộ truyện
                </>
              )}
            </p>
          ) : null}
          {refresh_error ? <p className="mt-1 text-xs text-red-600">{refresh_error}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => switch_view_mode('grid')}
              aria-label="Xem dạng lưới"
              title="Xem dạng lưới"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                view_mode === 'grid'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => switch_view_mode('list')}
              aria-label="Xem dạng danh sách"
              title="Xem dạng danh sách"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                view_mode === 'list'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={refresh_catalog}
            disabled={is_refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:border-zinc-400 disabled:opacity-50"
          >
            <span className={is_refreshing ? 'inline-block animate-spin' : ''} aria-hidden>
              ↻
            </span>
            {is_refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          type="search"
          value={search_query}
          onChange={(event) => set_search_query(event.target.value)}
          placeholder="Tìm tên, tác giả, thể loại…"
          className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:border-zinc-400"
          aria-label="Tìm kiếm catalog"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Thể loại"
            options={filter_options.genre}
            selected_values={selected_genre}
            on_change={(values) => set_set_filter('genre', values)}
          />
          <FilterSelect
            label="Status"
            options={filter_options.status}
            selected_values={selected_status}
            on_change={(values) => set_set_filter('status', values)}
          />
          <label className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
            Rate ≥
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={rate_value}
              onChange={(event) => set_rate_filter(event.target.value)}
              placeholder="8"
              className="w-16 border-0 bg-transparent text-sm outline-none"
            />
          </label>
          {is_filtered ? (
            <button
              type="button"
              onClick={() => {
                set_search_query('');
                set_column_filters({});
              }}
              className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
            >
              Xóa lọc
            </button>
          ) : null}
        </div>
      </div>

      {!catalog_result?.ok ? (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {catalog_result?.error || 'Chưa tải được danh sách truyện. Kiểm tra GOOGLE_SERVICE_ACCOUNT_JSON trên server.'}
        </p>
      ) : null}

      {catalog_result?.ok && filtered_items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Không có truyện khớp bộ lọc.</p>
      ) : null}

      {view_mode === 'grid' ? (
        <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible_items.map((catalog_item) => (
            <CatalogCard
              key={catalog_item.id}
              catalog_item={catalog_item}
              on_open={set_preview_item}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
          {visible_items.map((catalog_item) => (
            <CatalogListItem
              key={catalog_item.id}
              catalog_item={catalog_item}
              on_open={set_preview_item}
            />
          ))}
        </div>
      )}

      {visible_count < filtered_items.length ? (
        <div ref={sentinel_ref} className="h-10" aria-hidden />
      ) : filtered_items.length > 0 ? (
        <p className="mt-6 text-center text-xs text-zinc-500">
          {format_count(filtered_items.length)} truyện
        </p>
      ) : null}

      {preview_item ? (
        <CatalogLightbox
          catalog_item={preview_item}
          can_see_link={can_see_link}
          on_close={() => set_preview_item(null)}
        />
      ) : null}
    </div>
  );
}
