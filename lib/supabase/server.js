import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { get_public_supabase_config } from './env';

export async function create_server_client() {
  const config = get_public_supabase_config();
  if (!config.ok) {
    throw new Error(config.error);
  }

  const cookie_store = await cookies();

  return createServerClient(config.supabase_url, config.supabase_anon_key, {
    cookies: {
      getAll() {
        return cookie_store.getAll();
      },
      setAll(cookies_to_set) {
        try {
          cookies_to_set.forEach(({ name, value, options }) => {
            cookie_store.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware already refreshed the session.
        }
      },
    },
  });
}
