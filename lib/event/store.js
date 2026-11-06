const EVENT_COLUMNS = 'title, start_at, end_at, url, updated_at, updated_by';
const DEFAULT_TITLE = 'Bí Cảnh Tông Môn';

export async function load_site_event(client) {
  const { data, error } = await client
    .from('site_event')
    .select(EVENT_COLUMNS)
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, code: 'EVENT_LOOKUP_FAILED', error: error.message };
  }

  if (!data) return { ok: true, event: null };

  return {
    ok: true,
    event: {
      title: data.title || DEFAULT_TITLE,
      start_at: data.start_at,
      end_at: data.end_at,
      url: data.url,
      updated_at: data.updated_at || null,
      updated_by: data.updated_by || null,
    },
  };
}

export async function upsert_site_event(
  client,
  { title, start_at, end_at, url, updated_by },
) {
  const { error } = await client.from('site_event').upsert(
    {
      id: 1,
      title: title || DEFAULT_TITLE,
      start_at,
      end_at,
      url,
      updated_at: new Date().toISOString(),
      updated_by: updated_by || null,
    },
    { onConflict: 'id' },
  );

  if (error) {
    return { ok: false, status: 400, code: 'EVENT_UPSERT_FAILED', error: error.message };
  }

  return { ok: true };
}

export async function delete_site_event(client) {
  const { error } = await client.from('site_event').delete().eq('id', 1);
  if (error) {
    return { ok: false, status: 400, code: 'EVENT_DELETE_FAILED', error: error.message };
  }
  return { ok: true };
}
