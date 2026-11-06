import { NextResponse } from 'next/server';
import { create_server_client } from '@/lib/supabase/server';
import { is_admin_type } from '@/lib/admin/membership.mjs';
import { resolve_user_profile } from '@/lib/auth/session';

function redirect_url(request, pathname) {
  const request_url = new URL(request.url);
  const forwarded_host = request.headers.get('x-forwarded-host');
  const origin =
    process.env.NODE_ENV === 'development' || !forwarded_host
      ? request_url.origin
      : `https://${forwarded_host}`;
  return NextResponse.redirect(`${origin}${pathname}`);
}

export async function GET(request) {
  const request_url = new URL(request.url);
  const auth_code = request_url.searchParams.get('code');
  const auth_error = request_url.searchParams.get('error');

  if (auth_error) {
    return redirect_url(request, `/?login_error=${encodeURIComponent(auth_error)}`);
  }

  if (!auth_code) {
    return redirect_url(request, '/?login_error=missing_code');
  }

  const supabase = await create_server_client();
  const { error: exchange_error } = await supabase.auth.exchangeCodeForSession(auth_code);
  if (exchange_error) {
    return redirect_url(
      request,
      `/?login_error=${encodeURIComponent(exchange_error.message)}`,
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const profile = await resolve_user_profile(session?.access_token);

  if (profile.ok && is_admin_type(profile.user_type)) {
    return redirect_url(request, '/admin');
  }

  return redirect_url(request, '/account');
}
