'use client';

import { CatalogGenreChips, CatalogMetaChips } from '@/components/catalog-chips';

export function CatalogCard({ catalog_item, on_open }) {
  return (
    <button
      type="button"
      onClick={() => on_open(catalog_item)}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-zinc-100">
        {catalog_item.cover_url ? (
          // Sheet covers come from many CDNs; native img avoids next/image host allowlists.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={catalog_item.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">Không có cover</div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-zinc-900">
          {catalog_item.title}
        </h3>
        <CatalogMetaChips catalog_item={catalog_item} reserve_empty_rows />
        <div className="mt-auto min-w-0">
          <CatalogGenreChips genre_parts={catalog_item.genre_parts} limit={3} single_line />
        </div>
      </div>
    </button>
  );
}
