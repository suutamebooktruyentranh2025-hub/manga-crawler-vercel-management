import { update_session } from '@/lib/supabase/middleware';

export async function proxy(request) {
  return update_session(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
