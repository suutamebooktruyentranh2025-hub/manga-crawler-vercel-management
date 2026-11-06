import { NextResponse } from 'next/server';
import { create_server_client } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await create_server_client();
  await supabase.auth.signOut();

  const request_url = new URL(request.url);
  const forwarded_host = request.headers.get('x-forwarded-host');
  const origin =
    process.env.NODE_ENV === 'development' || !forwarded_host
      ? request_url.origin
      : `https://${forwarded_host}`;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
