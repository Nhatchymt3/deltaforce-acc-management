'use client';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { moveAccount } from '@/app/actions/accounts';
import { signOut } from '@/app/actions/auth';
import type { Account, HolderSession, Milestone, Source } from '@/lib/types';
import { Dropdown } from '@/components/ui/dropdown';

const KHO_SENTINEL = '__kho__';
const LOCKED_STATUSES = ['done', 'da_giao_cho_ben_thu', 'da_nhan_tien'] as const;

const STATUS_LABELS: Record<Account['status'], string> = {
  kho: 'Kho',
  dang_cay: 'Đang cày',
  done: 'Done',
  da_giao_cho_ben_thu: 'Đã giao',
  da_nhan_tien: 'Đã nhận tiền',
};

const STATUS_COLORS: Record<Account['status'], { bg: string; text: string; glow: string }> = {
  kho: { bg: 'bg-slate-700/60', text: 'text-slate-300', glow: 'shadow-slate-500/20' },
  dang_cay: { bg: 'bg-yellow-900/60', text: 'text-yellow-300', glow: 'shadow-yellow-500/20' },
  done: { bg: 'bg-blue-900/60', text: 'text-blue-300', glow: 'shadow-blue-500/20' },
  da_giao_cho_ben_thu: { bg: 'bg-orange-900/60', text: 'text-orange-300', glow: 'shadow-orange-500/20' },
  da_nhan_tien: { bg: 'bg-green-900/60', text: 'text-green-300', glow: 'shadow-green-500/20' },
};

function normaliseHolder(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function isLocked(status: Account['status']): boolean {
  return (LOCKED_STATUSES as unknown as string[]).includes(status);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastEntry = { id: string; message: string; kind: 'error' | 'success'; progress: number };
let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  function addToast(message: string, kind: ToastEntry['kind'] = 'error') {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, message, kind, progress: 100 }]);
    const interval = setInterval(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, progress: t.progress - 2.5 } : t))
      );
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  return { toasts, addToast };
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  account: Account;
  targetMilestone: Milestone | null;
  onOpen: (account: Account) => void;
  index: number;
}

