import { createClient } from '@supabase/supabase-js';
import { get_public_supabase_config, get_service_role_key } from './env';

export function create_service_client() {
  const public_config = get_public_supabase_config();
  const service_config = get_service_role_key();
  if (!public_config.ok) {
    throw new Error(public_config.error);
  }
  if (!service_config.ok) {
    throw new Error(service_config.error);
  }

  return createClient(public_config.supabase_url, service_config.service_role_key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
