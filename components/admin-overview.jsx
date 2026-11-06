'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  bucket_revenue,
  bucket_signups,
  count_by_user_type,
  estimate_revenue,
  format_vnd,
} from '@/lib/admin/dashboard-stats.mjs';
import { ChartErrorBoundary } from '@/components/chart-error-boundary';

const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const GRAIN_OPTIONS = [
  { key: 'day', label: 'Ngày' },
  { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' },
];

const RANK_CHART_COLORS = {
  Free: '#a1a1aa',
  Member: '#059669',
  'Super Member': '#7c3aed',
  'Premium Member': '#d97706',
  Admin: '#18181b',
};

function ChartFrame({ title, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-medium text-zinc-800">{title}</h2>
      <div className="mt-4 h-72 w-full">
        <ChartErrorBoundary>{children}</ChartErrorBoundary>
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

export function AdminOverview({ logged_in, onSelectUserType }) {
  const [time_grain, set_time_grain] = useState('day');
  const is_client = useIsClient();
  const now_date = useMemo(() => (is_client ? new Date() : null), [is_client]);

  const signup_rows = useMemo(
    () => (now_date ? bucket_signups(logged_in, time_grain, now_date) : []),
    [logged_in, time_grain, now_date],
  );
  const rank_rows = useMemo(() => count_by_user_type(logged_in), [logged_in]);
  const revenue_summary = useMemo(
    () => (now_date ? estimate_revenue(logged_in, now_date) : { total_vnd: 0 }),
    [logged_in, now_date],
  );
  const revenue_rows = useMemo(
    () => (now_date ? bucket_revenue(logged_in, time_grain, now_date) : []),
    [logged_in, time_grain, now_date],
  );

  const new_in_period = signup_rows.reduce((sum_value, period_row) => sum_value + period_row.count, 0);
  const rank_total = rank_rows.reduce((sum_value, rank_row) => sum_value + rank_row.count, 0);

  if (!now_date) {
    return <p className="text-sm text-zinc-500">Đang tải tổng quan…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Đã login" value={String(logged_in.length)} />
        <StatCard label="User mới trong kỳ" value={String(new_in_period)} />
        <StatCard label="Doanh thu ước tính" value={format_vnd(revenue_summary.total_vnd)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-700">Theo</span>
        <div className="flex rounded-full bg-zinc-100 p-1 text-sm">
          {GRAIN_OPTIONS.map((grain_option) => (
            <button
              key={grain_option.key}
              type="button"
              onClick={() => set_time_grain(grain_option.key)}
              className={`rounded-full px-4 py-2 ${
                time_grain === grain_option.key ? 'bg-white shadow-sm' : 'text-zinc-600'
              }`}
            >
              {grain_option.label}
            </button>
          ))}
        </div>
      </div>

      <ChartFrame title="Doanh thu ước tính">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenue_rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#52525b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#52525b' }} width={64} tickFormatter={(value) => format_vnd(value)} />
            <Tooltip formatter={(amount_value) => [format_vnd(amount_value), 'Ước tính']} />
            <Bar dataKey="amount_vnd" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <p className="text-xs text-zinc-500">
        Ước tính theo giá niêm yết của gói đang hiệu lực. Không trừ tặng/giảm giá; mốc thời gian theo lần
        cập nhật gói.
      </p>

      <ChartFrame title="Thành viên mới">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={signup_rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#52525b' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#52525b' }} width={36} />
            <Tooltip
              formatter={(count_value) => [count_value, 'User mới']}
              labelFormatter={(label_value) => label_value}
            />
            <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-800">Thành viên theo nhóm</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {rank_rows.map((rank_row) => (
            <button
              key={rank_row.user_type}
              type="button"
              onClick={() => onSelectUserType(rank_row.user_type)}
              className="rounded-xl border border-zinc-200 px-3 py-3 text-left hover:bg-zinc-50"
            >
              <p className="text-xs font-medium text-zinc-500">{rank_row.user_type}</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{rank_row.count}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 h-72 w-full">
          <ChartErrorBoundary>
            {rank_total === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-500">Chưa có thành viên đã login.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rank_rows.filter((rank_row) => rank_row.count > 0)}
                    dataKey="count"
                    nameKey="user_type"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={92}
                    onClick={(slice_row) => {
                      const selected_type =
                        slice_row?.user_type || slice_row?.payload?.user_type || slice_row?.name;
                      if (selected_type) onSelectUserType(selected_type);
                    }}
                    cursor="pointer"
                  >
                    {rank_rows
                      .filter((rank_row) => rank_row.count > 0)
                      .map((rank_row) => (
                        <Cell key={rank_row.user_type} fill={RANK_CHART_COLORS[rank_row.user_type]} />
                      ))}
                  </Pie>
                  <Tooltip formatter={(count_value, user_type) => [count_value, user_type]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartErrorBoundary>
        </div>
      </section>
    </div>
  );
}
