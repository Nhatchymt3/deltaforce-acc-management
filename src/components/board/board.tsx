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
import type { Account, HolderSession, Milestone, Source, Farmer } from '@/lib/types';
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

const STATUS_COLORS: Record<Account['status'], { bg: string; text: string; glow: string; strip: string }> = {
  kho: { bg: 'bg-ash/20', text: 'text-ash', glow: '', strip: 'bg-ash' },
  dang_cay: { bg: 'bg-brass/15', text: 'text-brass', glow: '', strip: 'bg-brass' },
  done: { bg: 'bg-od-green/20', text: 'text-emerald-300', glow: '', strip: 'bg-od-green' },
  da_giao_cho_ben_thu: { bg: 'bg-amber-800/30', text: 'text-amber-300', glow: '', strip: 'bg-amber-500' },
  da_nhan_tien: { bg: 'bg-od-green/25', text: 'text-green-300', glow: '', strip: 'bg-green-500' },
};

function normaliseHolder(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'vừa xong';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'vừa xong';
  if (diffMin < 60) return `${diffMin}m trước`;
  if (diffHour < 24) return `${diffHour}h trước`;
  if (diffDay < 30) return `${diffDay}d trước`;
  if (diffMonth < 12) return `${diffMonth} tháng trước`;
  return `${diffYear} năm trước`;
}

function isLocked(status: Account['status']): boolean {
  return (LOCKED_STATUSES as unknown as string[]).includes(status);
}

