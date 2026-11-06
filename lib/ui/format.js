export const USER_TYPE_OPTIONS = [
  'Free',
  'Member',
  'Super Member',
  'Premium Member',
  'Admin',
];

export function format_vi_date(value) {
  if (!value) return '—';
  const parsed_date = new Date(value);
  if (Number.isNaN(parsed_date.getTime())) return '—';
  return parsed_date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
