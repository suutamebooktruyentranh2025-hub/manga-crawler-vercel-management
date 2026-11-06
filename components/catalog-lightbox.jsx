'use client';

import { useEffect, useState } from 'react';
import { is_google_drive_url, is_http_url } from '@/lib/catalog/sheet-cells.mjs';
import { CatalogGenreChips, CatalogMetaChips } from '@/components/catalog-chips';

export function CatalogLightbox({ catalog_item, can_see_link, on_close }) {
  const card_cover_url = String(catalog_item?.cover_url || '');
  const [preview_cover_url, set_preview_cover_url] = useState(card_cover_url);
  const [prev_cover_url, set_prev_cover_url] = useState(card_cover_url);
  const [is_cover_loaded, set_is_cover_loaded] = useState(false);

  if (card_cover_url !== prev_cover_url) {
    set_prev_cover_url(card_cover_url);
    set_preview_cover_url(card_cover_url);
    set_is_cover_loaded(false);
  }

  useEffect(() => {
    function on_key_down(event) {
      if (event.key === 'Escape') on_close();
    }
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', on_key_down);
    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener('keydown', on_key_down);
    };
  }, [on_close]);

  useEffect(() => {
    const large_cover_url = card_cover_url.replace(/sz=w\d+/, 'sz=w1600');
    if (!card_cover_url || large_cover_url === card_cover_url) return undefined;
    const preload_image = new window.Image();
    preload_image.onload = () => set_preview_cover_url(large_cover_url);
    preload_image.src = large_cover_url;
    return () => {
      preload_image.onload = null;
    };
  }, [card_cover_url]);

  if (!catalog_item) return null;

  const download_url = can_see_link ? String(catalog_item.download_url || '').trim() : '';
  const show_download = can_see_link && is_http_url(download_url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6"
      onClick={on_close}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={on_close}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-700 shadow hover:bg-white"
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="relative flex max-h-[48vh] min-h-[240px] w-full items-center justify-center bg-zinc-950 md:max-h-[92vh] md:min-h-[560px] md:w-[46%] md:shrink-0">
          {preview_cover_url ? (
            <>
              {is_cover_loaded ? null : (
                <div className="absolute inset-0 animate-pulse bg-zinc-800" aria-hidden />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview_cover_url}
                alt=""
                onLoad={() => set_is_cover_loaded(true)}
                onError={() => {
                  if (preview_cover_url !== card_cover_url) {
                    set_preview_cover_url(card_cover_url);
                    return;
                  }
                  set_is_cover_loaded(true);
                }}
                className={`h-full max-h-[48vh] w-full object-contain md:max-h-[92vh] ${
                  is_cover_loaded ? 'opacity-100' : 'opacity-0'
                }`}
                referrerPolicy="no-referrer"
              />
            </>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-zinc-400">
              Không có cover
            </div>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-5 sm:p-6">
          <h2 className="pr-8 text-lg font-semibold text-zinc-900">{catalog_item.title}</h2>
          <CatalogMetaChips catalog_item={catalog_item} />
          <CatalogGenreChips genre_parts={catalog_item.genre_parts} />
          {catalog_item.description ? (
            <p className="whitespace-pre-wrap border-l-2 border-zinc-300 pl-3 text-sm leading-6 text-zinc-700">
              {catalog_item.description}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Chưa có mô tả.</p>
          )}
          {show_download ? (
            <div className="mt-auto pt-2">
              <a
                href={download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
              >
                {is_google_drive_url(download_url) ? 'Tải trên Google Drive' : 'Mở link tải'}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
