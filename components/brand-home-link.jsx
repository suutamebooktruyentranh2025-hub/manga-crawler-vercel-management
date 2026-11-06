'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { should_show_home_back_cue } from '@/lib/ui/header-nav.mjs';

function HomeCueIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="block h-6 w-6 shrink-0 translate-y-px transition group-hover:brightness-110"
    >
      <defs>
        <linearGradient id="home_cue_fill" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        fill="url(#home_cue_fill)"
        d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.69-8.69a2.25 2.25 0 0 0-3.18 0l-8.69 8.69a.75.75 0 0 0 1.06 1.06z"
      />
      <path
        fill="url(#home_cue_fill)"
        d="m12 5.43 8.16 8.16c.03.03.06.06.09.09v6.2c0 1.03-.84 1.87-1.87 1.87H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.63c-1.04 0-1.88-.84-1.88-1.88v-6.2c.03-.03.06-.06.09-.08z"
      />
    </svg>
  );
}

export function BrandHomeLink() {
  const pathname = usePathname();
  const show_home_cue = should_show_home_back_cue(pathname);

  return (
    <Link
      href="/"
      title="Về trang chính"
      aria-label="Về trang chính"
      className="group inline-flex min-h-10 max-w-full items-center gap-1.5 text-zinc-900"
    >
      {show_home_cue ? <HomeCueIcon /> : null}
      <span className="truncate text-base font-semibold leading-none tracking-tight">
        Sưu tầm Ebook Truyện Tranh
      </span>
    </Link>
  );
}
