import { CatalogGallery } from '@/components/catalog-gallery';
import { load_catalog } from '@/lib/catalog/load-catalog';
import { get_session_profile } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }) {
  const query = await searchParams;
  const login_error = String(query?.login_error || '').trim();
  const session_profile = await get_session_profile();
  const catalog_result = await load_catalog({
    profile: session_profile,
  });

  return (
    <>
      {login_error ? (
        <p className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-red-600 sm:px-6">
          Đăng nhập thất bại: {login_error}
        </p>
      ) : null}
      <CatalogGallery initial_catalog={catalog_result} />
    </>
  );
}
