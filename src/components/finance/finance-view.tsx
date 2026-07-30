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
    <div className="space-y-10">
      {/* Per-holder totals */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Tổng thu nhập theo AE</h2>
          </div>
          {selectedHolder && (
            <button
              onClick={() => setSelectedHolder(null)}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              Bỏ lọc (Xem tất cả)
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {holderRows.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 text-center text-slate-500">
              Chưa có dữ liệu thu nhập.
            </div>
          ) : (
            holderRows.map(({ holder, total, formatted }) => {
              const isSelected = selectedHolder === holder;
              return (
                <article
                  key={holder}
                  onClick={() => setSelectedHolder(isSelected ? null : holder)}
                  className={`group cursor-pointer rounded-2xl border backdrop-blur-xl p-5 transition-all duration-300 ${
                    isSelected
                      ? 'border-green-400 bg-green-950/40 shadow-xl shadow-green-500/10 scale-[1.02]'
                      : 'border-white/5 bg-white/[0.03] hover:border-green-400/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
                        <span className="text-green-400 font-bold text-xs">
                          {holder.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">{holder}</p>
                    </div>
                    {isSelected && (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-300">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">
              Chi tiết từng acc {selectedHolder ? `(của ${selectedHolder})` : ''}
            </h2>
          </div>
          <span className="text-xs text-slate-400">Hiển thị {filteredAccounts.length} acc</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-slate-400 text-xs uppercase tracking-wide bg-white/[0.02]">
                  <th className="px-5 py-3.5 font-medium">Username</th>
                  <th className="px-5 py-3.5 font-medium">AE cày chung</th>
                  <th className="px-5 py-3.5 font-medium text-right">Tổng tiền thu</th>
                  <th className="px-5 py-3.5 font-medium text-right">Chia cho mỗi AE</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500">
                      Không có acc nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 text-slate-300 hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                            <span className="text-cyan-400 font-semibold text-xs">
                              {row.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-white">{row.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {row.holders.map((h) => (
                            <span
                              key={h}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                h === selectedHolder
                                  ? 'bg-green-500/20 border border-green-400/40 text-green-300 font-semibold'
                                  : 'bg-white/5 border border-white/10 text-slate-400'
                              }`}
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-300">{formatVnd(row.amount_received)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-cyan-300">
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
