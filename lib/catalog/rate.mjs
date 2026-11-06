export function parse_display_rate(rate_text) {
  const normalized_rate = String(rate_text || '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '')
    .trim();
  if (!normalized_rate || normalized_rate === '-' || normalized_rate === '.') return null;
  const rate_value = parseFloat(normalized_rate);
  return Number.isFinite(rate_value) ? rate_value : null;
}

export function rate_badge_class(rate_text) {
  const rate_value = parse_display_rate(rate_text);
  if (rate_value == null || rate_value <= 6) return 'bg-zinc-100 text-zinc-600';
  if (rate_value <= 8) return 'bg-amber-400/15 text-amber-600';
  if (rate_value <= 9) return 'bg-emerald-400/15 text-emerald-600';
  return 'bg-rose-400/15 text-rose-500';
}
