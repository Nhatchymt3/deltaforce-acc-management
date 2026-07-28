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
  createPortal,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { moveAccount } from '@/app/actions/accounts';
import type { Account, HolderSession } from '@/lib/types';

const KHO_SENTINEL = '__kho__';
const LOCKED_STATUSES = ['done', 'da_giao_cho_ben_thu', 'da_nhan_tien'] as const;

const STATUS_LABELS: Record<Account['status'], string> = {
  kho: 'Kho',
  dang_cay: 'Đang cày',
  done: 'Done',
  da_giao_cho_ben_thu: 'Đã giao',
  da_nhan_tien: 'Đã nhận tiền',
};

const SOURCES = ['Tất cả', 'Bên A', 'Bên B', 'Bên C'] as const;

function normaliseHolder(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function isLocked(status: Account['status']): boolean {
  return (LOCKED_STATUSES as unknown as string[]).includes(status);
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  account: Account;
  onOpen: (account: Account) => void;
}

function Card({ account, onOpen }: CardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      onClick={() => onOpen(account)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(account)}
      role="button"
      tabIndex={0}
      aria-label={`Account ${account.username}`}
      className={`rounded-xl border bg-slate-900 p-4 shadow-lg transition select-none ${
        disabled
          ? 'cursor-default border-slate-700/50 opacity-80'
          : isDragging
          ? 'cursor-grabbing border-cyan-400 opacity-50'
          : 'cursor-grab border-slate-700 active:cursor-grabbing'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{account.username}</h3>
          <p className="text-xs text-slate-400">{account.source}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            account.status === 'kho'
              ? 'bg-slate-700 text-slate-300'
              : account.status === 'dang_cay'
              ? 'bg-yellow-900/60 text-yellow-300'
              : account.status === 'done'
              ? 'bg-blue-900/60 text-blue-300'
              : account.status === 'da_giao_cho_ben_thu'
              ? 'bg-orange-900/60 text-orange-300'
              : 'bg-green-900/60 text-green-300'
          }`}
        >
          {STATUS_LABELS[account.status]}
        </span>
      </div>
      {account.current_holder && (
        <p className="mt-3 text-sm text-slate-400">
          AE: <span className="text-slate-200">{account.current_holder}</span>
        </p>
      )}
      <p className="mt-1 text-sm text-slate-500">Level {account.current_level}</p>
    </div>
  );
}

// ─── Column (droppable) ───────────────────────────────────────────────────────
interface ColumnProps {
  id: string;
  label: string;
  accounts: Account[];
  onOpen: (account: Account) => void;
}

function Column({ id, label, accounts, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors min-h-[400px] ${
        isOver && id === KHO_SENTINEL
          ? 'border-cyan-400 bg-cyan-950/20'
          : id === KHO_SENTINEL
          ? 'border-dashed border-slate-600 bg-slate-900/50'
          : 'border-slate-800 bg-slate-900/30'
      }`}
    >
      <h2 className="mb-2 font-bold text-white">{label}</h2>
      <div className="flex flex-col gap-3">
        {accounts.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-600">—</p>
        )}
        {accounts.map((a) => (
          <Card key={a.id} account={a} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastEntry = { id: string; message: string; kind: 'error' | 'success' };
let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  function addToast(message: string, kind: ToastEntry['kind'] = 'error') {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  return { toasts, addToast };
}

// ─── Board ────────────────────────────────────────────────────────────────────
interface BoardProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  onOpenAccount: (account: Account) => void;
}

export function Board({ initialAccounts, initialSessions, onOpenAccount }: BoardProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [sessions] = useState<HolderSession[]>(initialSessions);
  const [filter, setFilter] = useState<string>('Tất cả');
  const [aeInput, setAeInput] = useState('');
  const [aeColumns, setAeColumns] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const { toasts, addToast } = useToast();

  const snapshotRef = useRef<Account[]>(initialAccounts);

  // ─── Derive holders: UNION of current_holder + holder_name (case-insensitive) ─
  const allHolders = useMemo(() => {
    const seen = new Map<string, string>();
    aeColumns.forEach((h) => seen.set(normaliseHolder(h), h));
    accounts.forEach((a) => {
      if (a.current_holder) seen.set(normaliseHolder(a.current_holder), a.current_holder);
    });
    sessions.forEach((s) => seen.set(normaliseHolder(s.holder_name), s.holder_name));
    return Array.from(seen.values());
  }, [accounts, sessions, aeColumns]);

  // ─── DnD sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // ─── Add AE column ───────────────────────────────────────────────────────────
  function addAeColumn() {
    const raw = aeInput.trim();
    if (!raw) return;
    const norm = normaliseHolder(raw);
    if (aeColumns.some((h) => normaliseHolder(h) === norm)) {
      addToast('AE này đã tồn tại', 'error');
      return;
    }
    setAeColumns((prev) => [...prev, raw]);
    setAeInput('');
  }

  // ─── DnD handlers ────────────────────────────────────────────────────────────
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

    // Optimistic update
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

  // ─── Realtime subscription ────────────────────────────────────────────────────
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

  // ─── Filtered accounts ────────────────────────────────────────────────────────
  const filtered = accounts.filter(
    (a) => filter === 'Tất cả' || a.source === filter
  );

  const khoAccounts = filtered.filter((a) => a.status === 'kho' && !a.current_holder);
  const holderColumns = allHolders.map((holder) => ({
    id: holder,
    label: holder,
    accounts: filtered.filter((a) => a.current_holder === holder),
  }));

  return (
    <div className="relative min-h-screen bg-slate-950 p-6 text-white">
      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-xl ${
              t.kind === 'error'
                ? 'bg-red-900/90 text-red-200'
                : 'bg-green-900/90 text-green-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            DeltaForce
          </p>
          <h1 className="mt-2 text-3xl font-bold">Acc Management</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          >
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              value={aeInput}
              onChange={(e) => setAeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAeColumn()}
              placeholder="Tên AE mới"
              className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
            <button
              onClick={addAeColumn}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              + AE
            </button>
          </div>
        </div>
      </header>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <section
          className="mx-auto mt-8 gap-4 pb-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `280px repeat(${holderColumns.length + 1}, minmax(260px, 1fr))`,
          }}
        >
          <Column id={KHO_SENTINEL} label="Kho chung" accounts={khoAccounts} onOpen={onOpenAccount} />
          {holderColumns.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} accounts={col.accounts} onOpen={onOpenAccount} />
          ))}
        </section>

        {/* Drag overlay */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay>
              {activeAccount && (
                <div className="rotate-3 rounded-xl border border-cyan-400 bg-slate-800 p-4 shadow-2xl opacity-90">
                  <h3 className="font-semibold text-white">{activeAccount.username}</h3>
                  <p className="text-xs text-slate-400">{activeAccount.source}</p>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </div>
  );
}
