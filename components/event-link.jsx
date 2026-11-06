'use client';

import { useEffect, useState } from 'react';
import { resolve_event } from '@/lib/ui/event-countdown';

const BUTTON_CLASS =
  'inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-amber-500 px-4 text-sm font-semibold text-white shadow-sm';

export function EventLink({ event }) {
  const [now_ms, set_now_ms] = useState(null);

  useEffect(() => {
    const timeout_id = window.setTimeout(() => {
      set_now_ms(Date.now());
    }, 0);
    const interval_id = window.setInterval(() => {
      set_now_ms(Date.now());
    }, 1_000);
    return () => {
      window.clearTimeout(timeout_id);
      window.clearInterval(interval_id);
    };
  }, []);

  if (now_ms == null) return null;

  const state = resolve_event(now_ms, event);
  if (!state.visible) return null;

  const title = event?.title || 'Bí Cảnh Tông Môn';
  const countdown = state.label ? (
    <span className="ml-2 text-xs font-medium text-white/90">{state.label}</span>
  ) : null;

  if (!state.clickable) {
    return (
      <span role="status" className={`${BUTTON_CLASS} cursor-not-allowed opacity-90`}>
        {title}
        {countdown}
      </span>
    );
  }

  return (
    <a
      href={state.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BUTTON_CLASS} transition hover:from-violet-500 hover:to-amber-400`}
    >
      {title}
      {countdown}
    </a>
  );
}
