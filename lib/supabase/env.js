export function get_public_supabase_config() {
  const supabase_url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const supabase_anon_key = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!supabase_url || !supabase_anon_key) {
    return {
      ok: false,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }
  return { ok: true, supabase_url, supabase_anon_key };
}

export function get_service_role_key() {
  const service_role_key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!service_role_key) {
    return { ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY.' };
  }
  return { ok: true, service_role_key };
}