// Pick the farming milestone to display on a card. Prefer the explicitly
// assigned target; otherwise the next milestone above the current level; if the
// account is already past every milestone, show the highest one.
function pickFarmingMilestone(account: Account, milestones: Milestone[] | undefined): Milestone | null {
  if (!milestones || milestones.length === 0) return null;
  if (account.target_milestone_id) {
    const target = milestones.find((m) => m.id === account.target_milestone_id);
    if (target) return target;
  }
  const next = milestones.find((m) => m.level > account.current_level);
  return next ?? milestones[milestones.length - 1] ?? null;
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
      className={`group relative overflow-hidden rounded-lg border transition-all duration-200 select-none cursor-pointer hover:border-brass/30 hover:bg-white/[0.04] ${
        isDragging
          ? 'border-brass/50 bg-gunmetal opacity-60 scale-105 rotate-1'
          : disabled
          ? 'border-white/5 bg-gunmetal/60'
          : 'border-white/[0.06] bg-gunmetal/80 cursor-grab active:cursor-grabbing'
      }`}
      style={{ ...style, animationDelay: `${index * 40}ms` }}
    >
      {/* Tactical status strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.strip}`} />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-mono font-semibold text-white text-sm truncate">{account.username}</h3>
            <p className="text-[11px] text-ash mt-0.5">
              {account.sourceName ?? account.source}
            </p>
          </div>
          <span className={`flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
            {STATUS_LABELS[account.status]}
          </span>
        </div>

        {account.current_holder && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
              <span className="text-[9px] font-bold text-brass">
                {account.current_holder.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-400">{account.current_holder}</span>
          </div>
        )}
        <div className="mt-[7px] flex items-center justify-between text-[11px] text-ash font-mono">
          <div className="flex items-center gap-2">
            {targetMilestone
              ? <span className="text-brass/90 font-semibold">LV{targetMilestone.level}–{targetMilestone.price}M</span>
              : <span className="text-ash/50">—</span>}
            {account.added_by && (
              <span className="text-ash/60 truncate max-w-[80px]">↳ {account.added_by}</span>
            )}
          </div>
          {account.created_at && (
            <span className="text-[10px] text-ash/50 font-sans font-medium flex-shrink-0" title={new Date(account.created_at).toLocaleString('vi-VN')}>
              {formatTimeAgo(account.created_at)}
            </span>
          )}
        </div>
        {(() => {
          if (!account.tag_label || !account.tag_expires_at) return null;
          const expires = new Date(account.tag_expires_at).getTime();
          const now = Date.now();
          if (expires <= now) return null;
          const remainingDays = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
          const isBan = account.tag_label.toLowerCase().includes('ban') && !account.tag_label.toLowerCase().includes('cấm');
          return (
            <div className={`mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              isBan
                ? 'bg-signal-red/15 text-red-300 border border-signal-red/30'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
            }`}>
              <span>{account.tag_label}</span>
              <span className="opacity-60">({remainingDays}d)</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Column (droppable) ───────────────────────────────────────────────────────
interface ColumnProps {
  id: string;
  label: string;
  accounts: Account[];
  milestonesByAccount: Record<string, Milestone[]>;
  onOpen: (account: Account) => void;
  isKho?: boolean;
  onRemove?: () => void;
}

function Column({ id, label, accounts, milestonesByAccount, onOpen, isKho, onRemove }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [khoSearch, setKhoSearch] = useState('');

  const displayedAccounts = isKho && khoSearch.trim()
    ? accounts.filter((a) =>
        a.username.toLowerCase().includes(khoSearch.trim().toLowerCase()) ||
        (a.sourceName && a.sourceName.toLowerCase().includes(khoSearch.trim().toLowerCase())) ||
        (a.added_by && a.added_by.toLowerCase().includes(khoSearch.trim().toLowerCase()))
      )
    : accounts;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-all duration-200 ${
        isOver && id === KHO_SENTINEL
          ? 'border-brass/40 bg-brass/5'
          : isKho
          ? 'border-dashed border-white/[0.08] bg-midnight/60 shadow-inner'
          : 'border-white/[0.04] bg-midnight/40'
      }`}
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Column header */}
      <div className="flex flex-col border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display font-semibold text-white text-sm tracking-wide flex items-center gap-2">
            {isKho ? (
              <div className="w-6 h-6 rounded bg-ash/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-brass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded bg-brass/15 border border-brass/20 flex items-center justify-center">
                <span className="text-brass text-[10px] font-bold">
                  {label.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {label}
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ash/70 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
              {displayedAccounts.length}{isKho && khoSearch.trim() && `/${accounts.length}`}
            </span>
            {onRemove && accounts.length === 0 && (
              <button
                onClick={onRemove}
                title="Xóa cột AE"
                className="flex h-5 w-5 items-center justify-center rounded text-ash/40 hover:bg-signal-red/10 hover:text-signal-red transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search for Kho chung */}
        {isKho && accounts.length > 5 && (
          <div className="px-3 pb-2.5">
            <div className="relative">
              <input
                type="text"
                value={khoSearch}
                onChange={(e) => setKhoSearch(e.target.value)}
                placeholder="Lọc nhanh acc trong kho..."
                className="w-full rounded-md border border-white/[0.06] bg-gunmetal/90 px-2.5 py-1 pl-7 text-[11px] text-white placeholder-ash/40 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
              />
              <svg className="w-3 h-3 absolute left-2 top-2 text-ash/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {khoSearch && (
                <button
                  onClick={() => setKhoSearch('')}
                  className="absolute right-2 top-1.5 text-ash/40 hover:text-white text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card list — min-h-0 needed so flex-1 + overflow-y-auto works */}
      <div className="flex flex-col gap-2.5 p-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin pb-6">
        {displayedAccounts.length === 0 && (
          <div className="flex items-center justify-center py-12 text-ash/30">
            <span className="text-xs font-mono">{isKho && khoSearch.trim() ? 'Không tìm thấy acc' : '—'}</span>
          </div>
        )}
        {displayedAccounts.map((a, i) => (
          <Card
            key={a.id}
            account={a}
            targetMilestone={pickFarmingMilestone(a, milestonesByAccount[a.id])}
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
  initialFarmers: Farmer[];
  holderRevenue: Record<string, string>;
  deletedIds: string[];
  onOpenAccount: (account: Account) => void;
  onRealtimeAccountUpdate?: (account: Account) => void;
}

export function Board({ initialAccounts, initialSessions, initialSources, initialMilestones, initialFarmers, holderRevenue, deletedIds, onOpenAccount, onRealtimeAccountUpdate }: BoardProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [sessions] = useState<HolderSession[]>(initialSessions);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest'>('default');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toasts, addToast } = useToast();

  // Sync state when parent (BoardWrapper) updates initialAccounts (e.g., via AccountModal actions)
  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  const snapshotRef = useRef<Account[]>(initialAccounts);

  const realtimeUpdateRef = useRef(onRealtimeAccountUpdate);
  realtimeUpdateRef.current = onRealtimeAccountUpdate;

  const sourceMap = useMemo(() => {
    const map: Record<string, string> = {};
    initialSources.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [initialSources]);

  const milestonesByAccount = useMemo(() => {
    const map: Record<string, Milestone[]> = {};
    milestones.forEach((m) => {
      (map[m.account_id] ??= []).push(m);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.level - b.level));
    return map;
  }, [milestones]);

  const sourceFilterOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả nguồn' },
      ...initialSources.map((s) => ({ value: s.id, label: s.name })),
    ];
  }, [initialSources]);

  const revenueByNormHolder = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(holderRevenue).forEach(([holder, total]) => {
      map[normaliseHolder(holder)] = Number(total);
    });
    return map;
  }, [holderRevenue]);

  const farmerMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (initialFarmers) {
      initialFarmers.forEach((f) => { map[f.id] = f.name; });
    }
    return map;
  }, [initialFarmers]);

  const allFarmers = useMemo(() => {
    const list = [...(initialFarmers ?? [])];
    const farmerNorms = new Set(list.map((f) => normaliseHolder(f.name)));

    accounts.forEach((a) => {
      if (a.current_holder && !farmerNorms.has(normaliseHolder(a.current_holder))) {
        list.push({ id: a.current_holder, name: a.current_holder });
        farmerNorms.add(normaliseHolder(a.current_holder));
      }
    });

    return list;
  }, [accounts, initialFarmers]);

  const leaderboardItems = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};

    allFarmers.forEach((f) => {
      const norm = normaliseHolder(f.name);
      map[norm] = {
        name: f.name,
        total: revenueByNormHolder[norm] ?? 0,
        count: accounts.filter((a) => a.current_holder && normaliseHolder(a.current_holder) === norm).length,
      };
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [allFarmers, revenueByNormHolder, accounts]);

  useEffect(() => {
    if (deletedIds.length === 0) return;
    const gone = new Set(deletedIds);
    setAccounts((prev) => (prev.some((a) => gone.has(a.id)) ? prev.filter((a) => !gone.has(a.id)) : prev));
  }, [deletedIds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

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
      const targetFarmer = allFarmers.find((f) => f.id === overId || f.name === overId);
      if (!targetFarmer) return;
      nextHolder = targetFarmer.name;
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
              const raw = payload.new as Account;
              const updated = { ...raw, sourceName: sourceMap[raw.source] ?? raw.sourceName };
              setAccounts((prev) => {
                const idx = prev.findIndex((a) => a.id === updated.id);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = { ...next[idx], ...updated };
                return next;
              });
              realtimeUpdateRef.current?.(updated);
            } else if (payload.eventType === 'INSERT') {
              const raw = payload.new as Account;
              const inserted = { ...raw, sourceName: sourceMap[raw.source] ?? raw.sourceName };
              setAccounts((prev) =>
                prev.some((a) => a.id === inserted.id) ? prev : [...prev, inserted]
              );
            } else if (payload.eventType === 'DELETE') {
              const removed = payload.old as { id: string };
              setAccounts((prev) => prev.filter((a) => a.id !== removed.id));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'account_milestones' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const inserted = { ...payload.new, price: String(payload.new.price) } as Milestone;
              setMilestones((prev) =>
                prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]
              );
            } else if (payload.eventType === 'UPDATE') {
              const updated = { ...payload.new, price: String(payload.new.price) } as Milestone;
              setMilestones((prev) =>
                prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
              );
            } else if (payload.eventType === 'DELETE') {
              const removed = payload.old as { id: string };
              setMilestones((prev) => prev.filter((m) => m.id !== removed.id));
            }
          }
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    }

    init();
    return () => cleanup?.();
  }, []);

  const sortedAccounts = useMemo(() => {
    let list = accounts.filter((a) => !deletedIds.includes(a.id));
    if (filter !== 'all') {
      list = list.filter((a) => a.source === filter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter((a) =>
        a.username.toLowerCase().includes(term) ||
        (a.current_holder && a.current_holder.toLowerCase().includes(term))
      );
    }
    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    }

    return list;
  }, [accounts, deletedIds, filter, searchTerm, sortBy]);

  const khoAccounts = sortedAccounts.filter((a) => a.status === 'kho' && !a.current_holder);
  const holderColumns = allFarmers.map((f) => ({
    id: f.id,
    label: farmerMap[f.id] ?? f.name,
    accounts: sortedAccounts.filter(
      (a) =>
        a.current_holder &&
        (a.current_holder === f.id || normaliseHolder(a.current_holder) === normaliseHolder(f.name))
    ),
  }));

  return (
    <div className={`relative min-h-screen text-gray-200 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-midnight" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

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

      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-1">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold tracking-wide text-white">
            DF<span className="text-brass">△</span>
          </h1>
          <span className="text-xs font-display font-medium uppercase tracking-[0.2em] text-ash/60">
            Acc Management
          </span>
          <span className="ml-2 font-mono text-xs text-brass/80 bg-brass/10 border border-brass/20 rounded px-2 py-0.5" title="Tổng số acc đang cày/trong kho">
            {initialAccounts.length} ACC
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative min-w-[180px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm username, AE..."
              className="w-full rounded-lg border border-white/[0.06] bg-gunmetal/80 px-3 py-2 pl-8 text-xs text-white placeholder-ash/50 focus:border-brass/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all"
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-ash/50 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="min-w-[140px]">
            <Dropdown
              value={filter}
              onChange={setFilter}
              options={sourceFilterOptions}
              size="sm"
              ariaLabel="Lọc theo nguồn"
            />
          </div>

          {/* Sort dropdown */}
          <div className="min-w-[160px]">
            <Dropdown
              value={sortBy}
              onChange={(val) => setSortBy(val as 'default' | 'newest' | 'oldest')}
              options={[
                { value: 'default', label: 'Mặc định' },
                { value: 'newest', label: 'Mới nhất' },
                { value: 'oldest', label: 'Cũ nhất' },
              ]}
              size="sm"
              ariaLabel="Sắp xếp tài khoản"
            />
          </div>

          {/* Leaderboard Popup Toggle */}
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
              showLeaderboard
                ? 'border-brass bg-brass text-midnight shadow-lg shadow-brass/20'
                : 'border-white/[0.06] bg-gunmetal/60 text-brass hover:border-brass/30'
            }`}
            title="Bảng xếp hạng cày tiền AE"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>BXH AE</span>
          </button>

          {/* Finance link */}
          <Link
            href="/finance"
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-brass/30 transition-all"
            title="Tài chính"
          >
            <svg className="w-3.5 h-3.5 text-brass/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden md:inline">Tài chính</span>
          </Link>

          {/* Archive link */}
          <Link
            href="/archive"
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-brass/30 transition-all"
            title="Kho lưu trữ"
          >
            <svg className="w-3.5 h-3.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="hidden md:inline">Kho lưu trữ</span>
          </Link>

          {/* Farmers link */}
          <Link
            href="/farmers"
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-brass/30 transition-all"
            title="Quản lý AE"
          >
            <svg className="w-3.5 h-3.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="hidden md:inline">AE</span>
          </Link>

          {/* Milestones link */}
          <Link
            href="/milestones"
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-brass/30 transition-all"
            title="Quản lý Mốc cày"
          >
            <svg className="w-3.5 h-3.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden md:inline">Mốc cày</span>
          </Link>

          {/* Settings link */}
          <Link
            href="/sources"
            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-brass/30 transition-all"
            title="Nguồn"
          >
            <svg className="w-3.5 h-3.5 text-ash/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden md:inline">Nguồn</span>
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-signal-red/30 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <section
          className="mx-auto mt-8 gap-4 px-6 pb-8 overflow-x-auto"
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: '300px',
            alignItems: 'start',
          }}
        >
          <Column id={KHO_SENTINEL} label="Kho chung" accounts={khoAccounts} milestonesByAccount={milestonesByAccount} onOpen={onOpenAccount} isKho />
          {holderColumns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              accounts={col.accounts}
              milestonesByAccount={milestonesByAccount}
              onOpen={onOpenAccount}
            />
          ))}
        </section>

        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay>
              {activeAccount && (
                <div className="rotate-1 rounded-lg border border-brass/40 bg-gunmetal p-3 shadow-2xl opacity-90">
                  <h3 className="font-mono font-semibold text-white text-sm">{activeAccount.username}</h3>
                  <p className="text-[11px] text-ash mt-0.5">
                    {activeAccount.sourceName ?? activeAccount.source}
                  </p>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {/* Leaderboard Popup Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowLeaderboard(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-white/[0.08] bg-gunmetal p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
                  <span className="text-brass font-bold text-sm">🏆</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base tracking-wide">Bảng Xếp Hạng AE</h3>
                  <p className="text-[11px] text-ash">Xếp theo tổng doanh thu cày thuê</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="rounded p-1 text-ash hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {leaderboardItems.length === 0 ? (
                <div className="py-8 text-center text-ash/50 text-xs">Chưa có dữ liệu AE</div>
              ) : (
                leaderboardItems.map((item, index) => {
                  const rank = index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 transition-all ${
                        isTop1
                          ? 'border-brass/50 bg-brass/15'
                          : isTop2
                          ? 'border-slate-400/30 bg-white/[0.04]'
                          : isTop3
                          ? 'border-amber-700/30 bg-amber-950/20'
                          : 'border-white/[0.04] bg-midnight/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                            isTop1
                              ? 'bg-brass text-midnight shadow-md shadow-brass/30'
                              : isTop2
                              ? 'bg-slate-300 text-slate-900'
                              : isTop3
                              ? 'bg-amber-700 text-white'
                              : 'bg-white/10 text-ash'
                          }`}
                        >
                          {rank}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {item.name}
                            {isTop1 && <span className="text-xs">👑</span>}
                          </p>
                          <p className="text-[10px] text-ash/60 font-mono">Đang cày {item.count} acc</p>
                        </div>
                      </div>
                      <span className={`font-mono text-sm font-bold ${isTop1 ? 'text-brass' : 'text-gray-200'}`}>
                        {new Intl.NumberFormat('vi-VN').format(item.total)} đ
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer action */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <Link
                href="/finance"
                onClick={() => setShowLeaderboard(false)}
                className="text-xs text-brass hover:underline flex items-center gap-1"
              >
                Xem chi tiết tài chính ➔
              </Link>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="rounded-lg border border-white/[0.06] bg-midnight px-3.5 py-1.5 text-xs font-medium text-ash hover:text-white transition-colors"
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
