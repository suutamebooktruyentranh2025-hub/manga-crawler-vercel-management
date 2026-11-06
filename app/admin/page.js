import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { load_admin_lists } from '@/lib/admin/store';
import { resolve_admin_dashboard_tab, ADMIN_HUB_LABEL } from '@/lib/admin/dashboard-tabs.mjs';
import { require_admin } from '@/lib/auth/require-admin';
import { load_site_event } from '@/lib/event/store';

export default async function AdminPage({ searchParams }) {
  const query = await searchParams;
  const admin_check = await require_admin();
  if (!admin_check.ok && admin_check.status === 401) {
    redirect('/');
  }
  if (!admin_check.ok && admin_check.status === 403) {
    redirect('/account');
  }
  if (!admin_check.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{ADMIN_HUB_LABEL}</h1>
        <p className="mt-4 text-sm text-red-600">{admin_check.error}</p>
      </div>
    );
  }

  const [lists, event_loaded] = await Promise.all([
    load_admin_lists(admin_check.service_client),
    load_site_event(admin_check.service_client),
  ]);
  if (!lists.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{ADMIN_HUB_LABEL}</h1>
        <p className="mt-4 text-sm text-red-600">{lists.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="sr-only">{ADMIN_HUB_LABEL}</h1>
      <AdminDashboard
        initial_logged_in={lists.logged_in}
        initial_pending={lists.pending}
        initial_tab={resolve_admin_dashboard_tab(query?.tab)}
        initial_event={event_loaded.ok ? event_loaded.event : null}
        event_error={event_loaded.ok ? '' : event_loaded.error}
      />
    </div>
  );
}
