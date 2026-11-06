'use client';

import { CatalogGenreChips } from '@/components/catalog-chips';
import { parse_display_rate, rate_badge_class } from '@/lib/catalog/rate.mjs';

export function CatalogListItem({ catalog_item, on_open }) {
  const display_rate = parse_display_rate(catalog_item.rate);
  const quantity_text = catalog_item.qty && catalog_item.qty !== '-' ? catalog_item.qty : '';
  const author_name = String(catalog_item.author || '').trim();
  const updated_date = String(catalog_item.updated_at || '').trim();

  return (
    <button
      type="button"
      onClick={() => on_open(catalog_item)}
      className="group flex h-full w-full items-center gap-3.5 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md sm:gap-4 sm:p-4"
    >
      <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-16">
        {catalog_item.cover_url ? (
          // Sheet covers come from many CDNs; native img avoids next/image host allowlists.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={catalog_item.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top transition group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-zinc-400">
            Không có cover
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 group-hover:text-violet-600 sm:text-base">
            {catalog_item.title}
          </h3>
          {display_rate != null ? (
            <span
              className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${rate_badge_class(catalog_item.rate)}`}
            >
              ★ {catalog_item.rate}
            </span>
          ) : null}
          {catalog_item.status ? (
            <span className="inline-block shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {catalog_item.status}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
          {author_name ? (
            <span className="truncate font-medium text-zinc-700">
              {author_name}
            </span>
          ) : null}
          {quantity_text ? (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700">
              {quantity_text}
            </span>
          ) : null}
          {updated_date ? (
            <span className="text-zinc-400">
              Cập nhật: {updated_date}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <CatalogGenreChips genre_parts={catalog_item.genre_parts} limit={4} single_line />
        </div>
      </div>
    </button>
  );
}

