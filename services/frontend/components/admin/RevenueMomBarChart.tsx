'use client';

import type { RevenueMoM } from '@/lib/admin';

function formatMomMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    return ym;
  }
  return new Date(y, m - 1, 1).toLocaleDateString('cs-CZ', {
    month: 'short',
    year: '2-digit',
  });
}

export function RevenueMomBarChart({ rows }: { rows: RevenueMoM[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        Žádná data (endpoint nedostupný nebo prázdná odpověď).
      </p>
    );
  }
  const chartPx = 160;
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);
  const fmt = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  });
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="text-xs text-gray-500 w-24 shrink-0 flex flex-col justify-between py-1 text-right hidden sm:flex">
        <span>{fmt.format(maxRev)}</span>
        <span>0 Kč</span>
      </div>
      <div className="flex-1">
        <div
          className="flex items-end gap-2 border-b border-gray-200"
          style={{ height: chartPx }}
        >
          {rows.map((row) => {
            const barH = Math.round((row.revenue / maxRev) * chartPx);
            return (
              <div
                key={row.month}
                className="flex-1 flex flex-col items-center justify-end h-full group"
              >
                <div
                  className="w-[72%] max-w-[56px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-purple-500 shadow-sm min-h-[3px] transition-transform group-hover:scale-[1.03]"
                  style={{ height: Math.max(row.revenue > 0 ? 6 : 3, barH) }}
                  title={`${row.month}: ${fmt.format(row.revenue)}`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          {rows.map((row) => (
            <div key={`${row.month}-lab`} className="flex-1 text-center min-w-0">
              <span className="text-xs text-gray-600 leading-tight block">
                {formatMomMonthLabel(row.month)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
