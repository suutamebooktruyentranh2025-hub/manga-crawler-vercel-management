import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { CONTACT_LINKS, get_tier_access } from '@/lib/account/tier-info';
import { get_session_profile } from '@/lib/auth/session';
import { format_vi_date } from '@/lib/ui/format';

function PackageCard({ package_info }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {package_info.title}
      </h2>
      <p
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium ${package_info.badge_class}`}
      >
        {package_info.label}
      </p>
      <p className="mt-3 text-sm text-zinc-600">{package_info.detail || '—'}</p>
    </section>
  );
}

export default async function AccountPage() {
  const profile = await get_session_profile();
  if (!profile) {
    redirect('/');
  }

  const tier = get_tier_access(profile);
  const display_initial = (profile.email || '?').slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white">
          {display_initial}
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Tài khoản</h1>
        <p className="mt-1 break-all text-sm text-zinc-600">{profile.email}</p>
        <p className="mt-3 text-sm text-zinc-500">Đăng ký {format_vi_date(profile.created_at)}</p>
        <div className="mt-5 flex justify-center">
          <LogoutButton />
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PackageCard package_info={tier.app_package} />
        <PackageCard package_info={tier.catalog_package} />
      </div>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Liên hệ Admin
        </h2>
        <ul className="mt-3 space-y-2.5">
          {CONTACT_LINKS.map((item) => (
            <li key={item.href} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="w-20 shrink-0 text-sm text-zinc-500">{item.label}</span>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
