import { Geist } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { get_session_profile } from '@/lib/auth/session';
import { create_server_client } from '@/lib/supabase/server';
import { load_site_event } from '@/lib/event/store';
import './globals.css';

const geist_sans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sưu Tầm Ebook Truyện Tranh',
  description: 'Quản lý tài khoản Sưu Tầm Ebook Truyện Tranh',
};

async function read_site_event() {
  try {
    const supabase = await create_server_client();
    const loaded = await load_site_event(supabase);
    return loaded.ok ? loaded.event : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const [profile, site_event] = await Promise.all([
    get_session_profile(),
    read_site_event(),
  ]);

  return (
    <html lang="vi" className={`${geist_sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <div className="flex min-h-full flex-col">
          <SiteHeader profile={profile} site_event={site_event} />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
