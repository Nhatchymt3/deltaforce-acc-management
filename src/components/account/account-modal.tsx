'use client';

import { useState, useEffect } from 'react';
import {
  transitionAccount,
  uploadAccountImages,
  listAccountImages,
  removeAccountImage,
  deleteAccount,
  ensureMilestone,
  updateMilestone,
  deleteMilestone,
  setAccountTag,
  updateGameUuid,
  updateAccountCredentials,
  revertToDangCay,
  revertToDelivered,
  revertToDone,
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
  kho: { bg: 'bg-ash/15', border: 'border-ash/30', text: 'text-ash' },
  dang_cay: { bg: 'bg-brass/15', border: 'border-brass/30', text: 'text-brass' },
  done: { bg: 'bg-od-green/20', border: 'border-od-green/40', text: 'text-emerald-300' },
  da_giao_cho_ben_thu: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300' },
  da_nhan_tien: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-300' },
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

// Milestone display: LV${level}-${price}M
function formatMilestone(m: Milestone): string {
  return `LV${m.level}-${m.price}M`;
}

// ─── Timeline Row (status timestamps in history tab) ─────────────────────────
const TIMELINE_COLORS = {
  blue: { dot: 'bg-blue-500/20 text-blue-300 border-blue-400/30', line: 'text-blue-300' },
  orange: { dot: 'bg-orange-500/20 text-orange-300 border-orange-400/30', line: 'text-orange-300' },
  green: { dot: 'bg-green-500/20 text-green-300 border-green-400/30', line: 'text-green-300' },
} as const;

// ─── Image Cache ─────────────────────────────────────────────────────────────
const imageCache = new Map<string, { version: number; images: Array<{ path: string; url: string }>; expires: number }>();

function getCachedImages(accountId: string, version: number): Array<{ path: string; url: string }> | null {
  const cached = imageCache.get(accountId);
  if (cached && cached.version === version && cached.expires > Date.now()) {
    return cached.images;
  }
  return null;
}

function setCachedImages(accountId: string, version: number, images: Array<{ path: string; url: string }>) {
  imageCache.set(accountId, { version, images, expires: Date.now() + 280 * 1000 });
}

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
      className={`rounded p-1 transition-all duration-200 ${
        copied
          ? 'bg-brass/20 text-brass'
          : 'text-ash hover:text-white hover:bg-white/5'
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
  onSave?: (newValue: string) => Promise<void>;
}

function CredentialField({ label, value, isPassword = false, onSave }: CredentialFieldProps) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const [loading, setLoading] = useState(false);

  const displayValue = isPassword ? (visible ? value : '●●●●●●●●●●●') : value;

  if (editing && onSave) {
    return (
      <div className="rounded-lg border border-brass/40 bg-midnight p-2.5 space-y-1.5 min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-ash">
          {label}
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="w-full min-w-0 flex-1 rounded border border-white/[0.06] bg-gunmetal px-2 py-1 text-xs text-white font-mono focus:border-brass/40 focus:outline-none"
            placeholder={`Nhập ${label.toLowerCase()}...`}
            autoFocus
          />
          <button
            onClick={async () => {
              setLoading(true);
              try {
                await onSave(editVal);
                setEditing(false);
              } catch {
                // error handled by parent
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="shrink-0 rounded bg-brass px-2 py-1 text-xs font-bold text-midnight hover:bg-brass/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Lưu'}
          </button>
          <button
            onClick={() => {
              setEditVal(value);
              setEditing(false);
            }}
            className="shrink-0 rounded border border-white/[0.06] bg-midnight px-1.5 py-1 text-xs text-ash hover:text-white transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.04] bg-midnight/50 p-3 group/cred">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ash mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
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
        {onSave && (
          <button
            onClick={() => {
              setEditVal(value);
              setEditing(true);
            }}
            className="text-ash hover:text-brass opacity-60 group-hover/cred:opacity-100 transition-opacity p-0.5"
            title={`Sửa ${label.toLowerCase()}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-xs ${isPassword && !visible ? 'tracking-widest' : 'text-gray-200'} transition-all duration-200`}>
          {displayValue || <span className="text-ash/40 italic">Chưa nhập</span>}
        </span>
        <div className="flex items-center gap-1">
          <CopyButton text={value} label={label} onCopy={() => {}} />
          {isPassword && value && (
            <button
              onClick={() => setVisible(!visible)}
              className={`rounded p-1 transition-all duration-200 ${
                visible
                  ? 'bg-brass/20 text-brass'
                  : 'text-ash hover:text-white'
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
function MilestoneBadge({
  milestone,
  isTarget,
  onSave,
}: {
  milestone: Milestone;
  isTarget: boolean;
  onSave: (id: string, level: number, price: string, note?: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [level, setLevel] = useState(String(milestone.level));
  const [price, setPrice] = useState(milestone.price);
  const [note, setNote] = useState(milestone.note ?? '');
  const [loading, setLoading] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-brass/40 bg-midnight p-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="Lv"
            className="w-14 rounded border border-white/[0.06] bg-midnight px-2 py-0.5 text-xs text-white font-mono focus:outline-none"
          />
          <input
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Tiền"
            className="w-20 rounded border border-white/[0.06] bg-midnight px-2 py-0.5 text-xs text-white font-mono focus:outline-none"
          />
          <button
            onClick={async () => {
              if (!level || !price) return;
              setLoading(true);
              try {
                await onSave(milestone.id, parseInt(level, 10), price, note.trim() || null);
                setEditing(false);
              } catch {
                // error handled outside
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !level || !price}
            className="rounded bg-brass px-2.5 py-0.5 text-xs font-semibold text-midnight hover:bg-brass/90 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Lưu'}
          </button>
          <button
            onClick={() => {
              setLevel(String(milestone.level));
              setPrice(milestone.price);
              setNote(milestone.note ?? '');
              setEditing(false);
            }}
            className="rounded border border-white/[0.06] px-2 py-0.5 text-xs text-ash hover:text-white transition-colors"
          >
            Hủy
          </button>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Chú thích / Ghi chú..."
          className="w-full rounded border border-white/[0.06] bg-midnight px-2 py-1 text-xs text-white placeholder-ash/40 focus:outline-none focus:border-brass/40"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all duration-200 group/badge ${
        isTarget
          ? 'border-brass/40 bg-brass/10'
          : 'border-white/[0.04] bg-midnight/50'
      }`}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <div className="flex items-center gap-2">
          {isTarget && (
            <div className="w-4 h-4 rounded-full bg-brass/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-2.5 h-2.5 text-brass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <span className="font-mono font-semibold text-brass">
            {formatMilestone(milestone)}
          </span>
        </div>
        {milestone.note && (
          <span className="text-[11px] text-amber-300/90 font-medium mt-0.5">
            📝 {milestone.note}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isTarget && (
          <span className="text-[10px] font-semibold uppercase text-brass/70 mr-1">Mốc giao</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="rounded p-1 text-ash hover:text-white hover:bg-white/10 opacity-60 group-hover/badge:opacity-100 transition-all"
          title="Chỉnh sửa mốc & chú thích"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
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
  const [deliverLevel, setDeliverLevel] = useState('');
  const [deliverPrice, setDeliverPrice] = useState('');
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);

  useEffect(() => {
    if (milestones.length > 0) {
      const sorted = [...milestones].sort((a, b) => a.level - b.level);
      const target = sorted.find((m) => m.id === account.target_milestone_id) ?? sorted[sorted.length - 1];
      if (target) {
        setDeliverLevel(String(target.level));
        setDeliverPrice(target.price);
      }
    }
  }, [account.target_milestone_id, milestones]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customTagDays, setCustomTagDays] = useState('');
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [doneGameUuid, setDoneGameUuid] = useState('');
  const [pwModalTarget, setPwModalTarget] = useState<'dang_cay' | 'delivered' | 'done' | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  // ─── Load stored result images (the storage folder is the source of truth) ───
  useEffect(() => {
    let cancelled = false;

    // Check cache first
    const cached = getCachedImages(account.id, account.version);
    if (cached) {
      setImages(cached);
      setImagesLoading(false);
      return;
    }

    setImagesLoading(true);
    listAccountImages(account.id)
      .then((imgs) => {
        if (!cancelled && imgs) {
          setImages(imgs);
          setCachedImages(account.id, account.version, imgs);
        }
      })
      .catch(() => { if (!cancelled) setImages([]); })
      .finally(() => { if (!cancelled) setImagesLoading(false); });
    return () => { cancelled = true; };
    // account.version changes whenever an image is added/removed via RPC.
  }, [account.id, account.version]);

  // Revoke object URLs for staged previews when they change / on unmount.
  useEffect(() => {
    return () => { staged.forEach((s) => URL.revokeObjectURL(s.preview)); };
  }, [staged]);

  // Paste-to-stage: while the modal is open, a screenshot in the clipboard can
  // be pasted (Ctrl/Cmd+V) to add it to the staged list, just like picking a
  // file. Only acts on the detail tab, where the upload area lives.
  useEffect(() => {
    if (tab !== 'detail') return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pasted.push(file);
        }
      }
      if (pasted.length > 0) {
        e.preventDefault();
        stageFiles(pasted);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // stageFiles is stable enough for this handler; re-bind only on tab change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  function handleDone() {
    setDoneGameUuid(account.game_uuid ?? '');
    setShowDoneModal(true);
  }

  async function submitDoneWithUuid() {
    if (!doneGameUuid.trim()) {
      setError('Vui lòng nhập UUID Game trước khi hoàn tất');
      return;
    }
    setError(null);
    setActionLoading('done');
    try {
      await updateGameUuid(account.id, doneGameUuid.trim());
      setShowDoneModal(false);
      await performAction('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
      setActionLoading(null);
    }
  }
  async function handleDeliver() {
    if (!deliverLevel || !deliverPrice) { setError('Nhập đủ Level và Tiền'); return; }
    setError(null);
    setActionLoading('deliver');
    try {
      const milestoneId = await ensureMilestone(account.id, parseInt(deliverLevel, 10), deliverPrice);
      const result = await transitionAccount({
        accountId: account.id,
        action: 'deliver',
        knownVersion: account.version,
        targetMilestoneId: milestoneId,
      });
      onUpdated(result as Account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setActionLoading(null);
    }
  }
  function handlePay() {
    if (!payAmount || Number(payAmount) <= 0) { setError('Nhập số tiền hợp lệ'); return; }
    void performAction('pay', { amountReceived: payAmount });
  }

  async function submitRevertWithPassword() {
    if (!adminPasswordInput) {
      setError('Vui lòng nhập mật khẩu admin');
      return;
    }
    setError(null);
    setActionLoading('revert');
    try {
      let res: { data?: Account; error?: string } | undefined;
      if (pwModalTarget === 'dang_cay') {
        res = await revertToDangCay(account.id, account.version, adminPasswordInput);
      } else if (pwModalTarget === 'delivered') {
        res = await revertToDelivered(account.id, account.version, adminPasswordInput);
      } else if (pwModalTarget === 'done') {
        res = await revertToDone(account.id, account.version, adminPasswordInput);
      }

      if (res?.error) {
        setError(res.error);
      } else if (res?.data) {
        onUpdated(res.data);
        setPwModalTarget(null);
        setAdminPasswordInput('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      setActionLoading(null);
    }
  }

async function compressImage(file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) return resolve(file);
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

  const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB before compression

  function stageFiles(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    const next: StagedImage[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" không phải ảnh`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`"${file.name}" quá lớn – tối đa 25 MB`);
        continue;
      }
      const safeName = file.name && file.name.trim() ? file.name : 'clipboard.png';
      next.push({ id: `${safeName}-${file.size}-${crypto.randomUUID()}`, file, preview: URL.createObjectURL(file) });
    }
    if (next.length > 0) setStaged((prev) => [...prev, ...next]);
  }

  function handleStageFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    stageFiles(Array.from(fileList));
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
      let currentAccount = account;
      for (const s of staged) {
        const compressed = await compressImage(s.file);
        const fd = new FormData();
        fd.append('files', compressed);
        const result = await uploadAccountImages(currentAccount.id, currentAccount.version, fd);
        currentAccount = result as Account;
      }
      staged.forEach((s) => URL.revokeObjectURL(s.preview));
      setStaged([]);
      onUpdated(currentAccount);
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

  async function handleDownloadAll() {
    if (images.length === 0 || downloadingAll) return;
    setError(null);
    setDownloadingAll(true);
    try {
      let i = 0;
      for (const img of images) {
        i++;
        // Fetch the signed URL as a blob so the browser saves the file instead
        // of navigating to it, then trigger a download with a stable filename.
        const res = await fetch(img.url);
        if (!res.ok) throw new Error('Không tải được ảnh');
        const blob = await res.blob();
        const ext = img.path.split('.').pop() || 'jpg';
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${account.username}-${i}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      }
      showToast(`Đã tải ${images.length} ảnh!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setDownloadingAll(false);
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
        <div className="relative z-10 w-full max-w-4xl">
          <div className="relative rounded-xl border border-white/[0.08] bg-gunmetal shadow-2xl">
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

            {/* Done UUID Prompt Overlay */}
            {showDoneModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-md p-6">
                <div className="w-full max-w-sm rounded-2xl border border-brass/40 bg-gunmetal p-6 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brass/20 border border-brass/30 flex items-center justify-center">
                      <span className="text-brass text-lg font-bold">🎮</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Xác nhận Hoàn tất (Done)</h3>
                      <p className="text-xs text-ash">Vui lòng nhập UUID Game của tài khoản</p>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-medium uppercase tracking-wide text-ash">
                      UUID Game <span className="text-signal-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={doneGameUuid}
                      onChange={(e) => setDoneGameUuid(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void submitDoneWithUuid()}
                      placeholder="Dán UUID Game vào đây..."
                      autoFocus
                      className="w-full rounded-lg border border-brass/40 bg-midnight px-3 py-2 text-xs text-white placeholder-ash/40 font-mono focus:outline-none focus:ring-1 focus:ring-brass/30"
                    />
                  </div>

                  {error && (
                    <div className="rounded bg-signal-red/10 border border-signal-red/30 p-2 text-xs text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => {
                        setShowDoneModal(false);
                        setError(null);
                      }}
                      disabled={actionLoading === 'done'}
                      className="rounded-lg border border-white/[0.06] bg-midnight px-4 py-2 text-xs text-ash hover:text-white transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => void submitDoneWithUuid()}
                      disabled={actionLoading === 'done' || !doneGameUuid.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-brass px-4 py-2 text-xs font-bold text-midnight hover:bg-brass/90 disabled:opacity-40 transition-all shadow-md shadow-brass/20"
                    >
                      {actionLoading === 'done' ? 'Đang lưu...' : 'Lưu & Bấm Done'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
                  <span className="text-base font-bold text-brass">
                    {account.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white tracking-wide">{account.username}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-ash flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brass inline-block" />
                      {account.sourceName ?? account.source}
                    </span>
                    {account.added_by && (
                      <span className="text-xs text-ash">
                        • Thêm bởi: <strong className="text-gray-200 font-medium">{account.added_by}</strong>
                      </span>
                    )}
                    {account.created_at && (
                      <span className="text-xs text-slate-500 font-mono">
                        • {new Date(account.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
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
            <div className="max-h-[85vh] overflow-y-auto p-5 scrollbar-thin">
              {tab === 'detail' ? (
                <div className="space-y-4">
                  {/* Credentials Section */}
                  <section className="grid gap-3 sm:grid-cols-3">
                    <CredentialField
                      label="Tài khoản"
                      value={account.username}
                      onCopy={showToast}
                      onSave={async (newUsername) => {
                        const updated = await updateAccountCredentials(account.id, newUsername, account.password ?? '');
                        if (updated) onUpdated(updated);
                        showToast('Đã cập nhật tài khoản');
                      }}
                    />
                    <CredentialField
                      label="Mật khẩu"
                      value={account.password ?? ''}
                      onCopy={showToast}
                      isPassword
                      onSave={async (newPassword) => {
                        const updated = await updateAccountCredentials(account.id, account.username, newPassword);
                        if (updated) onUpdated(updated);
                        showToast('Đã cập nhật mật khẩu');
                      }}
                    />
                    <CredentialField
                      label="UUID Game"
                      value={account.game_uuid ?? ''}
                      onCopy={showToast}
                      onSave={async (newUuid) => {
                        try {
                          const updated = await updateGameUuid(account.id, newUuid);
                          if (updated) {
                            onUpdated(updated);
                          }
                          showToast('Đã cập nhật UUID Game');
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Lỗi cập nhật UUID Game');
                        }
                      }}
                    />
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
                            onSave={async (id, level, price, note) => {
                              try {
                                await updateMilestone(id, level, price, note);
                                showToast('Đã cập nhật mốc & chú thích');
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Lỗi cập nhật mốc');
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Incident Tag */}
                  <section className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Thẻ sự cố (Ban / Cấm Party)
                    </h3>

                    {/* Active Tag Status */}
                    {(() => {
                      if (!account.tag_label || !account.tag_expires_at) return null;
                      const expires = new Date(account.tag_expires_at).getTime();
                      const now = Date.now();
                      if (expires <= now) return null;

                      const diffMs = expires - now;
                      const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const isBan = account.tag_label.toLowerCase().includes('ban') && !account.tag_label.toLowerCase().includes('cấm');

                      return (
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{isBan ? '🚫' : '⚠️'}</span>
                            <div>
                              <span className="font-bold text-white text-sm">{account.tag_label}</span>
                              <p className="text-xs text-slate-400">
                                Hạn còn: <strong className="text-cyan-300 font-mono">{daysLeft} ngày {hoursLeft} giờ</strong>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const res = await setAccountTag(account.id, null, null);
                                onUpdated(res);
                                showToast('Đã gỡ tag');
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Gỡ tag thất bại');
                              }
                            }}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-all"
                          >
                            Gỡ Tag
                          </button>
                        </div>
                      );
                    })()}

                    {/* Presets */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[11px] font-medium text-red-400/90 block mb-1.5">🚫 Ban acc:</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 3, 7, 30].map((days) => (
                            <button
                              key={`ban-${days}`}
                              onClick={async () => {
                                try {
                                  const res = await setAccountTag(account.id, `Ban ${days} ngày`, days);
                                  onUpdated(res);
                                  showToast(`Đã gắn tag Ban ${days} ngày`);
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Gắn tag thất bại');
                                }
                              }}
                              className="rounded-lg border border-red-500/20 bg-red-950/30 px-2 py-1.5 text-xs text-red-200 hover:bg-red-900/40 hover:border-red-500/40 transition-all text-center"
                            >
                              {days} ngày
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-medium text-amber-400/90 block mb-1.5">⚠️ Cấm party:</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 3, 7, 30].map((days) => (
                            <button
                              key={`party-${days}`}
                              onClick={async () => {
                                try {
                                  const res = await setAccountTag(account.id, `Cấm party ${days} ngày`, days);
                                  onUpdated(res);
                                  showToast(`Đã gắn tag Cấm party ${days} ngày`);
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Gắn tag thất bại');
                                }
                              }}
                              className="rounded-lg border border-amber-500/20 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-900/40 hover:border-amber-500/40 transition-all text-center"
                            >
                              {days} ngày
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Days Input */}
                      <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400">Tùy chỉnh số ngày:</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="Số ngày..."
                          value={customTagDays}
                          onChange={(e) => setCustomTagDays(e.target.value)}
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none transition-all"
                        />
                        <button
                          onClick={async () => {
                            const days = parseInt(customTagDays, 10);
                            if (!days || days <= 0) return;
                            try {
                              const res = await setAccountTag(account.id, `Ban ${days} ngày`, days);
                              onUpdated(res);
                              showToast(`Đã gắn tag Ban ${days} ngày`);
                              setCustomTagDays('');
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Gắn tag thất bại');
                            }
                          }}
                          disabled={!customTagDays || parseInt(customTagDays, 10) <= 0}
                          className="rounded-lg border border-red-500/30 bg-red-600/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40 transition-all"
                        >
                          + Ban
                        </button>
                        <button
                          onClick={async () => {
                            const days = parseInt(customTagDays, 10);
                            if (!days || days <= 0) return;
                            try {
                              const res = await setAccountTag(account.id, `Cấm party ${days} ngày`, days);
                              onUpdated(res);
                              showToast(`Đã gắn tag Cấm party ${days} ngày`);
                              setCustomTagDays('');
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Gắn tag thất bại');
                            }
                          }}
                          disabled={!customTagDays || parseInt(customTagDays, 10) <= 0}
                          className="rounded-lg border border-amber-500/30 bg-amber-600/60 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-40 transition-all"
                        >
                          + Cấm party
                        </button>
                      </div>
                    </div>
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
                      {images.length > 0 && (
                        <button
                          onClick={handleDownloadAll}
                          disabled={downloadingAll}
                          className="ml-auto flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium normal-case tracking-normal text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
                          title="Tải toàn bộ ảnh"
                        >
                          {downloadingAll ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          {downloadingAll ? 'Đang tải…' : 'Tải tất cả'}
                        </button>
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
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        hoặc dán ảnh (Ctrl+V)
                      </span>
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
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="Lv"
                              value={deliverLevel}
                              onChange={e => setDeliverLevel(e.target.value)}
                              className="w-16 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                            />
                            <input
                              type="number"
                              step="any"
                              placeholder="Tiền"
                              value={deliverPrice}
                              onChange={e => setDeliverPrice(e.target.value)}
                              className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                            />
                          </div>
                          <button
                            onClick={() => void handleDeliver()}
                            disabled={!!actionLoading || !deliverLevel || !deliverPrice}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/20 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Đã giao
                          </button>

                          <button
                            onClick={() => setPwModalTarget('dang_cay')}
                            disabled={!!actionLoading}
                            className="ml-auto flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                            title="Hủy trạng thái Done, quay lại Đang cày"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Hủy Done
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

                          <button
                            onClick={() => setPwModalTarget('done')}
                            disabled={!!actionLoading}
                            className="ml-auto flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-medium text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-all"
                            title="Hoàn tác về trạng thái Done"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Hủy giao
                          </button>
                        </>
                      )}
                      {account.status === 'da_nhan_tien' && (
                        <div className="flex w-full items-center justify-between gap-3">
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

                          <button
                            onClick={() => setPwModalTarget('delivered')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                            title="Hủy nhận tiền, quay lại Đã giao"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Hủy nhận tiền
                          </button>
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

      {/* Admin Password Modal */}
      {pwModalTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setPwModalTarget(null); setAdminPasswordInput(''); }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác thực Admin</h3>
                <p className="text-xs text-slate-400">Nhập mật khẩu để hoàn tác trạng thái</p>
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void submitRevertWithPassword(); }}
              className="space-y-4"
            >
              <input
                type="password"
                autoFocus
                placeholder="Mật khẩu admin..."
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-red-400/50 focus:outline-none focus:ring-1 focus:ring-red-400/20 transition-all"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPwModalTarget(null); setAdminPasswordInput(''); }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'revert' || !adminPasswordInput}
                  className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading === 'revert' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
