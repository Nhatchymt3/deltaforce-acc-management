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
        <div className="rounded-xl border border-white/[0.06] bg-gunmetal p-4">
          <p className="text-xs uppercase tracking-wide text-ash mb-1">Tổng acc hiển thị</p>
          <p className="font-mono text-xl font-bold text-white">{filteredRows.length} <span className="text-xs font-normal text-ash/60">/ {rows.length}</span></p>
        </div>
        <div className="rounded-xl border border-brass/30 bg-gunmetal p-4">
          <p className="text-xs uppercase tracking-wide text-ash mb-1">Tổng tiền thu về</p>
          <p className="font-mono text-xl font-bold text-brass">
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
            className="w-full rounded-lg border border-white/[0.06] bg-gunmetal px-3.5 py-2 pl-9 text-sm text-white placeholder-ash/50 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Archive table */}
      <div className="rounded-xl border border-white/[0.06] bg-gunmetal overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-ash text-xs uppercase tracking-wide bg-midnight/40">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Nguồn</th>
                <th className="px-4 py-3 font-medium">AE cày</th>
                <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                <th className="px-4 py-3 font-medium">Hoàn tất</th>
                <th className="px-4 py-3 font-medium text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ash/50">
                    Không tìm thấy acc lưu trữ phù hợp.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="border-b border-white/[0.04] text-gray-300 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brass/15 border border-brass/20 flex items-center justify-center">
                          <span className="text-brass font-bold text-xs">
                            {row.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono font-medium text-white group-hover:text-brass transition-colors">{row.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ash text-xs">{row.sourceName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.holders.length === 0 ? (
                          <span className="text-ash/40 text-xs">—</span>
                        ) : (
                          row.holders.map((h) => (
                            <span key={h} className="inline-flex items-center rounded bg-midnight border border-white/[0.06] px-2 py-0.5 text-xs text-gray-300">
                              {h}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-brass">
                      {formatVnd(row.amount_received)}
                    </td>
                    <td className="px-4 py-3 text-xs text-ash font-mono whitespace-nowrap">{formatDate(row.paid_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="rounded p-1 text-ash hover:text-white hover:bg-white/10 transition-colors">
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
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedRow(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-gunmetal p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
                  <span className="text-brass font-bold text-sm">
                    {selectedRow.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-mono font-bold text-white text-base">{selectedRow.username}</h3>
                  <p className="text-[11px] text-brass font-medium">Đã thanh toán (Lưu trữ)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="rounded p-1 text-ash hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content info grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-ash">Nguồn</span>
                <span className="font-medium text-white">{selectedRow.sourceName}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                <span className="text-ash">Tổng tiền nhận</span>
                <span className="font-mono font-bold text-brass text-sm">{formatVnd(selectedRow.amount_received)}</span>
              </div>

              <div className="py-1 border-b border-white/[0.04]">
                <span className="text-ash block mb-1">AE đã tham gia cày</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRow.holders.length === 0 ? (
                    <span className="text-ash/40">Không có thông tin</span>
                  ) : (
                    selectedRow.holders.map((h) => (
                      <span key={h} className="rounded bg-midnight px-2 py-0.5 text-xs text-gray-300 border border-white/[0.06]">
                        {h}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="pt-1 space-y-1.5 font-mono">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ash/60 block">Tiến trình thời gian</span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-ash">
                    <span>Bấm Done:</span>
                    <span className="text-gray-300">{formatDate(selectedRow.completed_at)}</span>
                  </div>
                  <div className="flex justify-between text-ash">
                    <span>Đã giao bên thứ:</span>
                    <span className="text-gray-300">{formatDate(selectedRow.delivered_at)}</span>
                  </div>
                  <div className="flex justify-between text-ash">
                    <span>Nhận tiền & lưu trữ:</span>
                    <span className="text-brass font-medium">{formatDate(selectedRow.paid_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedRow(null)}
                className="w-full rounded-lg border border-white/[0.06] bg-midnight py-2 text-xs font-medium text-ash hover:text-white transition-colors"
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
