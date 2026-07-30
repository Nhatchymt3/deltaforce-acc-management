'use client';

import { useState } from 'react';
import { calculateFinance, formatVnd, formatHolders } from '@/lib/finance';

export type FinanceAccount = {
  id: string;
  username: string;
  amount_received: string;
  holders: string[];
};

export function FinanceView({ initialAccounts }: { initialAccounts: FinanceAccount[] }) {
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);

  const summary = calculateFinance(initialAccounts);
  const holderRows = formatHolders(summary.byHolder);

  const filteredAccounts = summary.accounts.filter((acc) => {
    if (!selectedHolder) return true;
    return acc.holders.includes(selectedHolder);
  });

  return (
    <div className="space-y-8">
      {/* Per-holder totals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-white tracking-wide">
            Tổng thu nhập theo AE
          </h2>
          {selectedHolder && (
            <button
              onClick={() => setSelectedHolder(null)}
              className="text-xs text-brass hover:underline"
            >
              Bỏ lọc (Xem tất cả)
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {holderRows.length === 0 ? (
            <div className="col-span-full rounded-xl border border-white/[0.06] bg-gunmetal p-8 text-center text-ash/50 text-sm">
              Chưa có dữ liệu thu nhập.
            </div>
          ) : (
            holderRows.map(({ holder, formatted }) => {
              const isSelected = selectedHolder === holder;
              return (
                <article
                  key={holder}
                  onClick={() => setSelectedHolder(isSelected ? null : holder)}
                  className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-brass bg-brass/10'
                      : 'border-white/[0.06] bg-gunmetal hover:border-brass/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
                        <span className="text-brass font-bold text-xs">
                          {holder.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white">{holder}</p>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-brass/20 px-1.5 py-0.5 text-[10px] font-semibold text-brass">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xl font-bold text-brass">
                    {formatted}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Per-account breakdown */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-white tracking-wide">
            Chi tiết từng acc {selectedHolder ? `(của ${selectedHolder})` : ''}
          </h2>
          <span className="text-xs font-mono text-ash/60">Hiển thị {filteredAccounts.length} acc</span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-gunmetal overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-ash text-xs uppercase tracking-wide bg-midnight/40">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">AE cày chung</th>
                  <th className="px-4 py-3 font-medium text-right">Tổng tiền thu</th>
                  <th className="px-4 py-3 font-medium text-right">Chia cho mỗi AE</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ash/50">
                      Không có acc nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] text-gray-300 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-brass/15 border border-brass/20 flex items-center justify-center">
                            <span className="text-brass font-bold text-xs">
                              {row.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-mono font-medium text-white">{row.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.holders.map((h) => (
                            <span
                              key={h}
                              className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                                h === selectedHolder
                                  ? 'bg-brass/20 border border-brass/40 text-brass font-semibold'
                                  : 'bg-midnight border border-white/[0.06] text-ash'
                              }`}
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-ash">{formatVnd(row.amount_received)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-brass">
                        {formatVnd(row.share)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
