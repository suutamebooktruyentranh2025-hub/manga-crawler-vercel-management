import { NextResponse } from 'next/server';
import { create_service_client } from '@/lib/supabase/admin';
import { create_server_client } from '@/lib/supabase/server';
import { is_admin_type, normalize_email } from '@/lib/admin/membership.mjs';

export async function require_admin() {
  let supabase;
  try {
    supabase = await create_server_client();
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: 'SUPABASE_CONFIG',
      error: String(error?.message || error),
    };
  }

  const {
    data: { user },
    error: user_error,
  } = await supabase.auth.getUser();
  if (user_error || !user) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED', error: 'Sign in required.' };
  }

  let service_client;
  try {
    service_client = create_service_client();
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: 'SERVICE_ROLE_CONFIG',
      error: String(error?.message || error),
    };
  }

  const { data: profile_row, error: profile_error } = await service_client
    .from('user_profiles')
    .select('email, user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile_error) {
    return {
      ok: false,
      status: 500,
      code: 'PROFILE_LOOKUP_FAILED',
      error: profile_error.message,
    };
  }

  const actor_email = normalize_email(profile_row?.email || user.email);
  if (!is_admin_type(profile_row?.user_type)) {
    return { ok: false, status: 403, code: 'FORBIDDEN', error: 'Admin only.' };
  }

  return { ok: true, actor_email, actor_id: user.id, service_client };
}

export function json_error(result) {
  return NextResponse.json(
    { ok: false, error: result.error, code: result.code },
    { status: result.status || 400 },
  );
}
