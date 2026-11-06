import { split_admin_lists } from './membership.mjs';

export async function load_admin_lists(service_client) {
  const [
    { data: profile_rows, error: profile_error },
    { data: allowlist_rows, error: allowlist_error },
    { data: entitlement_rows, error: entitlement_error },
  ] = await Promise.all([
    service_client
      .from('user_profiles')
      .select('id, email, user_type, created_at, last_login_at')
      .order('created_at', { ascending: false }),
    service_client.from('user_type_allowlist').select('email, user_type, created_at').order('email'),
    service_client
      .from('user_entitlements')
      .select('email, package_key, expires_at, updated_at')
      .order('email')
      .order('package_key'),
  ]);

  if (profile_error) {
    return { ok: false, status: 500, code: 'PROFILE_LIST_FAILED', error: profile_error.message };
  }
  if (allowlist_error) {
    return {
      ok: false,
      status: 500,
      code: 'ALLOWLIST_LIST_FAILED',
      error: allowlist_error.message,
    };
  }
  if (entitlement_error) {
    return {
      ok: false,
      status: 500,
      code: 'ENTITLEMENT_LIST_FAILED',
      error: entitlement_error.message,
    };
  }

  const user_ids = (profile_rows || []).map((row) => row.id).filter(Boolean);
  let credit_map = new Map();
  if (user_ids.length) {
    // Load the whole credit table. `.in('user_id', hundreds of UUIDs)` builds a
    // GET URL over Node/undici's ~16KB header limit and surfaces as
    // `TypeError: fetch failed` (UND_ERR_HEADERS_OVERFLOW).
    const { data: credit_rows, error: credit_error } = await service_client
      .from('free_user_credits')
      .select('user_id, remaining_tokens');
    if (credit_error) {
      return { ok: false, status: 500, code: 'CREDIT_LIST_FAILED', error: credit_error.message };
    }
    credit_map = new Map(
      (credit_rows || []).map((row) => [row.user_id, row.remaining_tokens]),
    );
  }

  const profiles = (profile_rows || []).map((row) => ({
    email: row.email,
    user_type: row.user_type,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    remaining_tokens: credit_map.has(row.id) ? Number(credit_map.get(row.id)) : null,
  }));

  const entitlements_by_email = new Map();
  for (const entitlement_row of entitlement_rows || []) {
    const entitlement_email = String(entitlement_row.email || '').trim().toLowerCase();
    if (!entitlement_email) continue;
    const existing_rows = entitlements_by_email.get(entitlement_email) || [];
    existing_rows.push({
      packageKey: entitlement_row.package_key,
      expiresAt: entitlement_row.expires_at,
      updatedAt: entitlement_row.updated_at || null,
    });
    entitlements_by_email.set(entitlement_email, existing_rows);
  }

  return {
    ok: true,
    ...split_admin_lists({
      profiles,
      allowlist: allowlist_rows || [],
      entitlements_by_email,
    }),
    profiles,
  };
}

export async function apply_upsert(service_client, target_email, next_user_type) {
  const updated_at = new Date().toISOString();
  const { error: allowlist_error } = await service_client.from('user_type_allowlist').upsert(
    {
      email: target_email,
      user_type: next_user_type,
      updated_at,
    },
    { onConflict: 'email' },
  );
  if (allowlist_error) {
    return { ok: false, status: 400, code: 'ALLOWLIST_UPSERT_FAILED', error: allowlist_error.message };
  }

  const { error: profile_error } = await service_client
    .from('user_profiles')
    .update({ user_type: next_user_type, updated_at })
    .eq('email', target_email);
  if (profile_error) {
    return { ok: false, status: 400, code: 'PROFILE_UPDATE_FAILED', error: profile_error.message };
  }

  return { ok: true };
}

export async function apply_remove(service_client, target_email) {
  const updated_at = new Date().toISOString();
  const { error: entitlement_error } = await service_client
    .from('user_entitlements')
    .delete()
    .eq('email', target_email);
  if (entitlement_error) {
    return {
      ok: false,
      status: 400,
      code: 'ENTITLEMENT_DELETE_FAILED',
      error: entitlement_error.message,
    };
  }

  const { error: allowlist_error } = await service_client
    .from('user_type_allowlist')
    .delete()
    .eq('email', target_email);
  if (allowlist_error) {
    return { ok: false, status: 400, code: 'ALLOWLIST_DELETE_FAILED', error: allowlist_error.message };
  }

  const { error: profile_error } = await service_client
    .from('user_profiles')
    .update({ user_type: 'Free', updated_at })
    .eq('email', target_email);
  if (profile_error) {
    return { ok: false, status: 400, code: 'PROFILE_UPDATE_FAILED', error: profile_error.message };
  }

  return { ok: true };
}

export async function apply_package_upsert(service_client, target_email, packages, granted_by) {
  const normalized_email = String(target_email || '').trim().toLowerCase();
  const updated_at = new Date().toISOString();

  for (const [package_key, package_value] of Object.entries(packages || {})) {
    if (package_value?.enabled !== true) {
      const { error: delete_error } = await service_client
        .from('user_entitlements')
        .delete()
        .eq('email', normalized_email)
        .eq('package_key', package_key);
      if (delete_error) {
        return {
          ok: false,
          status: 400,
          code: 'ENTITLEMENT_DELETE_FAILED',
          error: delete_error.message,
        };
      }
      continue;
    }

    const { error: upsert_error } = await service_client.from('user_entitlements').upsert(
      {
        email: normalized_email,
        package_key,
        expires_at: package_value.expires_at ?? null,
        granted_by,
        updated_at,
      },
      { onConflict: 'email,package_key' },
    );
    if (upsert_error) {
      return {
        ok: false,
        status: 400,
        code: 'ENTITLEMENT_UPSERT_FAILED',
        error: upsert_error.message,
      };
    }
  }

  return { ok: true };
}
