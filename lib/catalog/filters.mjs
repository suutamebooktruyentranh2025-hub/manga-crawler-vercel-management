const FILTER_KEYS = ['title', 'status', 'rate', 'genre'];

function number_from_cell(value) {
  const parsed_number = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed_number) ? parsed_number : NaN;
}

function item_matches_query(catalog_item, search_query) {
  const search_terms = String(search_query)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (search_terms.length === 0) return true;
  const search_blob = [
    catalog_item.title,
    catalog_item.description,
    catalog_item.qty,
    catalog_item.status,
    catalog_item.rate,
    catalog_item.author,
    catalog_item.genre,
    ...(catalog_item.genre_parts || []),
    catalog_item.updated_at,
  ]
    .map((part) => String(part ?? '').toLowerCase())
    .join('\n');
  return search_terms.every((term) => search_blob.includes(term));
}

function item_matches_column_filter(catalog_item, filter_key, column_filter) {
  if (!column_filter) return true;
  if (column_filter.kind === 'rateCompare' && filter_key === 'rate') {
    const threshold_value = column_filter.value;
    if (!Number.isFinite(threshold_value)) return true;
    const rate_value = number_from_cell(catalog_item.rate);
    if (!Number.isFinite(rate_value)) return false;
    switch (column_filter.op) {
      case 'gt':
        return rate_value > threshold_value;
      case 'gte':
        return rate_value >= threshold_value;
      case 'lt':
        return rate_value < threshold_value;
      case 'lte':
        return rate_value <= threshold_value;
      case 'eq':
        return Math.abs(rate_value - threshold_value) < 1e-6;
      default:
        return true;
    }
  }
  if (column_filter.kind === 'text') {
    const query_text = String(column_filter.q ?? '').trim().toLowerCase();
    if (!query_text) return true;
    if (filter_key === 'title') {
      return String(catalog_item.title || '')
        .toLowerCase()
        .includes(query_text);
    }
    return true;
  }
  if (column_filter.kind === 'set') {
    if (column_filter.values.length === 0) return false;
    const allowed_values = new Set(column_filter.values);
    if (filter_key === 'genre') {
      return (catalog_item.genre_parts || []).some((genre_name) => allowed_values.has(genre_name));
    }
    const field_value = String(catalog_item[filter_key] ?? '').trim() || '—';
    return allowed_values.has(field_value);
  }
  return true;
}

export function apply_catalog_filters(catalog_items, search_query, column_filters) {
  let filtered_items = Array.isArray(catalog_items) ? catalog_items.slice() : [];
  const query_text = String(search_query ?? '').trim();
  if (query_text) {
    filtered_items = filtered_items.filter((catalog_item) =>
      item_matches_query(catalog_item, query_text),
    );
  }
  const active_filters = column_filters && typeof column_filters === 'object' ? column_filters : {};
  for (const filter_key of FILTER_KEYS) {
    const column_filter = active_filters[filter_key];
    if (!column_filter) continue;
    filtered_items = filtered_items.filter((catalog_item) =>
      item_matches_column_filter(catalog_item, filter_key, column_filter),
    );
  }
  return filtered_items;
}

export function collect_filter_options(catalog_items) {
  const genre_set = new Set();
  const status_set = new Set();
  for (const catalog_item of catalog_items || []) {
    const status_name = String(catalog_item.status || '').trim();
    if (status_name) status_set.add(status_name);
    for (const genre_name of catalog_item.genre_parts || []) {
      if (genre_name) genre_set.add(genre_name);
    }
  }
  const locale_sort = (left_value, right_value) =>
    left_value.localeCompare(right_value, undefined, { numeric: true, sensitivity: 'base' });
  return {
    genre: Array.from(genre_set).sort(locale_sort),
    status: Array.from(status_set).sort(locale_sort),
  };
}

export function has_active_column_filter(column_filters) {
  if (!column_filters || typeof column_filters !== 'object') return false;
  for (const filter_key of FILTER_KEYS) {
    const column_filter = column_filters[filter_key];
    if (!column_filter) continue;
    if (column_filter.kind === 'text' && String(column_filter.q ?? '').trim()) return true;
    if (column_filter.kind === 'set' && column_filter.values.length > 0) return true;
    if (column_filter.kind === 'rateCompare' && Number.isFinite(column_filter.value)) return true;
  }
  return false;
}
