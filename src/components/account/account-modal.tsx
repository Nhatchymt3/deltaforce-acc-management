'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  transitionAccount,
  uploadAccountImage,
  clearAccountImage,
  getSignedImageUrl,
} from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession } from '@/lib/types';
import { formatVnd } from '@/lib/finance';

const STATUS_LABELS: Record<Account['status'], string> = {
  kho: 'Kho',
  dang_cay: 'Đang cày',
  done: 'Done',
  da_giao_cho_ben_thu: 'Đã giao',
  da_nhan_tien: 'Đã nhận tiền',
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

// ─── Milestone level badge ───────────────────────────────────────────────────
function MilestoneBadge({ milestone, isTarget }: { milestone: Milestone; isTarget: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        isTarget ? 'border-cyan-500 bg-cyan-950/30' : 'border-slate-700 bg-slate-800'
      }`}
    >
      <span className="text-slate-300">
        Level {milestone.level}
        {milestone.note && <span className="ml-2 text-slate-500">{milestone.note}</span>}
      </span>
      <span className="font-medium text-cyan-300">{formatVnd(milestone.price)}</span>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">{account.username}</h2>
            <p className="text-sm text-slate-400">{account.source} · {STATUS_LABELS[account.status]}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300 border border-red-800">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-6">
          {(['detail', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition ${
                tab === t
                  ? 'border-b-2 border-cyan-400 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'detail' ? 'Chi tiết' : 'Lịch sử'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {tab === 'detail' ? (
            <div className="space-y-6">
              {/* Current level */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Level hiện tại</h3>
                {editingLevel && account.status === 'dang_cay' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={levelValue}
                      onChange={(e) => setLevelValue(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                    />
                    <button
                      onClick={handleLevelSave}
                      disabled={!!actionLoading}
                      className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => { setEditingLevel(false); setLevelValue(String(account.current_level)); }}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">{account.current_level}</span>
                    {account.status === 'dang_cay' && (
                      <button
                        onClick={() => setEditingLevel(true)}
                        className="text-sm text-cyan-400 hover:underline"
                      >
                        Đổi
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Milestones */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Mốc Level</h3>
                {milestones.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có mốc nào.</p>
                ) : (
                  <div className="space-y-2">
                    {[...milestones].sort((a, b) => a.level - b.level).map((m) => (
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
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Ảnh kết quả</h3>
                {signedUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signedUrl}
                      alt="Kết quả"
                      className="max-h-48 rounded-lg border border-slate-700 object-contain bg-slate-800 w-full"
                    />
                    <button
                      onClick={handleClearImage}
                      disabled={uploading}
                      className="mt-2 text-sm text-red-400 hover:underline disabled:opacity-50"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <form action={(fd) => void handleImageUpload(fd)} encType="multipart/form-data">
                    <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 p-6 cursor-pointer hover:border-cyan-500 transition">
                      <span className="text-sm text-slate-400">Tải lên ảnh (≤5 MB)</span>
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
                    {uploading && <p className="mt-2 text-sm text-slate-400">Đang tải lên…</p>}
                  </form>
                )}
              </section>

              {/* Action buttons */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Thao tác</h3>
                <div className="flex flex-wrap gap-2">
                  {account.status === 'dang_cay' && (
                    <button
                      onClick={handleDone}
                      disabled={!!actionLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {actionLoading === 'done' ? 'Đang xử lý…' : '✓ Done'}
                    </button>
                  )}
                  {account.status === 'done' && (
                    <>
                      <select
                        value={selectedMilestoneId}
                        onChange={(e) => setSelectedMilestoneId(e.target.value)}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                      >
                        <option value="">Chọn mốc giao</option>
                        {milestones.map((m) => (
                          <option key={m.id} value={m.id}>
                            Level {m.level} – {formatVnd(m.price)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleDeliver}
                        disabled={!!actionLoading || !selectedMilestoneId}
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                      >
                        {actionLoading === 'deliver' ? 'Đang xử lý…' : '📦 Đã giao'}
                      </button>
                    </>
                  )}
                  {account.status === 'da_giao_cho_ben_thu' && (
                    <>
                      <input
                        type="number"
                        min={1}
                        placeholder="Số tiền (VND)"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                      />
                      <button
                        onClick={handlePay}
                        disabled={!!actionLoading || !payAmount}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                      >
                        {actionLoading === 'pay' ? 'Đang xử lý…' : '💰 Đã nhận tiền'}
                      </button>
                    </>
                  )}
                  {account.status === 'da_nhan_tien' && (
                    <span className="rounded-lg bg-green-900/40 px-4 py-2 text-sm text-green-300">
                      Đã nhận tiền · {formatVnd(account.amount_received ?? '0')}
                    </span>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSessions.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có lịch sử.</p>
              ) : (
                sortedSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      s.ended_at == null
                        ? 'border-yellow-500/50 bg-yellow-950/20'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{s.holder_name}</span>
                      {s.ended_at == null && (
                        <span className="rounded-full bg-yellow-900/60 px-2 py-0.5 text-xs text-yellow-300">
                          Đang cầm
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-400">
                      {formatDate(s.started_at)}
                      {s.ended_at && ` → ${formatDate(s.ended_at)}`}
                    </p>
                    {s.duration_seconds != null && (
                      <p className="text-slate-500">
                        Thời gian: <span className="text-slate-300">{formatDuration(s.duration_seconds)}</span>
                        {s.handed_to && <> · Giao cho <span className="text-slate-300">{s.handed_to}</span></>}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
