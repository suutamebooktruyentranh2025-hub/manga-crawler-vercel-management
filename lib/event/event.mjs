const HTTP_URL_PATTERN = /^https?:\/\//i;
const NAIVE_MINUTE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const NAIVE_SECOND_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
const HAS_TIMEZONE_PATTERN = /[zZ]|[+-]\d{2}:\d{2}$/;
export const DEFAULT_EVENT_TITLE = 'Bí Cảnh Tông Môn';
export const MAX_EVENT_TITLE_LENGTH = 50;

export function to_vietnam_input_value(iso_value) {
  if (!iso_value) return '';
  const parsed_date = new Date(iso_value);
  if (Number.isNaN(parsed_date.getTime())) return '';
  const vietnam_ms = parsed_date.getTime() + 7 * 60 * 60_000;
  return new Date(vietnam_ms).toISOString().slice(0, 16);
}

export function parse_event_datetime(value) {
  const text = String(value || '').trim();
  if (!text) return Number.NaN;
  if (HAS_TIMEZONE_PATTERN.test(text)) return Date.parse(text);
  if (NAIVE_MINUTE_PATTERN.test(text)) return Date.parse(`${text}:00+07:00`);
  if (NAIVE_SECOND_PATTERN.test(text)) return Date.parse(`${text}+07:00`);
  return Date.parse(text);
}

export function decide_event_upsert({ title, start_at, end_at, url } = {}) {
  const trimmed_title = String(title || '').trim() || DEFAULT_EVENT_TITLE;
  const trimmed_url = String(url || '').trim();
  const start_text = String(start_at || '').trim();
  const end_text = String(end_at || '').trim();

  if (trimmed_title.length > MAX_EVENT_TITLE_LENGTH) {
    return {
      ok: false,
      code: 'TITLE_TOO_LONG',
      error: `Tên sự kiện không được vượt quá ${MAX_EVENT_TITLE_LENGTH} ký tự.`,
    };
  }

  if (!start_text) {
    return { ok: false, code: 'START_REQUIRED', error: 'Cần chọn thời điểm bắt đầu.' };
  }
  if (!end_text) {
    return { ok: false, code: 'END_REQUIRED', error: 'Cần chọn thời điểm kết thúc.' };
  }
  if (!trimmed_url) {
    return { ok: false, code: 'URL_REQUIRED', error: 'Cần nhập link sự kiện.' };
  }

  const start_ms = parse_event_datetime(start_text);
  if (!Number.isFinite(start_ms)) {
    return { ok: false, code: 'INVALID_START', error: 'Thời điểm bắt đầu không hợp lệ.' };
  }

  const end_ms = parse_event_datetime(end_text);
  if (!Number.isFinite(end_ms)) {
    return { ok: false, code: 'INVALID_END', error: 'Thời điểm kết thúc không hợp lệ.' };
  }

  if (!HTTP_URL_PATTERN.test(trimmed_url)) {
    return { ok: false, code: 'INVALID_URL', error: 'Link phải bắt đầu bằng http:// hoặc https://.' };
  }

  if (end_ms <= start_ms) {
    return {
      ok: false,
      code: 'END_BEFORE_START',
      error: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.',
    };
  }

  return {
    ok: true,
    title: trimmed_title,
    start_at: new Date(start_ms).toISOString(),
    end_at: new Date(end_ms).toISOString(),
    url: trimmed_url,
  };
}
