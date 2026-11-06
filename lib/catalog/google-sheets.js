import crypto from 'node:crypto';
import { revalidateTag } from 'next/cache';

const DEFAULT_CATALOG_SHEET_RANGE = "'Danh sách truyện'!A2:M";
export const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const CATALOG_TTL_SECONDS = 12 * 60 * 60;
const REFRESH_COOLDOWN_MS = 30 * 1000;

let cached_access_token = '';
let cached_access_token_expires_at = 0;
const sheet_row_cache = new Map();

function catalog_cache_tag() {
  return 'catalog-sheet';
}

function read_service_account() {
  const json_text = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!json_text) {
    return { ok: false, code: 'NO_SERVICE_ACCOUNT', error: 'Missing GOOGLE_SERVICE_ACCOUNT_JSON.' };
  }
  try {
    const service_account = JSON.parse(json_text);
    if (!service_account?.client_email || !service_account?.private_key) {
      return { ok: false, code: 'NO_SERVICE_ACCOUNT', error: 'GOOGLE_SERVICE_ACCOUNT_JSON is incomplete.' };
    }
    return { ok: true, service_account };
  } catch {
    return { ok: false, code: 'NO_SERVICE_ACCOUNT', error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.' };
  }
}

function get_sheet_config() {
  const sheet_id = String(process.env.GOOGLE_CATALOG_SHEET_ID || '').trim();
  if (!sheet_id) {
    return { ok: false, code: 'NO_SHEET_CONFIG', error: 'Missing GOOGLE_CATALOG_SHEET_ID.' };
  }
  return {
    ok: true,
    sheet_id,
    sheet_range: String(process.env.GOOGLE_CATALOG_SHEET_RANGE || DEFAULT_CATALOG_SHEET_RANGE).trim(),
  };
}

function sign_google_jwt(service_account) {
  const issued_at = Math.floor(Date.now() / 1000);
  const header_part = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload_part = Buffer.from(
    JSON.stringify({
      iss: service_account.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: issued_at + 3600,
      iat: issued_at,
    }),
  ).toString('base64url');
  const unsigned_token = `${header_part}.${payload_part}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned_token);
  signer.end();
  const signature_part = signer.sign(service_account.private_key, 'base64url');
  return `${unsigned_token}.${signature_part}`;
}

async function get_google_access_token() {
  if (cached_access_token && cached_access_token_expires_at > Date.now() + 60_000) {
    return { ok: true, access_token: cached_access_token };
  }
  const account_result = read_service_account();
  if (!account_result.ok) return account_result;
  const assertion_token = sign_google_jwt(account_result.service_account);
  const token_response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion_token,
    }),
  });
  const token_body = await token_response.json().catch(() => ({}));
  if (!token_response.ok || !token_body.access_token) {
    return {
      ok: false,
      code: 'JWT_AUTH_FAILED',
      error: token_body.error_description || token_body.error || `Google token HTTP ${token_response.status}`,
    };
  }
  cached_access_token = token_body.access_token;
  cached_access_token_expires_at =
    Date.now() + Math.max(1, Number(token_body.expires_in || 3600) - 60) * 1000;
  return { ok: true, access_token: cached_access_token };
}

export async function fetch_catalog_sheet_rows({ force_refresh = false } = {}) {
  const sheet_config = get_sheet_config();
  if (!sheet_config.ok) return sheet_config;
  const { sheet_id, sheet_range } = sheet_config;
  const cache_key = `${sheet_id}:${sheet_range}`;
  const now_ms = Date.now();
  const memory_entry = sheet_row_cache.get(cache_key);

  if (!force_refresh && memory_entry && memory_entry.expires_at > now_ms) {
    return {
      ok: true,
      rows: memory_entry.rows,
      fetched_at: memory_entry.fetched_at,
      from_cache: true,
    };
  }

  if (force_refresh && memory_entry && now_ms - memory_entry.fetched_at < REFRESH_COOLDOWN_MS) {
    return {
      ok: true,
      rows: memory_entry.rows,
      fetched_at: memory_entry.fetched_at,
      from_cache: true,
    };
  }

  if (force_refresh) {
    revalidateTag(catalog_cache_tag(), 'max');
  }

  const token_result = await get_google_access_token();
  if (!token_result.ok) return token_result;

  const sheets_url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet_id}/values/${encodeURIComponent(sheet_range)}?valueRenderOption=FORMULA`;
  const sheets_response = await fetch(sheets_url, {
    headers: { Authorization: `Bearer ${token_result.access_token}` },
    ...(force_refresh
      ? { cache: 'no-store' }
      : { next: { revalidate: CATALOG_TTL_SECONDS, tags: [catalog_cache_tag()] } }),
  });
  const response_text = await sheets_response.text();
  let response_body = null;
  try {
    response_body = response_text ? JSON.parse(response_text) : null;
  } catch {
    response_body = response_text;
  }
  if (!sheets_response.ok) {
    const body_text = typeof response_body === 'string' ? response_body : JSON.stringify(response_body || {});
    if (memory_entry?.rows) {
      return {
        ok: true,
        rows: memory_entry.rows,
        fetched_at: memory_entry.fetched_at,
        from_cache: true,
      };
    }
    return {
      ok: false,
      code: 'SHEETS_API_ERROR',
      error: body_text || `Google Sheets HTTP ${sheets_response.status}`,
    };
  }
  const sheet_rows = Array.isArray(response_body?.values) ? response_body.values : [];
  const fetched_at = Date.now();
  sheet_row_cache.set(cache_key, {
    rows: sheet_rows,
    fetched_at,
    expires_at: fetched_at + CATALOG_TTL_MS,
  });
  return { ok: true, rows: sheet_rows, fetched_at, from_cache: false };
}
