export function should_show_register_cta(profile) {
  return profile?.is_admin !== true;
}

export function should_show_home_back_cue(pathname) {
  const normalized_path = String(pathname || '');
  return normalized_path !== '/' && normalized_path !== '';
}

export function header_avatar_initial(email) {
  const trimmed_email = String(email || '').trim();
  if (!trimmed_email) return '?';
  return trimmed_email.slice(0, 1).toUpperCase();
}
