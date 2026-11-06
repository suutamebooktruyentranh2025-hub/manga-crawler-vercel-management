'use client';

import { useState } from 'react';
import { to_vietnam_input_value } from '@/lib/event/event.mjs';

function create_form(event) {
  return {
    title: event?.title || '',
    start_at: to_vietnam_input_value(event?.start_at),
    end_at: to_vietnam_input_value(event?.end_at),
    url: event?.url || '',
  };
}

function event_summary(event) {
  if (!event) return 'Đang ẩn — chưa có event.';
  return `Đã lưu: "${event.title || 'Bí Cảnh Tông Môn'}" · ${to_vietnam_input_value(event.start_at)} → ${to_vietnam_input_value(event.end_at)} (giờ Việt Nam).`;
}

export function EventSettingsForm({ initial_event }) {
  const [event, set_event] = useState(initial_event);
  const [form, set_form] = useState(() => create_form(initial_event));
  const [busy, set_busy] = useState(false);
  const [status_text, set_status_text] = useState('');
  const [error_text, set_error_text] = useState('');

  async function run_action(action) {
    set_busy(true);
    set_error_text('');
    set_status_text('');
    try {
      await action();
    } catch (error) {
      set_error_text(String(error?.message || error));
    } finally {
      set_busy(false);
    }
  }

  async function save_event(submit_event) {
    submit_event.preventDefault();
    await run_action(async () => {
      const response = await fetch('/api/admin/event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      set_event(body.event);
      set_form(create_form(body.event));
      set_status_text(`Đã lưu event "${body.event.title}".`);
    });
  }

  async function hide_event() {
    const current_title = event?.title || 'sự kiện';
    const confirmed = window.confirm(
      `Ẩn nút "${current_title}" ngay bây giờ? Event hiện tại sẽ bị xóa.`,
    );
    if (!confirmed) return;
    await run_action(async () => {
      const response = await fetch('/api/admin/event', { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      set_event(null);
      set_form(create_form(null));
      set_status_text('Đã ẩn nút sự kiện.');
    });
  }

  return (
    <form onSubmit={save_event} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <p className="text-sm text-zinc-600">{event_summary(event)}</p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Tên nút / sự kiện</span>
        <input
          type="text"
          maxLength={50}
          value={form.title}
          onChange={(change_event) =>
            set_form((current_form) => ({ ...current_form, title: change_event.target.value }))
          }
          placeholder="Bí Cảnh Tông Môn"
          className="min-h-10 rounded-lg border border-zinc-300 px-3"
        />
        <span className="text-xs text-zinc-500">Mặc định: Bí Cảnh Tông Môn (tối đa 50 ký tự).</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Bắt đầu (giờ Việt Nam)</span>
          <input
            type="datetime-local"
            required
            value={form.start_at}
            onChange={(change_event) =>
              set_form((current_form) => ({ ...current_form, start_at: change_event.target.value }))
            }
            className="min-h-10 rounded-lg border border-zinc-300 px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Kết thúc (giờ Việt Nam)</span>
          <input
            type="datetime-local"
            required
            value={form.end_at}
            onChange={(change_event) =>
              set_form((current_form) => ({ ...current_form, end_at: change_event.target.value }))
            }
            className="min-h-10 rounded-lg border border-zinc-300 px-3"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Link sự kiện</span>
        <input
          type="url"
          required
          value={form.url}
          onChange={(change_event) =>
            set_form((current_form) => ({ ...current_form, url: change_event.target.value }))
          }
          placeholder="https://drive.google.com/..."
          className="min-h-10 rounded-lg border border-zinc-300 px-3"
        />
      </label>

      {status_text ? <p className="text-sm text-emerald-700">{status_text}</p> : null}
      {error_text ? <p className="text-sm text-red-600">{error_text}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          Lưu event
        </button>
        <button
          type="button"
          disabled={busy || !event}
          onClick={hide_event}
          className="min-h-10 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Ẩn / Xóa event
        </button>
      </div>
    </form>
  );
}
