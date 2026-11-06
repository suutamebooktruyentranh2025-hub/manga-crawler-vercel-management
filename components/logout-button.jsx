export function LogoutButton({ label = 'Đăng xuất' }) {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
      >
        {label}
      </button>
    </form>
  );
}