function Card({ account, targetMilestone, onOpen, index }: CardProps) {
  const disabled = isLocked(account.status);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: account.id,
      disabled,
      data: { account },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const colors = STATUS_COLORS[account.status];

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      onClick={() => onOpen(account)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(account)}
      role="button"
      tabIndex={0}
      aria-label={`Account ${account.username}`}
      className={`group relative rounded-xl border p-4 shadow-lg transition-all duration-300 select-none cursor-default ${
        disabled
          ? 'border-white/5 bg-white/[0.02] opacity-70'
          : isDragging
          ? 'border-cyan-400/60 bg-cyan-950/30 opacity-50 scale-105 rotate-1 shadow-cyan-500/30'
          : 'border-white/5 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-cyan-500/10 hover:scale-[1.02] cursor-grab active:cursor-grabbing'
      }`}
      style={{ ...style, animationDelay: `${index * 60}ms` }}
    >
      {/* Glow accent on hover */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{account.username}</h3>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
            {account.sourceName ?? account.source}
          </p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.glow} shadow-md`}>
          {STATUS_LABELS[account.status]}
        </span>
      </div>

      {account.current_holder && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">
              {account.current_holder.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">AE:</span>{' '}
            <span className="text-slate-200 font-medium">{account.current_holder}</span>
          </p>
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {targetMilestone
          ? `lv${targetMilestone.level}-${targetMilestone.price}`
          : 'Chưa có mốc'}
      </p>
    </div>
  );
}

// ─── Column (droppable) ───────────────────────────────────────────────────────
interface ColumnProps {
  id: string;
  label: string;
  accounts: Account[];
  milestoneMap: Record<string, Milestone>;
  onOpen: (account: Account) => void;
  isKho?: boolean;
  onRemove?: () => void;
}

function Column({ id, label, accounts, milestoneMap, onOpen, isKho, onRemove }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300 min-h-[420px] ${
        isOver && id === KHO_SENTINEL
          ? 'border-cyan-400/50 bg-cyan-950/30 shadow-xl shadow-cyan-500/10'
          : isKho
          ? 'border-dashed border-white/10 bg-white/[0.02] hover:border-white/20'
          : 'border-white/5 bg-white/[0.01] hover:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-white flex items-center gap-2">
          {isKho ? (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
              <span className="text-cyan-400 font-semibold text-xs">
                {label.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {label}
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500 font-medium">
            {accounts.length}
          </span>
          {onRemove && accounts.length === 0 && (
            <button
              onClick={onRemove}
              title="Xóa cột AE"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="text-xs">—</span>
          </div>
        )}
        {accounts.map((a, i) => (
          <Card
            key={a.id}
            account={a}
            targetMilestone={a.target_milestone_id ? milestoneMap[a.target_milestone_id] ?? null : null}
            onOpen={onOpen}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────
interface BoardProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  initialSources: Source[];
  initialMilestones: Milestone[];
  onOpenAccount: (account: Account) => void;
}

export function Board({ initialAccounts, initialSessions, initialSources, initialMilestones, onOpenAccount }: BoardProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [sessions] = useState<HolderSession[]>(initialSessions);
  const [filter, setFilter] = useState<string>('Tất cả');
  const [aeInput, setAeInput] = useState('');
  const [aeColumns, setAeColumns] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toasts, addToast } = useToast();

  const AE_STORAGE_KEY = 'deltaforce.aeColumns';

  const snapshotRef = useRef<Account[]>(initialAccounts);

  // Source names map
  const sourceMap = useMemo(() => {
    const map: Record<string, string> = {};
    initialSources.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [initialSources]);

  // Milestone map: id → milestone (for showing farming target on cards)
  const milestoneMap = useMemo(() => {
    const map: Record<string, Milestone> = {};
    initialMilestones.forEach((m) => { map[m.id] = m; });
    return map;
  }, [initialMilestones]);

  // Derive sources for filter dropdown
  const availableSources = useMemo(() => {
    return ['Tất cả', ...initialSources.map((s) => s.name)];
  }, [initialSources]);

  // Derive holders
  const allHolders = useMemo(() => {
    const seen = new Map<string, string>();
    aeColumns.forEach((h) => seen.set(normaliseHolder(h), h));
    accounts.forEach((a) => {
      if (a.current_holder) seen.set(normaliseHolder(a.current_holder), a.current_holder);
    });
    sessions.forEach((s) => seen.set(normaliseHolder(s.holder_name), s.holder_name));
    return Array.from(seen.values());
  }, [accounts, sessions, aeColumns]);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(AE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAeColumns(parsed.filter((x) => typeof x === 'string'));
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(AE_STORAGE_KEY, JSON.stringify(aeColumns));
    } catch {
      // ignore storage write failures
    }
  }, [aeColumns, mounted]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  function addAeColumn() {
    const raw = aeInput.trim();
    if (!raw) {
      addToast('Nhập tên AE trước khi thêm', 'error');
      return;
    }
    const norm = normaliseHolder(raw);
    if (allHolders.some((h) => normaliseHolder(h) === norm)) {
      addToast('AE này đã tồn tại', 'error');
      return;
    }
    setAeColumns((prev) => [...prev, raw]);
    setAeInput('');
    addToast(`Đã thêm cột AE "${raw}"`, 'success');
  }

  function removeAeColumn(holder: string) {
    const norm = normaliseHolder(holder);
    const hasAccounts = accounts.some(
      (a) => a.current_holder && normaliseHolder(a.current_holder) === norm
    );
    if (hasAccounts) {
      addToast('Không thể xóa cột AE đang có acc', 'error');
      return;
    }
    setAeColumns((prev) => prev.filter((h) => normaliseHolder(h) !== norm));
  }

  function onDragStart({ active }: DragStartEvent) {
    snapshotRef.current = accounts;
    const acc = accounts.find((a) => a.id === active.id);
    setActiveAccount(acc ?? null);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveAccount(null);
    if (!over) return;

    const account = accounts.find((a) => a.id === active.id);
    if (!account) return;
    if (isLocked(account.status)) return;

    const overId = String(over.id);
    let nextHolder: string | null = null;
    let nextStatus: Account['status'] = account.status;

    if (overId === KHO_SENTINEL) {
      nextHolder = null;
      nextStatus = 'kho';
    } else {
      if (!allHolders.includes(overId)) return;
      nextHolder = overId;
      nextStatus = account.status === 'kho' ? 'dang_cay' : account.status;
    }

    const snapshot = snapshotRef.current;

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === account.id
          ? { ...a, current_holder: nextHolder, status: nextStatus, version: a.version + 1 }
          : a
      )
    );

    try {
      const result = await moveAccount(account.id, nextHolder, account.position, account.version);
      setAccounts((prev) =>
        prev.map((a) => (a.id === result.id ? { ...a, ...(result as Account) } : a))
      );
    } catch (err) {
      setAccounts(snapshot);
      addToast(err instanceof Error ? err.message : 'Lỗi khi chuyển acc', 'error');
    }
  }

  // Realtime subscription
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      const { createClient } = await import('@/lib/supabase/browser');
      const supabase = createClient();

      const channel = supabase
        .channel('board-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Account;
              setAccounts((prev) => {
                const idx = prev.findIndex((a) => a.id === updated.id);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = { ...next[idx], ...updated };
                return next;
              });
            } else if (payload.eventType === 'INSERT') {
              const inserted = payload.new as Account;
              setAccounts((prev) =>
                prev.some((a) => a.id === inserted.id) ? prev : [...prev, inserted]
              );
            }
          }
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    }

    init();
    return () => cleanup?.();
  }, []);

  // Filtered accounts
  const filtered = accounts.filter(
    (a) => filter === 'Tất cả' || (a.sourceName ?? sourceMap[a.source] ?? a.source) === filter
  );

  const khoAccounts = filtered.filter((a) => a.status === 'kho' && !a.current_holder);
  const holderColumns = allHolders.map((holder) => ({
    id: holder,
    label: holder,
    accounts: filtered.filter((a) => a.current_holder === holder),
  }));

  return (
    <div className={`relative min-h-screen text-white transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-950" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-500/8 rounded-full blur-[120px] animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" style={{ animationDelay: '6s' }} />
        {/* Stars */}
        <div className="stars-bg absolute inset-0" />
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 pr-10 shadow-2xl backdrop-blur-xl min-w-[300px] animate-[slideInRight_0.3s_ease-out] ${
              t.kind === 'error'
                ? 'border-red-500/30 bg-red-950/60 text-red-200'
                : 'border-green-500/30 bg-emerald-950/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {t.kind === 'error' ? (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
              <div
                className={`h-full transition-all duration-100 ${t.kind === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${t.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
            DeltaForce
          </p>
          <h1 className="mt-1 text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
            Acc Management
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Source filter */}
          <div className="relative group min-w-[160px]">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none" />
            <Dropdown
              value={filter}
              onChange={setFilter}
              options={availableSources.map((s) => ({ value: s, label: s }))}
              size="sm"
              ariaLabel="Lọc theo nguồn"
            />
          </div>

          {/* AE input */}
          <div className="flex items-center gap-2">
            <input
              value={aeInput}
              onChange={(e) => setAeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAeColumn()}
              placeholder="Tên AE mới"
              className="w-40 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
            <button
              onClick={addAeColumn}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              AE
            </button>
          </div>

          {/* Finance link */}
          <Link
            href="/finance"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
            title="Tài chính"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>

          {/* Settings link */}
          <Link
            href="/sources"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
            title="Quản lý nguồn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* Logout button */}
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <section
          className="mx-auto mt-8 gap-4 px-6 pb-8"
          style={{
            display: 'grid',
            gridTemplateColumns: `300px repeat(${Math.max(holderColumns.length, 1)}, minmax(270px, 1fr))`,
          }}
        >
          <Column id={KHO_SENTINEL} label="Kho chung" accounts={khoAccounts} milestoneMap={milestoneMap} onOpen={onOpenAccount} isKho />
          {holderColumns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              accounts={col.accounts}
              milestoneMap={milestoneMap}
              onOpen={onOpenAccount}
              onRemove={
                aeColumns.some((h) => normaliseHolder(h) === normaliseHolder(col.id))
                  ? () => removeAeColumn(col.id)
                  : undefined
              }
            />
          ))}
        </section>

        {/* Drag overlay */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay>
              {activeAccount && (
                <div className="rotate-2 rounded-xl border border-cyan-400/60 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl shadow-cyan-500/30 opacity-95">
                  <h3 className="font-semibold text-white">{activeAccount.username}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
                    {activeAccount.sourceName ?? activeAccount.source}
                  </p>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </div>
  );
}
