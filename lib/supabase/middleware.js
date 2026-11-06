import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { get_public_supabase_config } from './env';

export async function update_session(request) {
  let response = NextResponse.next({ request });
  const config = get_public_supabase_config();
  if (!config.ok) {
    return response;
  }

  const supabase = createServerClient(config.supabase_url, config.supabase_anon_key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies_to_set) {
        cookies_to_set.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookies_to_set.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const request_path = request.nextUrl.pathname;
  const needs_auth =
    request_path.startsWith('/account') ||
    request_path.startsWith('/admin') ||
    request_path.startsWith('/api/admin');

  if (!user && needs_auth) {
    const redirect_url = request.nextUrl.clone();
    redirect_url.pathname = '/';
    redirect_url.search = '';
    return NextResponse.redirect(redirect_url);
  }

  return response;
}
