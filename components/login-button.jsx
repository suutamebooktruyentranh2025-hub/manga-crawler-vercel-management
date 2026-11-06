'use client';

import { useState } from 'react';
import { create_browser_client } from '@/lib/supabase/client';

export function LoginButton({ label = 'Đăng nhập Google' }) {
  const [busy, set_busy] = useState(false);
  const [error_text, set_error_text] = useState('');

  async function start_google_login() {
    set_error_text('');
    set_busy(true);
    try {
      const supabase = create_browser_client();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        set_error_text(error.message);
        set_busy(false);
      }
    } catch (error) {
      set_error_text(String(error?.message || error));
      set_busy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={start_google_login}
        disabled={busy}
        className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
      >
        {busy ? 'Đang chuyển tới Google…' : label}
      </button>
      {error_text ? <p className="max-w-xs text-right text-xs text-red-600">{error_text}</p> : null}
    </div>
  );
}
