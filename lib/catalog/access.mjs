import { hasCatalogY1, hasCatalogY2 } from '../account/entitlements.mjs';

function normalize_access_profile(profile) {
  return {
    entitlements: Array.isArray(profile?.entitlements) ? profile.entitlements : [],
    isAdmin: profile?.isAdmin === true || profile?.is_admin === true,
    userType: profile?.userType || profile?.user_type || '',
  };
}

export function can_see_catalog_download(profile) {
  const normalized_profile = normalize_access_profile(profile);
  return hasCatalogY1(normalized_profile) || hasCatalogY2(normalized_profile);
}

export function can_see_year1_download(profile) {
  return hasCatalogY1(normalize_access_profile(profile));
}

export function can_view_year2(_profile) {
  return true;
}

export function can_show_year_tabs(_profile) {
  return true;
}

export function can_see_year_download(year, profile) {
  const normalized_profile = normalize_access_profile(profile);
  return Number(year) === 2 ? hasCatalogY2(normalized_profile) : hasCatalogY1(normalized_profile);
}

export function sanitize_catalog_item(catalog_item, { can_see_link }) {
  return {
    ...catalog_item,
    source: '',
    download_url: can_see_link ? String(catalog_item?.download_url || '') : '',
  };
}
