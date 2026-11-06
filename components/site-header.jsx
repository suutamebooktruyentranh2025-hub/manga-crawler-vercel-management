import Link from 'next/link';
import { LoginButton } from './login-button';
import { EventLink } from './event-link';
import { BrandHomeLink } from './brand-home-link';
import { header_avatar_initial } from '@/lib/ui/header-nav.mjs';
import { ADMIN_HUB_LABEL } from '@/lib/admin/dashboard-tabs.mjs';

export function SiteHeader({ profile, site_event = null, event = null }) {
  const active_event = site_event || event;
  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <BrandHomeLink />
        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          {profile ? (
            <>
              <EventLink event={active_event} />
              {profile.is_admin ? (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {ADMIN_HUB_LABEL}
                </Link>
              ) : null}
              <Link
                href="/account"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
                title={`${profile.email} · ${profile.user_type}`}
                aria-label={`Tài khoản · ${profile.email} · ${profile.user_type}`}
              >
                {header_avatar_initial(profile.email)}
              </Link>
            </>
          ) : (
            <>
              <EventLink event={active_event} />
              <LoginButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
