import { can_see_catalog_download, sanitize_catalog_item } from './access.mjs';
import { fetch_catalog_sheet_rows } from './google-sheets.js';
import { map_sheet_rows } from './map-rows.mjs';

export async function load_catalog({ profile, force_refresh = false } = {}) {
  const sheet_result = await fetch_catalog_sheet_rows({ force_refresh });
  if (!sheet_result.ok) return sheet_result;

  const can_see_link = can_see_catalog_download(profile);
  const catalog_items = map_sheet_rows(sheet_result.rows).map((catalog_item) =>
    sanitize_catalog_item(catalog_item, { can_see_link }),
  );

  return {
    ok: true,
    items: catalog_items,
    can_see_link,
    from_cache: Boolean(sheet_result.from_cache),
    fetched_at: sheet_result.fetched_at || Date.now(),
  };
}
