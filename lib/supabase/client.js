import { createBrowserClient } from '@supabase/ssr';
import { get_public_supabase_config } from './env';

export function create_browser_client() {
  const config = get_public_supabase_config();
  if (!config.ok) {
    throw new Error(config.error);
  }
  return createBrowserClient(config.supabase_url, config.supabase_anon_key);
}
