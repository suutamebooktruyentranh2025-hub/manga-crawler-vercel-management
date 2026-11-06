export function filter_admin_rows(rows, { search_query = '', user_type = '' } = {}) {
  const search_needle = String(search_query || '').trim().toLowerCase();
  const selected_user_type = String(user_type || '').trim();

  return (rows || []).filter((row) => {
    if (selected_user_type && row.user_type !== selected_user_type) return false;
    if (!search_needle) return true;
    if (row.email.includes(search_needle) || row.user_type.toLowerCase().includes(search_needle)) {
      return true;
    }
    if (row.remaining_tokens != null && String(row.remaining_tokens).includes(search_needle)) {
      return true;
    }
    return false;
  });
}
