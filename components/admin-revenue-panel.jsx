'use client';

import { estimate_revenue, format_vnd } from '@/lib/admin/dashboard-stats.mjs';

export function AdminRevenuePanel({ logged_in }) {
  const revenue_summary = estimate_revenue(logged_in);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Ước tính theo giá niêm yết × số user đang có gói (không tính Admin). Sai số nếu tặng hoặc giảm giá.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Gói</th>
              <th className="px-4 py-3 font-medium">Giá niêm yết</th>
              <th className="px-4 py-3 font-medium">Số user</th>
              <th className="px-4 py-3 font-medium">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {revenue_summary.by_package.map((package_row) => (
              <tr key={package_row.package_key} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">{package_row.label}</td>
                <td className="px-4 py-3 text-zinc-700">{format_vnd(package_row.price_vnd)}</td>
                <td className="px-4 py-3 text-zinc-700">{package_row.user_count}</td>
                <td className="px-4 py-3 text-zinc-700">{format_vnd(package_row.subtotal_vnd)}</td>
              </tr>
            ))}
            <tr className="border-t border-zinc-200 bg-zinc-50">
              <td className="px-4 py-3 font-medium text-zinc-900" colSpan={3}>
                Tổng
              </td>
              <td className="px-4 py-3 font-semibold text-zinc-900">
                {format_vnd(revenue_summary.total_vnd)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
