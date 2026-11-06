export function format_event_duration(remaining_ms) {
  if (remaining_ms <= 0) return '';

  const remaining_minutes = Math.ceil(remaining_ms / 60_000);
  const remaining_days = Math.floor(remaining_minutes / (60 * 24));
  const leftover_after_days = remaining_minutes % (60 * 24);
  const remaining_hours = Math.floor(leftover_after_days / 60);
  const leftover_minutes = leftover_after_days % 60;

  const parts = [];
  if (remaining_days > 0) parts.push(`${remaining_days} ngày`);
  if (remaining_hours > 0) parts.push(`${remaining_hours} giờ`);
  if (leftover_minutes > 0) parts.push(`${leftover_minutes} phút`);
  return parts.join(' ');
}

export function resolve_event(now_ms, event) {
  const hidden = { visible: false, clickable: false, label: '', url: '' };
  const start_ms = Date.parse(event?.start_at || '');
  const end_ms = Date.parse(event?.end_at || '');
  const url = String(event?.url || '').trim();
  if (!Number.isFinite(start_ms) || !Number.isFinite(end_ms) || !url) return hidden;
  if (now_ms >= end_ms) return hidden;

  if (now_ms < start_ms) {
    return {
      visible: true,
      clickable: false,
      label: `Mở sau ${format_event_duration(start_ms - now_ms)}`,
      url,
    };
  }

  return {
    visible: true,
    clickable: true,
    label: `Còn ${format_event_duration(end_ms - now_ms)}`,
    url,
  };
}
