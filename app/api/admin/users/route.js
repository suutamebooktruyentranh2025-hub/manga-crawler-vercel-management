import { NextResponse } from 'next/server';
import { json_error, require_admin } from '@/lib/auth/require-admin';
import {
  apply_package_upsert,
  apply_remove,
  apply_upsert,
  load_admin_lists,
} from '@/lib/admin/store';
import { decide_package_upsert, evaluate_remove } from '@/lib/admin/membership.mjs';

function find_current_entitlements(lists, target_email) {
  const normalized_email = String(target_email || '').trim().toLowerCase();
  const current_rows = [...(lists.logged_in || []), ...(lists.pending || [])];
  const target_row = current_rows.find((row) => row.email === normalized_email);
  return Array.isArray(target_row?.entitlements) ? target_row.entitlements : [];
}

export async function GET() {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  const lists = await load_admin_lists(admin_check.service_client);
  if (!lists.ok) return json_error(lists);

  return NextResponse.json({
    ok: true,
    logged_in: lists.logged_in,
    pending: lists.pending,
  });
}

export async function POST(request) {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  let body;
  try {
    body = await request.json();
  } catch {
    return json_error({ status: 400, code: 'BAD_JSON', error: 'Invalid JSON body.' });
  }

  const lists = await load_admin_lists(admin_check.service_client);
  if (!lists.ok) return json_error(lists);

  const decision = decide_package_upsert({
    actor_email: admin_check.actor_email,
    target_email: body.email,
    is_admin: body.isAdmin ?? body.is_admin,
    packages: body.packages || {},
    current_entitlements: find_current_entitlements(lists, body.email),
    current_profiles: lists.profiles,
  });
  if (!decision.ok) return json_error({ ...decision, status: 400 });

  if (decision.next_user_type === 'Free') {
    const removed_result = await apply_remove(admin_check.service_client, decision.target_email);
    if (!removed_result.ok) return json_error(removed_result);
  } else {
    const package_result = await apply_package_upsert(
      admin_check.service_client,
      decision.target_email,
      decision.packages,
      admin_check.actor_email,
    );
    if (!package_result.ok) return json_error(package_result);

    const profile_result = await apply_upsert(
      admin_check.service_client,
      decision.target_email,
      decision.next_user_type,
    );
    if (!profile_result.ok) {
      return json_error({
        ...profile_result,
        error:
          'Quyền gói đã lưu nhưng cập nhật hạng hiển thị thất bại. Tải lại trang rồi kiểm tra checkbox.',
        code: 'PROFILE_DISPLAY_UPDATE_FAILED',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    email: decision.target_email,
    user_type: decision.next_user_type,
    is_admin: decision.is_admin,
    packages: decision.packages,
  });
}

export async function DELETE(request) {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  let body;
  try {
    body = await request.json();
  } catch {
    return json_error({ status: 400, code: 'BAD_JSON', error: 'Invalid JSON body.' });
  }

  const lists = await load_admin_lists(admin_check.service_client);
  if (!lists.ok) return json_error(lists);

  const decision = evaluate_remove({
    actor_email: admin_check.actor_email,
    target_email: body.email,
    current_profiles: lists.profiles,
  });
  if (!decision.ok) return json_error({ ...decision, status: 400 });

  const applied = await apply_remove(admin_check.service_client, decision.target_email);
  if (!applied.ok) return json_error(applied);

  return NextResponse.json({ ok: true, email: decision.target_email, user_type: 'Free' });
}
