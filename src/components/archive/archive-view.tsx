'use client';

import { useState } from 'react';
import { formatVnd } from '@/lib/finance';
import { AccountModal } from '@/components/account/account-modal';
import type { Account, Milestone, HolderSession } from '@/lib/types';

interface ArchiveViewProps {
  accounts: Account[];
  milestones: Milestone[];
  sessions: HolderSession[];
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function ArchiveView({ accounts: initialAccounts, milestones, sessions }: ArchiveViewProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const sourcesList = Array.from(
    new Set(accounts.map((a) => (a as any).sourceName).filter(Boolean))
  );

  const filteredAccounts = accounts.filter((a) => {
    const term = searchTerm.toLowerCase();
    const sourceName = (a as any).sourceName ?? '';
    const matchesSearch =
      a.username.toLowerCase().includes(term) ||
      sourceName.toLowerCase().includes(term) ||
      (a.current_holder && a.current_holder.toLowerCase().includes(term));

    const matchesSource =
      selectedSource === 'all' || sourceName === selectedSource;

    const matchesStatus =
      selectedStatus === 'all' || a.status === selectedStatus;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const totalReceived = filteredAccounts.reduce(
    (sum, a) => sum + (a.amount_received ? Number(a.amount_received) : 0),
    0
  );

  const accountMilestones = modalAccount
    ? milestones.filter((m) => m.account_id === modalAccount.id)
    : [];

  const accountSessions = modalAccount
    ? sessions.filter((s) => s.account_id === modalAccount.id)
    : [];

  function handleUpdated(updated: Account) {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    setModalAccount((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }

  function handleDeleted(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setModalAccount(null);
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-gunmetal p-4">
          <p className="text-xs uppercase tracking-wide text-ash mb-1">Tổng acc hiển thị</p>
          <p className="font-mono text-xl font-bold text-white">
            {filteredAccounts.length}{' '}
            <span className="text-xs font-normal text-ash/60">/ {accounts.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-brass/30 bg-gunmetal p-4">
          <p className="text-xs uppercase tracking-wide text-ash mb-1">Tổng tiền thu về</p>
          <p className="font-mono text-xl font-bold text-brass">
            {formatVnd(totalReceived)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Username, Nguồn hoặc tên AE..."
            className="w-full rounded-lg border border-white/[0.06] bg-gunmetal px-3.5 py-2 pl-9 text-sm text-white placeholder-ash/50 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-ash/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-gunmetal px-3.5 py-2 text-sm text-white focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
        >
          <option value="all">Tất cả nguồn</option>
          {sourcesList.map((src) => (
            <option key={src as string} value={src as string}>
              {src as string}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-lg border border-white/[0.06] bg-gunmetal px-3.5 py-2 text-sm text-white focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="kho">Kho</option>
          <option value="dang_cay">Đang cày</option>
          <option value="done">Done</option>
          <option value="da_giao_cho_ben_thu">Đã giao bên thứ 3</option>
          <option value="da_nhan_tien">Đã nhận tiền</option>
        </select>
      </div>

      {/* Archive table */}
      <div className="rounded-xl border border-white/[0.06] bg-gunmetal overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-sm relative">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-white/[0.06] text-left text-ash text-xs uppercase tracking-wide bg-gunmetal shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Nguồn</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                <th className="px-4 py-3 font-medium">Hoàn tất</th>
                <th className="px-4 py-3 font-medium text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ash/50">
                    Không tìm thấy acc lưu trữ phù hợp.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    onClick={() => setModalAccount(acc)}
                    className="border-b border-white/[0.04] text-gray-300 hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brass/15 border border-brass/20 flex items-center justify-center">
                          <span className="text-brass font-bold text-xs">
                            {acc.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono font-medium text-white group-hover:text-brass transition-colors">
                          {acc.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ash text-xs">{(acc as any).sourceName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {acc.status === 'kho' && <span className="text-ash/60 bg-ash/10 px-2 py-0.5 rounded text-xs">Kho</span>}
                      {acc.status === 'dang_cay' && <span className="text-brass bg-brass/10 px-2 py-0.5 rounded text-xs">Đang cày</span>}
                      {acc.status === 'done' && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs">Done</span>}
                      {acc.status === 'da_giao_cho_ben_thu' && <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-xs">Đã giao</span>}
                      {acc.status === 'da_nhan_tien' && <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded text-xs">Đã nhận tiền</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-brass">
                      {formatVnd(Number(acc.amount_received ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-xs text-ash font-mono whitespace-nowrap">
                      {formatDate(acc.paid_at)}
                    </td>
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

      {/* Full Account Detail Modal */}
      {modalAccount && (
        <AccountModal
          account={modalAccount}
          milestones={accountMilestones}
          sessions={accountSessions}
          onClose={() => setModalAccount(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
