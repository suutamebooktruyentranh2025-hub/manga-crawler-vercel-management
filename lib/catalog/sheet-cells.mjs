export function is_http_url(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

export function is_google_drive_url(value) {
  try {
    const parsed_url = new URL(String(value || '').trim());
    const host_name = parsed_url.hostname.toLowerCase();
    return host_name === 'drive.google.com' || host_name === 'docs.google.com';
  } catch {
    return false;
  }
}

export function normalize_google_drive_image_url(url_string) {
  const raw_url = String(url_string || '').trim();
  if (!raw_url) return raw_url;
  try {
    const parsed_url = new URL(raw_url);
    const host_name = parsed_url.hostname.toLowerCase();
    if (host_name !== 'drive.google.com' && host_name !== 'docs.google.com') return raw_url;
    let file_id = parsed_url.searchParams.get('id');
    if (!file_id) {
      const path_match = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(parsed_url.pathname);
      if (path_match) file_id = path_match[1];
    }
    if (!file_id || !/^[a-zA-Z0-9_-]+$/.test(file_id)) return raw_url;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(file_id)}&sz=w800`;
  } catch {
    return raw_url;
  }
}

export function cover_url_from_cell(raw_value) {
  const cell_text = String(raw_value ?? '').trim();
  if (!cell_text) return null;
  if (is_http_url(cell_text)) return normalize_google_drive_image_url(cell_text);

  const normalized_formula = cell_text.replace(/^\++/, '=').replace(/^'=/, '=');
  const image_patterns = [
    /^=\s*IMAGE\s*\(\s*"([^"]+)"/i,
    /^=\s*IMAGE\s*\(\s*'([^']+)'/i,
    /IMAGE\s*\(\s*"([^"]+)"/i,
    /IMAGE\s*\(\s*'([^']+)'/i,
  ];
  for (const image_pattern of image_patterns) {
    const image_match = image_pattern.exec(normalized_formula);
    if (image_match?.[1]) {
      const inner_url = image_match[1].trim();
      if (is_http_url(inner_url)) return normalize_google_drive_image_url(inner_url);
    }
  }
  const hyperlink_match =
    /HYPERLINK\s*\(\s*"([^"]+)"/i.exec(normalized_formula) ||
    /HYPERLINK\s*\(\s*'([^']+)'/i.exec(normalized_formula);
  if (hyperlink_match?.[1]) {
    const inner_url = hyperlink_match[1].trim();
    if (is_http_url(inner_url)) return normalize_google_drive_image_url(inner_url);
  }
  return null;
}

export function http_url_from_cell(raw_value) {
  const cell_text = String(raw_value ?? '').trim();
  if (!cell_text) return null;
  if (is_http_url(cell_text)) return cell_text.trim();
  const normalized_formula = cell_text.replace(/^\++/, '=').replace(/^'=/, '=');
  const hyperlink_match =
    /HYPERLINK\s*\(\s*"([^"]+)"/i.exec(normalized_formula) ||
    /HYPERLINK\s*\(\s*'([^']+)'/i.exec(normalized_formula);
  if (hyperlink_match?.[1]) {
    const inner_url = hyperlink_match[1].trim();
    if (is_http_url(inner_url)) return inner_url;
  }
  return null;
}
