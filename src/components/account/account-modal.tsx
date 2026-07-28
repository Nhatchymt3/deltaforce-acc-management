'use client';

import { useState, useEffect } from 'react';
import {
  transitionAccount,
  uploadAccountImage,
  clearAccountImage,
  getSignedImageUrl,
} from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession } from '@/lib/types';

const STATUS_LABELS: Record<Account['status'], string> = {
  kho: 'Kho',
  dang_cay: 'Đang cày',
  done: 'Done',
  da_giao_cho_ben_thu: 'Đã giao',
  da_nhan_tien: 'Đã nhận tiền',
};

const STATUS_COLORS: Record<Account['status'], { bg: string; border: string; text: string }> = {
  kho: { bg: 'bg-slate-900/60', border: 'border-slate-600/30', text: 'text-slate-300' },
  dang_cay: { bg: 'bg-yellow-900/40', border: 'border-yellow-600/30', text: 'text-yellow-300' },
  done: { bg: 'bg-blue-900/40', border: 'border-blue-600/30', text: 'text-blue-300' },
  da_giao_cho_ben_thu: { bg: 'bg-orange-900/40', border: 'border-orange-600/30', text: 'text-orange-300' },
  da_nhan_tien: { bg: 'bg-green-900/40', border: 'border-green-600/30', text: 'text-green-300' },
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

// Milestone display: lv${level}-${price}
function formatMilestone(m: Milestone): string {
  return `lv${m.level}-${m.price}`;
}

// ─── Milestone level badge ───────────────────────────────────────────────────
function MilestoneBadge({ milestone, isTarget }: { milestone: Milestone; isTarget: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
        isTarget
          ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-950/60 to-violet-950/60 shadow-lg shadow-cyan-500/10'
          : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2">
        {isTarget && (
          <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <div>
          <span className="font-semibold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
            {formatMilestone(milestone)}
          </span>
          {milestone.note && (
            <span className="ml-2 text-xs text-slate-500">{milestone.note}</span>
          )}
        </div>
      </div>
      {isTarget && (
        <span className="text-xs font-medium text-cyan-400/60">Mốc giao</span>
      )}
    </div>
  );
}

// ─── Tab component ────────────────────────────────────────────────────────────
type Tab = 'detail' | 'history';

interface AccountModalProps {
  account: Account;
  milestones: Milestone[];
  sessions: HolderSession[];
  onClose: () => void;
  onUpdated: (updated: Account) => void;
}

export function AccountModal({ account, milestones, sessions, onClose, onUpdated }: AccountModalProps) {
  const [tab, setTab] = useState<Tab>('detail');
  const [editingLevel, setEditingLevel] = useState(false);
  const [levelValue, setLevelValue] = useState(String(account.current_level));
  const [payAmount, setPayAmount] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(account.target_milestone_id ?? '');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch signed URL for image ──────────────────────────────────────────────
  useEffect(() => {
    if (!account.image_url) return;
    let cancelled = false;
    getSignedImageUrl(account.image_url)
      .then((url) => { if (!cancelled) setSignedUrl(url); })
      .catch(() => { if (!cancelled) setSignedUrl(null); });
    return () => { cancelled = true; };
  }, [account.image_url]);

  // ─── Action helpers ───────────────────────────────────────────────────────────
  async function performAction(
    action: 'done' | 'deliver' | 'pay' | 'update_level',
    extra?: Record<string, unknown>
  ) {
    setError(null);
    setActionLoading(action);
    try {
      const result = await transitionAccount({
        accountId: account.id,
        action,
        knownVersion: account.version,
        ...extra,
      } as Parameters<typeof transitionAccount>[0]);
      onUpdated(result as Account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  function handleDone() { void performAction('done'); }
  function handleDeliver() {
    if (!selectedMilestoneId) { setError('Chọn mốc trước khi giao'); return; }
    void performAction('deliver', { targetMilestoneId: selectedMilestoneId });
  }
  function handlePay() {
    if (!payAmount || Number(payAmount) <= 0) { setError('Nhập số tiền hợp lệ'); return; }
    void performAction('pay', { amountReceived: payAmount });
  }

  async function handleLevelSave() {
    const lvl = parseInt(levelValue, 10);
    if (isNaN(lvl) || lvl < 0) { setError('Level không hợp lệ'); return; }
    setError(null);
    setActionLoading('update_level');
    try {
      const result = await transitionAccount({
        accountId: account.id,
        action: 'update_level',
        knownVersion: account.version,
        currentLevel: lvl,
      });
      onUpdated(result as Account);
      setEditingLevel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleImageUpload(formData: FormData) {
    setError(null);
    setUploading(true);
    try {
      const result = await uploadAccountImage(account.id, account.version, formData);
      onUpdated(result as Account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  }

  async function handleClearImage() {
    setError(null);
    setUploading(true);
    try {
      const result = await clearAccountImage(account.id, account.version);
      onUpdated(result as Account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa ảnh thất bại');
    } finally {
      setUploading(false);
    }
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  const sortedMilestones = [...milestones].sort((a, b) => a.level - b.level);
  const colors = STATUS_COLORS[account.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg animate-[scaleIn_0.2s_ease-out]">
        {/* Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 rounded-3xl blur-xl opacity-40" />

        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  {account.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{account.username}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 inline-block" />
                    {account.sourceName ?? account.source}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.border} ${colors.text}`}>
                    {STATUS_LABELS[account.status]}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10 px-6">
            {(['detail', 'history'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium transition-all relative ${
                  tab === t
                    ? 'text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-full" />
                )}
                {t === 'detail' ? 'Chi tiết' : 'Lịch sử'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-6 scrollbar-thin">
            {tab === 'detail' ? (
              <div className="space-y-6">
                {/* Current level */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Level hiện tại
                  </h3>
                  {editingLevel && account.status === 'dang_cay' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={levelValue}
                        onChange={(e) => setLevelValue(e.target.value)}
                        className="flex-1 rounded-xl border border-cyan-400/30 bg-white/5 backdrop-blur px-3 py-2 text-white focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                        autoFocus
                      />
                      <button
                        onClick={handleLevelSave}
                        disabled={!!actionLoading}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 transition-all"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => { setEditingLevel(false); setLevelValue(String(account.current_level)); }}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5 transition-all"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                        <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                          {account.current_level}
                        </span>
                      </div>
                      {account.status === 'dang_cay' && (
                        <button
                          onClick={() => setEditingLevel(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 px-3 py-1.5 text-sm text-cyan-400 hover:bg-cyan-500/20 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Đổi
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Milestones */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Mốc Level
                  </h3>
                  {sortedMilestones.length === 0 ? (
                    <p className="text-sm text-slate-600 py-4 text-center">Chưa có mốc nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedMilestones.map((m) => (
                        <MilestoneBadge
                          key={m.id}
                          milestone={m}
                          isTarget={m.id === account.target_milestone_id}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Image */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ảnh kết quả
                  </h3>
                  {signedUrl ? (
                    <div className="relative rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signedUrl}
                        alt="Kết quả"
                        className="max-h-48 w-full object-contain"
                      />
                      <button
                        onClick={handleClearImage}
                        disabled={uploading}
                        className="absolute top-2 right-2 rounded-lg bg-black/50 backdrop-blur-sm p-2 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Xóa ảnh"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 cursor-pointer hover:border-cyan-400/30 hover:bg-white/[0.04] transition-all group">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-cyan-500/10 transition-colors">
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Tải lên ảnh (≤5 MB)</span>
                      <input
                        name="file"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const fd = new FormData();
                            fd.append('file', e.target.files[0]);
                            void handleImageUpload(fd);
                          }
                        }}
                      />
                    </label>
                  )}
                </section>

                {/* Action buttons */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Thao tác
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {account.status === 'dang_cay' && (
                      <button
                        onClick={handleDone}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 transition-all"
                      >
                        {actionLoading === 'done' ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Done
                      </button>
                    )}
                    {account.status === 'done' && (
                      <>
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                          <select
                            value={selectedMilestoneId}
                            onChange={(e) => setSelectedMilestoneId(e.target.value)}
                            className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-white appearance-none cursor-pointer hover:border-cyan-400/30 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all pr-8"
                          >
                            <option value="">Chọn mốc giao</option>
                            {sortedMilestones.map((m) => (
                              <option key={m.id} value={m.id}>
                                {formatMilestone(m)}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <button
                          onClick={handleDeliver}
                          disabled={!!actionLoading || !selectedMilestoneId}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/20 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          Đã giao
                        </button>
                      </>
                    )}
                    {account.status === 'da_giao_cho_ben_thu' && (
                      <>
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                          <input
                            type="number"
                            min={1}
                            placeholder="Số tiền (VND)"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-green-400/30 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-all w-48"
                          />
                        </div>
                        <button
                          onClick={handlePay}
                          disabled={!!actionLoading || !payAmount}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 hover:from-green-500 hover:to-emerald-400 disabled:opacity-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Đã nhận tiền
                        </button>
                      </>
                    )}
                    {account.status === 'da_nhan_tien' && (
                      <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-gradient-to-r from-green-950/60 to-emerald-950/60 px-4 py-2.5 shadow-lg shadow-green-500/10">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-green-300">Đã nhận tiền</span>
                        {account.target_milestone_id && (() => {
                          const target = milestones.find(m => m.id === account.target_milestone_id);
                          return target ? (
                            <span className="rounded-lg bg-green-500/20 border border-green-400/20 px-2 py-0.5 text-xs font-semibold text-green-300">
                              {formatMilestone(target)}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSessions.length === 0 ? (
                  <p className="text-sm text-slate-600 py-8 text-center">Chưa có lịch sử.</p>
                ) : (
                  sortedSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-xl border px-4 py-4 text-sm transition-all ${
                        s.ended_at == null
                          ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-950/40 to-orange-950/40 shadow-lg shadow-yellow-500/5'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            s.ended_at == null
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-white/10 text-slate-400'
                          }`}>
                            {s.holder_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{s.holder_name}</span>
                        </div>
                        {s.ended_at == null && (
                          <span className="rounded-full bg-yellow-500/20 border border-yellow-400/30 px-2.5 py-0.5 text-xs font-medium text-yellow-300 animate-pulse">
                            Đang cầm
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{formatDate(s.started_at)}</span>
                        {s.ended_at && (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span>{formatDate(s.ended_at)}</span>
                          </>
                        )}
                      </div>
                      {s.duration_seconds != null && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Thời gian: <span className="text-slate-300">{formatDuration(s.duration_seconds)}</span></span>
                          {s.handed_to && (
                            <>
                              <span>·</span>
                              <span>Giao cho <span className="text-slate-300">{s.handed_to}</span></span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
