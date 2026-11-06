'use client';

import { useSyncExternalStore, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminOverview } from '@/components/admin-overview';
import { AdminPanel } from '@/components/admin-panel';
import { AdminRevenuePanel } from '@/components/admin-revenue-panel';
import { EventSettingsForm } from '@/components/event-settings-form';
import { ADMIN_DASHBOARD_TABS, admin_dashboard_href } from '@/lib/admin/dashboard-tabs.mjs';

const emptySubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function AdminDashboard({
  initial_logged_in,
  initial_pending,
  initial_tab = 'overview',
  initial_event = null,
  event_error = '',
}) {
  const router = useRouter();
  const [active_tab, set_active_tab] = useState(initial_tab);
  const [prev_initial_tab, set_prev_initial_tab] = useState(initial_tab);
  const [user_type_filter, set_user_type_filter] = useState('');
  const [logged_in, set_logged_in] = useState(initial_logged_in);
  const has_mounted = useHasMounted();

  if (initial_tab !== prev_initial_tab) {
    set_prev_initial_tab(initial_tab);
    set_active_tab(initial_tab);
  }

  function select_tab(next_tab) {
    set_active_tab(next_tab);
    router.replace(admin_dashboard_href(next_tab));
  }

  function select_user_type(next_user_type) {
    set_user_type_filter(next_user_type);
    select_tab('users');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-2xl bg-zinc-100 p-1 text-sm sm:rounded-full">
        {ADMIN_DASHBOARD_TABS.map((tab_item) => (
          <button
            key={tab_item.key}
            type="button"
            onClick={() => select_tab(tab_item.key)}
            className={`rounded-full px-4 py-2 ${
              active_tab === tab_item.key ? 'bg-white shadow-sm' : 'text-zinc-600'
            }`}
          >
            {tab_item.label}
          </button>
        ))}
      </div>

      {active_tab === 'overview' ? (
        <AdminOverview logged_in={logged_in} onSelectUserType={select_user_type} />
      ) : null}

      <div className={active_tab === 'users' ? '' : 'hidden'}>
        {has_mounted ? (
          <AdminPanel
            initial_logged_in={initial_logged_in}
            initial_pending={initial_pending}
            user_type_filter={user_type_filter}
            onUserTypeFilterChange={set_user_type_filter}
            onListsChange={set_logged_in}
          />
        ) : null}
      </div>

      {active_tab === 'revenue' ? <AdminRevenuePanel logged_in={logged_in} /> : null}

      {active_tab === 'event' ? (
        event_error ? (
          <div>
            <p className="text-sm text-red-600">{event_error}</p>
            <p className="mt-2 text-sm text-zinc-600">
              Nếu chưa tạo bảng, chạy SQL trong supabase/migrations/20260916000000_site_event.sql
              trên Supabase.
            </p>
          </div>
        ) : (
          <EventSettingsForm initial_event={initial_event} />
        )
      ) : null}
    </div>
  );
}
