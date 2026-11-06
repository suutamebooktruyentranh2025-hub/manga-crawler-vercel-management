import { cover_url_from_cell, http_url_from_cell } from './sheet-cells.mjs';

function pad_row(raw_row) {
  const padded_row = Array.isArray(raw_row) ? [...raw_row] : [];
  while (padded_row.length < 13) padded_row.push('');
  return padded_row;
}

export function parse_title_block(block) {
  const block_text = String(block || '').trim();
  const text_lines = block_text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { title: text_lines[0] || '', description: text_lines.slice(1).join('\n') };
}

export function parse_genre(genre_text) {
  return String(genre_text || '')
    .split(/[,;，]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function format_catalog_date(raw_value) {
  const date_text = String(raw_value ?? '').trim();
  if (!date_text) return '';

  const iso_match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date_text);
  if (iso_match) {
    const year_value = parseInt(iso_match[1], 10);
    const month_value = parseInt(iso_match[2], 10);
    const day_value = parseInt(iso_match[3], 10);
    if (month_value >= 1 && month_value <= 12 && day_value >= 1 && day_value <= 31) {
      return `${String(day_value).padStart(2, '0')}/${String(month_value).padStart(2, '0')}/${year_value}`;
    }
  }

  const slash_match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(date_text);
  if (slash_match) {
    const day_value = parseInt(slash_match[1], 10);
    const month_value = parseInt(slash_match[2], 10);
    let year_value = parseInt(slash_match[3], 10);
    if (year_value < 100) year_value += year_value >= 50 ? 1900 : 2000;
    const parsed_date = new Date(year_value, month_value - 1, day_value);
    if (
      parsed_date.getFullYear() === year_value &&
      parsed_date.getMonth() === month_value - 1 &&
      parsed_date.getDate() === day_value
    ) {
      return `${String(day_value).padStart(2, '0')}/${String(month_value).padStart(2, '0')}/${year_value}`;
    }
  }

  if (/^\d+(\.\d+)?$/.test(date_text)) {
    const serial_value = parseFloat(date_text);
    if (Number.isFinite(serial_value) && serial_value > 20000 && serial_value < 80000) {
      const excel_epoch = Date.UTC(1899, 11, 30);
      const utc_date = new Date(excel_epoch + Math.floor(serial_value) * 86400000);
      const day_text = String(utc_date.getUTCDate()).padStart(2, '0');
      const month_text = String(utc_date.getUTCMonth() + 1).padStart(2, '0');
      return `${day_text}/${month_text}/${utc_date.getUTCFullYear()}`;
    }
  }

  const parsed_time = Date.parse(date_text);
  if (!Number.isNaN(parsed_time)) {
    const parsed_date = new Date(parsed_time);
    const day_text = String(parsed_date.getDate()).padStart(2, '0');
    const month_text = String(parsed_date.getMonth() + 1).padStart(2, '0');
    return `${day_text}/${month_text}/${parsed_date.getFullYear()}`;
  }

  return date_text;
}

export function map_sheet_row(raw_row, row_index) {
  const padded_row = pad_row(raw_row);
  const title_block = parse_title_block(padded_row[2]);
  if (!title_block.title) return null;
  return {
    id: String(row_index),
    cover_url: cover_url_from_cell(padded_row[1]) || '',
    title: title_block.title,
    description: title_block.description,
    qty: String(padded_row[4] ?? '').trim(),
    download_url: http_url_from_cell(padded_row[5]) || '',
    status: String(padded_row[6] ?? '').trim(),
    source: String(padded_row[7] ?? '').trim(),
    rate: String(padded_row[8] ?? '').trim(),
    author: String(padded_row[9] ?? '').trim(),
    genre: String(padded_row[10] ?? '').trim(),
    genre_parts: parse_genre(padded_row[10]),
    updated_at: format_catalog_date(padded_row[11]),
  };
}

export function map_sheet_rows(raw_rows) {
  const catalog_items = [];
  (Array.isArray(raw_rows) ? raw_rows : []).forEach((raw_row, row_index) => {
    const catalog_item = map_sheet_row(raw_row, row_index);
    if (catalog_item) catalog_items.push(catalog_item);
  });
  return catalog_items;
}
