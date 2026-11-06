import { NextResponse } from 'next/server';
import { json_error, require_admin } from '@/lib/auth/require-admin';
import { decide_event_upsert } from '@/lib/event/event.mjs';
import {
  delete_site_event,
  load_site_event,
  upsert_site_event,
} from '@/lib/event/store';

export async function GET() {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  const loaded = await load_site_event(admin_check.service_client);
  if (!loaded.ok) return json_error(loaded);

  return NextResponse.json({ ok: true, event: loaded.event });
}

export async function PUT(request) {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  let body;
  try {
    body = await request.json();
  } catch {
    return json_error({ status: 400, code: 'BAD_JSON', error: 'Invalid JSON body.' });
  }

  const decision = decide_event_upsert(body);
  if (!decision.ok) return json_error({ ...decision, status: 400 });

  const saved = await upsert_site_event(admin_check.service_client, {
    title: decision.title,
    start_at: decision.start_at,
    end_at: decision.end_at,
    url: decision.url,
    updated_by: admin_check.actor_email,
  });
  if (!saved.ok) return json_error(saved);

  const loaded = await load_site_event(admin_check.service_client);
  if (!loaded.ok) return json_error(loaded);

  return NextResponse.json({ ok: true, event: loaded.event });
}

export async function DELETE() {
  const admin_check = await require_admin();
  if (!admin_check.ok) return json_error(admin_check);

  const removed = await delete_site_event(admin_check.service_client);
  if (!removed.ok) return json_error(removed);

  return NextResponse.json({ ok: true, event: null });
}
