'use client';

import { useState, useMemo } from 'react';
import { calculateFinance, formatVnd, formatHolders } from '@/lib/finance';

export type FinanceAccount = {
  id: string;
  username: string;
  amount_received: string;
  sourceName?: string;
  holders: string[];
  lastHolder?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  paid_at?: string | null;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function FinanceView({ initialAccounts }: { initialAccounts: FinanceAccount[] }) {
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const summary = useMemo(() => calculateFinance(initialAccounts), [initialAccounts]);
  const holderRows = useMemo(() => formatHolders(summary.byHolder), [summary.byHolder]);

  const filteredAccounts = useMemo(() => summary.accounts.filter((acc) => {
    if (!selectedHolder) return true;
    return acc.holders.includes(selectedHolder);
  }), [summary.accounts, selectedHolder]);

  const searchedAccounts = useMemo(() => filteredAccounts.filter((acc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      acc.username.toLowerCase().includes(term) ||
      acc.holders.some((h) => h.toLowerCase().includes(term))
    );
  }), [filteredAccounts, searchTerm]);

  return (
    <div className="space-y-8">
      {/* Per-holder totals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-foreground tracking-wide">
            Tổng thu nhập theo AE
          </h2>
          {selectedHolder && (
            <button
              onClick={() => setSelectedHolder(null)}
              className="text-xs text-primary hover:underline"
            >
              Bỏ lọc (Xem tất cả)
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {holderRows.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border bg-card p-8 text-center text-muted-foreground/50 text-sm">
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
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-primary font-bold text-xs">
                          {holder.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{holder}</p>
                    </div>
                    {isSelected && (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xl font-bold text-primary">
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
          <h2 className="font-display text-base font-semibold text-foreground tracking-wide">
            Chi tiết từng acc {selectedHolder ? `(của ${selectedHolder})` : ''}
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm username, AE..."
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 pl-8 text-xs text-foreground placeholder-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1.5 text-muted-foreground/50 hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground/60">Hiển thị {searchedAccounts.length} acc</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[350px] scrollbar-thin">
            <table className="w-full text-sm relative">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wide bg-card shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">AE cày chung</th>
                  <th className="px-4 py-3 font-medium text-right">Tổng tiền thu</th>
                  <th className="px-4 py-3 font-medium text-right">Tiền mỗi AE nhận</th>
                </tr>
              </thead>
              <tbody>
                {searchedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground/50">
                      Không có acc nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  searchedAccounts.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedAccount(row)}
                      className="border-b border-border/30 text-muted-foreground hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-primary/15 border border-primary/20 flex items-center justify-center">
                            <span className="text-primary font-bold text-xs">
                              {row.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-mono font-medium text-foreground group-hover:text-primary transition-colors">{row.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.holders.map((h) => (
                            <span
                              key={h}
                              className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                                h === selectedHolder
                                  ? 'bg-primary/20 border border-primary/40 text-primary font-semibold'
                                  : 'bg-background border border-border text-muted-foreground'
                              }`}
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatVnd(row.amount_received)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
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

      {/* Account Timeline & Payment Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedAccount(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-card p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {selectedAccount.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-mono font-bold text-foreground text-base">{selectedAccount.username}</h3>
                  <p className="text-[11px] text-primary font-medium">Đã thanh toán tài chính</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAccount(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content info grid */}
            <div className="space-y-2.5 text-xs">
              {selectedAccount.sourceName && (
                <div className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Nguồn</span>
                  <span className="font-medium text-foreground">{selectedAccount.sourceName}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Tổng tiền nhận</span>
                <span className="font-mono font-bold text-primary text-sm">{formatVnd(selectedAccount.amount_received)}</span>
              </div>

              <div className="py-1 border-b border-border/30">
                <span className="text-muted-foreground block mb-1">AE đã tham gia cày</span>
                <div className="flex flex-wrap gap-1">
                  {selectedAccount.holders.length === 0 ? (
                    <span className="text-muted-foreground/40">Không có thông tin</span>
                  ) : (
                    selectedAccount.holders.map((h) => (
                      <span key={h} className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground border border-border">
                        {h}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-1 space-y-1.5 font-mono">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block">Tiến trình thời gian</span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Bấm Done:</span>
                    <span className="text-muted-foreground">{formatDate(selectedAccount.completed_at)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Đã giao bên thứ:</span>
                    <span className="text-muted-foreground">{formatDate(selectedAccount.delivered_at)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Nhận tiền & lưu trữ:</span>
                    <span className="text-primary font-medium">{formatDate(selectedAccount.paid_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedAccount(null)}
                className="w-full rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
