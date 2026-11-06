import { get_session_profile } from '@/lib/auth/session';
import { load_catalog } from '@/lib/catalog/load-catalog';

function catalog_json_response(catalog_result) {
  if (catalog_result.ok) {
    return Response.json(catalog_result);
  }
  const http_status =
    catalog_result.code === 'LOGIN_REQUIRED' || catalog_result.code === 'PREMIUM_ONLY'
      ? 403
      : catalog_result.code === 'NO_SERVICE_ACCOUNT'
        ? 503
        : 500;
  return Response.json(catalog_result, { status: http_status });
}

export async function GET() {
  const session_profile = await get_session_profile();
  const catalog_result = await load_catalog({
    profile: session_profile,
  });
  return catalog_json_response(catalog_result);
}

export async function POST() {
  const session_profile = await get_session_profile();
  const is_admin = session_profile?.is_admin === true;

  // Only admin users can bypass cache and force upstream Google Sheets fetch.
  // Anonymous and non-admin callers receive fresh data from the server-side cache.
  const catalog_result = await load_catalog({
    profile: session_profile,
    force_refresh: is_admin,
  });
  return catalog_json_response(catalog_result);
}
