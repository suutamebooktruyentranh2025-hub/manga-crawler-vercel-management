import { cache } from 'react';
import { create_server_client } from '@/lib/supabase/server';
import { get_public_supabase_config } from '@/lib/supabase/env';
import { is_admin_type, normalize_email, normalize_user_type } from '@/lib/admin/membership.mjs';

export const get_session_user = cache(async function get_session_user() {
  try {
    const supabase = await create_server_client();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
});

export const get_session_profile = cache(async function get_session_profile() {
  const user = await get_session_user();
  if (!user) return null;

  const supabase = await create_server_client();
  const [{ data: profile_row }, { data: credit_row }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('email, user_type, created_at, last_login_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('free_user_credits')
      .select('remaining_tokens')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const user_type = normalize_user_type(profile_row?.user_type || 'Free');
  const email = normalize_email(profile_row?.email || user.email);
  const { data: entitlement_rows } = await supabase
    .from('user_entitlements')
    .select('email, package_key, expires_at')
    .eq('email', email)
    .order('package_key');

  return {
    id: user.id,
    email,
    user_type,
    is_admin: is_admin_type(user_type),
    entitlements: (entitlement_rows || []).map((row) => ({
      packageKey: row.package_key,
      expiresAt: row.expires_at,
    })),
    created_at: profile_row?.created_at || user.created_at || null,
    last_login_at: profile_row?.last_login_at || null,
    remaining_tokens:
      credit_row?.remaining_tokens == null ? null : Number(credit_row.remaining_tokens),
  };
});

export async function resolve_user_profile(access_token) {
  const config = get_public_supabase_config();
  if (!config.ok || !access_token) {
    return { ok: false, error: config.error || 'Missing access token.' };
  }

  const response = await fetch(`${config.supabase_url}/functions/v1/resolve-user-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabase_anon_key,
      Authorization: `Bearer ${access_token}`,
    },
    body: '{}',
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    return {
      ok: false,
      error: body?.error || `resolve-user-profile HTTP ${response.status}`,
    };
  }

  return {
    ok: true,
    email: normalize_email(body.email),
    user_type: normalize_user_type(body.userType),
    remaining_tokens:
      body.remainingTokens == null ? null : Number(body.remainingTokens),
  };
}
