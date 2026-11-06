'use client';

import { parse_display_rate, rate_badge_class } from '@/lib/catalog/rate.mjs';

function CatalogChip({ children, tone = 'muted', className = '', title }) {
  const tone_class = {
    author: 'bg-zinc-100 font-medium text-zinc-800',
    muted: 'bg-zinc-100 text-zinc-700',
    outline: 'border border-zinc-200 text-zinc-600',
    plain: '',
  }[tone];

  return (
    <span
      title={title}
      className={`inline-block w-fit max-w-full shrink-0 truncate rounded-full px-2.5 py-1 text-xs ${tone_class || ''} ${className}`}
    >
      {children}
    </span>
  );
}

export function CatalogMetaChips({ catalog_item, reserve_empty_rows = false }) {
  const display_rate = parse_display_rate(catalog_item.rate);
  const quantity_text = catalog_item.qty && catalog_item.qty !== '-' ? catalog_item.qty : '';
  const author_name = String(catalog_item.author || '').trim();
  const empty_row = reserve_empty_rows ? <div className="h-6" aria-hidden /> : null;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {author_name ? (
        <div className="min-w-0">
          <CatalogChip tone="author" title={author_name}>
            {author_name}
          </CatalogChip>
        </div>
      ) : (
        empty_row
      )}
      <div className="flex min-h-6 min-w-0 flex-nowrap gap-1.5 overflow-hidden">
        {display_rate != null ? (
          <CatalogChip tone="plain" className={`font-semibold ${rate_badge_class(catalog_item.rate)}`}>
            ★ {catalog_item.rate}
          </CatalogChip>
        ) : null}
        {quantity_text ? <CatalogChip>{quantity_text}</CatalogChip> : null}
      </div>
      {catalog_item.status ? (
        <div className="min-w-0">
          <CatalogChip title={catalog_item.status}>{catalog_item.status}</CatalogChip>
        </div>
      ) : (
        empty_row
      )}
    </div>
  );
}

export function CatalogGenreChips({ genre_parts, limit, single_line = false }) {
  const visible_genres = Array.isArray(genre_parts) ? genre_parts : [];
  const shown_genres = Number.isFinite(limit) ? visible_genres.slice(0, limit) : visible_genres;
  if (shown_genres.length === 0) return null;

  return (
    <div className={`flex gap-1 ${single_line ? 'flex-nowrap overflow-hidden' : 'flex-wrap'}`}>
      {shown_genres.map((genre_name) => (
        <CatalogChip key={genre_name} tone="outline">
          {genre_name}
        </CatalogChip>
      ))}
    </div>
  );
}
