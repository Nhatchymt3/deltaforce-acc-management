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
  const [searchTerm, setSearchTerm] = useState<string>('');

  const summary = calculateFinance(initialAccounts);
  const holderRows = formatHolders(summary.byHolder);

  const filteredAccounts = summary.accounts.filter((acc) => {
    if (!selectedHolder) return true;
    return acc.holders.includes(selectedHolder);
  });

  const searchedAccounts = filteredAccounts.filter((acc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      acc.username.toLowerCase().includes(term) ||
      acc.holders.some((h) => h.toLowerCase().includes(term))
    );
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-base font-semibold text-white tracking-wide">
            Chi tiết từng acc {selectedHolder ? `(của ${selectedHolder})` : ''}
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm username, AE..."
                className="w-full rounded-lg border border-white/[0.06] bg-gunmetal px-3 py-1.5 pl-8 text-xs text-white placeholder-ash/50 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1.5 text-ash/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-ash/60">Hiển thị {searchedAccounts.length} acc</span>
          </div>
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
                {searchedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-ash/50">
                      Không có acc nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  searchedAccounts.map((row) => (
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
