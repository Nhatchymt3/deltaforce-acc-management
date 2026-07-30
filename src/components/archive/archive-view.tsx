'use client';

import { useState } from 'react';
import { formatVnd } from '@/lib/finance';

export type ArchiveRow = {
  id: string;
  username: string;
  password?: string | null;
  amount_received: string;
  sourceName: string;
  holders: string[];
  completed_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function ArchiveView({ rows }: { rows: ArchiveRow[] }) {
  const [selectedRow, setSelectedRow] = useState<ArchiveRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = rows.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.username.toLowerCase().includes(term) ||
      r.sourceName.toLowerCase().includes(term) ||
      r.holders.some((h) => h.toLowerCase().includes(term))
    );
  });

  const totalReceived = filteredRows.reduce((sum, r) => sum + Number(r.amount_received), 0);

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Tổng acc hiển thị</p>
          <p className="text-2xl font-bold text-white">{filteredRows.length} <span className="text-xs font-normal text-slate-500">/ {rows.length}</span></p>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-950/40 to-emerald-950/40 backdrop-blur-xl p-5 shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Tổng tiền thu về</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
            {formatVnd(totalReceived)}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Username, Nguồn hoặc tên AE..."
            className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:border-green-400/40 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all"
          />
          <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Archive table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-slate-400 text-xs uppercase tracking-wide bg-white/[0.02]">
                <th className="px-5 py-3.5 font-medium">Username</th>
                <th className="px-5 py-3.5 font-medium">Nguồn</th>
                <th className="px-5 py-3.5 font-medium">AE cày</th>
                <th className="px-5 py-3.5 font-medium text-right">Tổng tiền</th>
                <th className="px-5 py-3.5 font-medium">Hoàn tất</th>
                <th className="px-5 py-3.5 font-medium text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Không tìm thấy acc lưu trữ phù hợp.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="border-b border-white/5 text-slate-300 hover:bg-white/[0.06] cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
                          <span className="text-green-400 font-semibold text-xs">
                            {row.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-white group-hover:text-green-300 transition-colors">{row.username}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{row.sourceName}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.holders.length === 0 ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : (
                          row.holders.map((h) => (
                            <span key={h} className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-300">
                              {h}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-green-300">
                      {formatVnd(row.amount_received)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.paid_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedRow(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 shadow-2xl space-y-5 animate-[scaleIn_0.2s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
                  <span className="text-green-400 font-bold text-base">
                    {selectedRow.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedRow.username}</h3>
                  <p className="text-xs text-green-400 font-medium">Đã thanh toán (Lưu trữ)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content info grid */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-400">Nguồn</span>
                <span className="font-medium text-white">{selectedRow.sourceName}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-400">Tổng tiền nhận</span>
                <span className="font-bold text-green-300 text-base">{formatVnd(selectedRow.amount_received)}</span>
              </div>

              <div className="py-1.5 border-b border-white/5">
                <span className="text-slate-400 block mb-1">AE đã tham gia cày</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRow.holders.length === 0 ? (
                    <span className="text-slate-500 text-xs">Không có thông tin</span>
                  ) : (
                    selectedRow.holders.map((h) => (
                      <span key={h} className="rounded-md bg-white/10 px-2 py-1 text-xs text-white">
                        {h}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-2 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Tiến trình thời gian</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Bấm Done:</span>
                    <span className="text-slate-200">{formatDate(selectedRow.completed_at)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Đã giao bên thứ:</span>
                    <span className="text-slate-200">{formatDate(selectedRow.delivered_at)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Nhận tiền & lưu trữ:</span>
                    <span className="text-green-300 font-medium">{formatDate(selectedRow.paid_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedRow(null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
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
