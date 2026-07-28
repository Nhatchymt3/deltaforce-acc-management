'use client';

import { useState, useEffect } from 'react';
import {
  transitionAccount,
  uploadAccountImages,
  listAccountImages,
  removeAccountImage,
  deleteAccount,
} from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession } from '@/lib/types';
import { Dropdown } from '@/components/ui/dropdown';

type StagedImage = { id: string; file: File; preview: string };

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

// ─── Timeline Row (status timestamps in history tab) ─────────────────────────
const TIMELINE_COLORS = {
  blue: { dot: 'bg-blue-500/20 text-blue-300 border-blue-400/30', line: 'text-blue-300' },
  orange: { dot: 'bg-orange-500/20 text-orange-300 border-orange-400/30', line: 'text-orange-300' },
  green: { dot: 'bg-green-500/20 text-green-300 border-green-400/30', line: 'text-green-300' },
} as const;

function TimelineRow({
  label,
  time,
  color,
  icon,
}: {
  label: string;
  time: string | null;
  color: keyof typeof TIMELINE_COLORS;
  icon: string;
}) {
  const c = TIMELINE_COLORS[color];
  const done = !!time;
  return (
    <div className={`flex items-center gap-3 ${done ? '' : 'opacity-40'}`}>
      <div className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center ${done ? c.dot : 'bg-white/5 text-slate-500 border-white/10'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className={`text-sm font-medium ${done ? 'text-white' : 'text-slate-500'}`}>{label}</span>
        <span className={`text-xs ${done ? c.line : 'text-slate-600'}`}>
          {done ? formatDate(time) : 'Chưa có'}
        </span>
      </div>
    </div>
  );
}

// ─── Toast Component ──────────────────────────────────────────────────────────
function CopyToast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div
      className={`fixed top-6 right-6 z-[100] transform transition-all duration-300 ${
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/90 to-violet-950/90 backdrop-blur-xl px-5 py-4 shadow-xl shadow-cyan-500/10">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        </div>
        <span className="text-sm font-medium text-cyan-300">{message}</span>
      </div>
    </div>
  );
}

// ─── Copy Button Component ───────────────────────────────────────────────────
function CopyButton({ text, label, onCopy }: { text: string; label: string; onCopy: (message: string) => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy(`${label} đã được copy!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopy('Copy thất bại');
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg p-1.5 transition-all duration-200 ${
        copied
          ? 'bg-cyan-500/20 text-cyan-400 scale-110'
          : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10'
      }`}
      title={`Copy ${label}`}
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// ─── Credential Field Component ──────────────────────────────────────────────
interface CredentialFieldProps {
  label: string;
  value: string;
  onCopy: (message: string) => void;
  isPassword?: boolean;
}

function CredentialField({ label, value, isPassword = false }: CredentialFieldProps) {
  const [visible, setVisible] = useState(false);
  const displayValue = isPassword ? (visible ? value : '●●●●●●●●●●●') : value;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
        {isPassword ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
        {label}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-sm ${isPassword && !visible ? 'tracking-widest' : 'text-slate-200'} transition-all duration-200`}>
          {displayValue || <span className="text-slate-600 italic">Không có</span>}
        </span>
        <div className="flex items-center gap-1">
          <CopyButton text={value} label={label} onCopy={() => {}} />
          {isPassword && value && (
            <button
              onClick={() => setVisible(!visible)}
              className={`rounded-lg p-1.5 transition-all duration-200 ${
                visible
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10'
              }`}
              title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {visible ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
  onDeleted: (accountId: string) => void;
}

export function AccountModal({ account, milestones, sessions, onClose, onUpdated, onDeleted }: AccountModalProps) {
  const [tab, setTab] = useState<Tab>('detail');
  const [payAmount, setPayAmount] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(account.target_milestone_id ?? '');
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  // ─── Load stored result images (the storage folder is the source of truth) ───
  useEffect(() => {
    let cancelled = false;
    setImagesLoading(true);
    listAccountImages(account.id)
      .then((imgs) => { if (!cancelled) setImages(imgs); })
      .catch(() => { if (!cancelled) setImages([]); })
      .finally(() => { if (!cancelled) setImagesLoading(false); });
    return () => { cancelled = true; };
    // account.version changes whenever an image is added/removed via RPC.
  }, [account.id, account.version]);

  // Revoke object URLs for staged previews when they change / on unmount.
  useEffect(() => {
    return () => { staged.forEach((s) => URL.revokeObjectURL(s.preview)); };
  }, [staged]);

  // ─── Action helpers ───────────────────────────────────────────────────────────
  async function performAction(
    action: 'done' | 'deliver' | 'pay',
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

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  function handleStageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const next: StagedImage[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" không phải ảnh`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`"${file.name}" quá lớn – tối đa 5 MB`);
        continue;
      }
      next.push({ id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, preview: URL.createObjectURL(file) });
    }
    if (next.length > 0) setStaged((prev) => [...prev, ...next]);
  }

  function handleUnstage(id: string) {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((s) => s.id !== id);
    });
  }

  async function handleConfirmUpload() {
    if (staged.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      staged.forEach((s) => fd.append('files', s.file));
      const result = await uploadAccountImages(account.id, account.version, fd);
      staged.forEach((s) => URL.revokeObjectURL(s.preview));
      setStaged([]);
      onUpdated(result as Account);
      showToast(`Đã tải lên ${staged.length} ảnh!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(path: string) {
    setError(null);
    setRemovingPath(path);
    try {
      const result = await removeAccountImage(account.id, account.version, path);
      onUpdated(result as Account);
      showToast('Đã xóa ảnh!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa ảnh thất bại');
    } finally {
      setRemovingPath(null);
    }
  }

  async function handleDeleteAccount() {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(account.id);
      onDeleted(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa tài khoản thất bại');
      setDeleting(false);
    }
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  const sortedMilestones = [...milestones].sort((a, b) => a.level - b.level);
  const colors = STATUS_COLORS[account.status];

  return (
    <>
      {/* Toast notification */}
      <CopyToast visible={toastVisible} message={toastMessage} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Glassmorphism backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        {/* Modal */}
        <div className="relative z-10 w-full max-w-2xl animate-[scaleIn_0.2s_ease-out]">
          {/* Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-cyan-500/10 rounded-3xl blur-xl opacity-40" />

          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            {/* Delete confirmation overlay */}
            {confirmDelete && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm p-6">
                <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/60 to-slate-950/80 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white">Xóa tài khoản?</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-5">
                    Tài khoản <span className="font-semibold text-slate-200">{account.username}</span> cùng toàn bộ mốc level, lịch sử và ảnh sẽ bị xóa vĩnh viễn. Không thể hoàn tác.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 hover:from-red-500 hover:to-red-400 disabled:opacity-50 transition-all"
                    >
                      {deleting && (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {deleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  aria-label="Xóa tài khoản"
                  title="Xóa tài khoản"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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
                <div className="space-y-4">
                  {/* Credentials Section */}
                  <section className={`grid gap-3 ${account.password ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <CredentialField
                      label="Tài khoản"
                      value={account.username}
                      onCopy={showToast}
                    />
                    {account.password && (
                      <CredentialField
                        label="Mật khẩu"
                        value={account.password}
                        onCopy={showToast}
                        isPassword
                      />
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
                      <div className="grid gap-2 sm:grid-cols-2">
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

                  {/* Images */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Ảnh kết quả
                      {images.length > 0 && (
                        <span className="rounded-full bg-cyan-500/15 border border-cyan-400/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {images.length}
                        </span>
                      )}
                    </h3>

                    {/* Uploaded gallery */}
                    {imagesLoading ? (
                      <p className="text-sm text-slate-600 py-4 text-center">Đang tải ảnh…</p>
                    ) : images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                        {images.map((img) => (
                          <div key={img.path} className="relative group rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt="Kết quả" className="h-full w-full object-cover" />
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0"
                              aria-label="Xem ảnh đầy đủ"
                            />
                            <button
                              onClick={() => handleRemoveImage(img.path)}
                              disabled={removingPath === img.path}
                              className="absolute top-1.5 right-1.5 rounded-lg bg-black/60 backdrop-blur-sm p-1.5 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-all"
                              title="Xóa ảnh"
                            >
                              {removingPath === img.path ? (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : staged.length === 0 ? (
                      <p className="text-sm text-slate-600 py-2">Chưa có ảnh nào.</p>
                    ) : null}

                    {/* Staged previews (not yet uploaded) */}
                    {staged.length > 0 && (
                      <div className="mb-3 rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3">
                        <p className="mb-2 text-xs font-medium text-cyan-300">
                          {staged.length} ảnh chờ tải lên
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {staged.map((s) => (
                            <div key={s.id} className="relative rounded-xl border border-white/10 overflow-hidden aspect-square">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.preview} alt={s.file.name} className="h-full w-full object-cover" />
                              <button
                                onClick={() => handleUnstage(s.id)}
                                disabled={uploading}
                                className="absolute top-1.5 right-1.5 rounded-lg bg-black/60 backdrop-blur-sm p-1.5 text-slate-200 hover:bg-red-500/30 hover:text-red-300 disabled:opacity-50 transition-all"
                                title="Bỏ ảnh này"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions: add + confirm */}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-slate-400 cursor-pointer hover:border-cyan-400/30 hover:text-cyan-300 hover:bg-white/[0.04] transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Thêm ảnh (≤5 MB)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => { handleStageFiles(e.target.files); e.target.value = ''; }}
                        />
                      </label>
                      {staged.length > 0 && (
                        <button
                          onClick={handleConfirmUpload}
                          disabled={uploading}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-400 disabled:opacity-50 transition-all"
                        >
                          {uploading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Xác nhận tải lên
                        </button>
                      )}
                    </div>
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
                          <div className="relative group min-w-[180px]">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                            <Dropdown
                              value={selectedMilestoneId}
                              onChange={setSelectedMilestoneId}
                              placeholder="Chọn mốc giao"
                              options={sortedMilestones.map((m) => ({ value: m.id, label: formatMilestone(m) }))}
                              size="sm"
                              ariaLabel="Chọn mốc giao"
                            />
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
                  {/* Status timeline: mốc thời gian chuyển trạng thái */}
                  {(account.completed_at || account.delivered_at || account.paid_at) && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mốc thời gian
                      </h3>
                      <div className="space-y-3">
                        <TimelineRow
                          label="Bấm Done"
                          time={account.completed_at}
                          color="blue"
                          icon="M5 13l4 4L19 7"
                        />
                        <TimelineRow
                          label="Đã giao"
                          time={account.delivered_at}
                          color="orange"
                          icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                        <TimelineRow
                          label="Nhận tiền"
                          time={account.paid_at}
                          color="green"
                          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </div>
                    </div>
                  )}

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
    </>
  );
}
