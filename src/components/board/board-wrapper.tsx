'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Board } from '@/components/board/board';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { Activity, Radio, ShieldAlert } from 'lucide-react';

const AccountModal = dynamic(() => import('@/components/account/account-modal').then(mod => mod.AccountModal), { ssr: false });
const CreateAccountForm = dynamic(() => import('@/components/account/create-account-form').then(mod => mod.CreateAccountForm), { ssr: false });
import { getAccountSessions, getAccountMilestones } from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession, Source, Farmer, PresetMilestone } from '@/lib/types';

interface BoardWrapperProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  initialMilestones: Milestone[];
  initialSources: Source[];
  initialFarmers: Farmer[];
  initialPresetMilestones?: PresetMilestone[];
  holderRevenue: Record<string, string>;
}

export function BoardWrapper({
  initialAccounts,
  initialSessions,
  initialMilestones,
  initialSources,
  initialFarmers,
  initialPresetMilestones = [],
  holderRevenue,
}: BoardWrapperProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [sessions, setSessions] = useState<HolderSession[]>(initialSessions);
  const [sources] = useState<Source[]>(initialSources);
  const [farmers] = useState<Farmer[]>(initialFarmers);
  const router = useRouter();

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const sourceMap = useMemo(() => {
    const map: Record<string, string> = {};
    sources.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [sources]);

  const accountMilestones = modalAccount
    ? milestones.filter((m) => m.account_id === modalAccount.id)
    : [];

  const accountSessions = modalAccount
    ? sessions.filter((s) => s.account_id === modalAccount.id)
    : [];

  // Replace all cached sessions for one account with a freshly-fetched set.
  const refreshSessions = useCallback(async (accountId: string) => {
    try {
      const fresh = await getAccountSessions(accountId);
      setSessions((prev) => [
        ...prev.filter((s) => s.account_id !== accountId),
        ...fresh,
      ]);
    } catch {
      // keep stale
    }
  }, []);

  // Replace all cached milestones for one account with a freshly-fetched set.
  const refreshMilestones = useCallback(async (accountId: string) => {
    try {
      const fresh = await getAccountMilestones(accountId);
      setMilestones((prev) => [
        ...prev.filter((m) => m.account_id !== accountId),
        ...fresh,
      ]);
    } catch {
      // keep stale
    }
  }, []);

  const handleOpenAccount = useCallback((account: Account) => {
    setModalAccount(account);
    void refreshSessions(account.id);
    void refreshMilestones(account.id);
  }, [refreshSessions, refreshMilestones]);

  const handleCloseModal = useCallback(() => {
    setModalAccount(null);
  }, []);

  const handleUpdated = useCallback((updated: Account) => {
    // Server actions return the raw `accounts` row, which lacks the derived
    // `sourceName` (source is a uuid FK). Preserve the name we already resolved
    // so the modal / card don't fall back to showing the raw source uuid.
    const sourceName = sourceMap[updated.source] ?? updated.sourceName;
    const merged = { ...updated, sourceName };
    setAccounts((prev) =>
      prev.map((a) => (a.id === merged.id ? { ...a, ...merged } : a))
    );
    setModalAccount((prev) =>
      prev && prev.id === merged.id ? { ...prev, ...merged } : merged
    );
    void refreshSessions(merged.id);
    void refreshMilestones(merged.id);
  }, [refreshSessions, refreshMilestones, sourceMap]);

  // Keep the open modal's account (esp. its `version`) in sync with realtime
  // row updates. Without this, an image upload / status change made elsewhere
  // leaves the modal holding a stale version and the next action would fail
  // with `version_conflict`. Realtime payloads omit the derived `sourceName`,
  // so preserve the one we already computed.
  const handleRealtimeAccountUpdate = useCallback((updated: Account) => {
    setModalAccount((prev) =>
      prev && prev.id === updated.id
        ? { ...prev, ...updated, sourceName: sourceMap[updated.source] ?? prev.sourceName }
        : prev
    );
  }, [sourceMap]);

  const handleDeleted = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setSessions((prev) => prev.filter((s) => s.account_id !== accountId));
    setDeletedIds((prev) => (prev.includes(accountId) ? prev : [...prev, accountId]));
    setModalAccount(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreate(false);
    router.refresh();
  }, [router]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stats = useMemo(() => {
    const dangCay = accounts.filter(a => a.status === 'dang_cay').length;
    const daGiao = accounts.filter(a => a.status === 'da_giao_cho_ben_thu').length;
    const canhBao = accounts.filter(a => !!a.tag_label && a.tag_label.toLowerCase().includes('ban')).length;
    return { dangCay, daGiao, canhBao };
  }, [accounts]);

  return (
    <>
      {mounted && document.getElementById('header-stats-portal') && createPortal(
        <>
          <div className="clip-notch flex items-center gap-2.5 border border-cyan/40 text-cyan bg-background/70 px-3.5 py-2 backdrop-blur-sm">
            <Activity className="size-4" />
            <div className="leading-none">
              <p className="font-mono text-lg font-bold">{stats.dangCay}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">Đang cày</p>
            </div>
          </div>
          <div className="clip-notch flex items-center gap-2.5 border border-gold/40 text-gold bg-background/70 px-3.5 py-2 backdrop-blur-sm">
            <Radio className="size-4" />
            <div className="leading-none">
              <p className="font-mono text-lg font-bold">{stats.daGiao}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">Đã giao</p>
            </div>
          </div>
          <div className="clip-notch flex items-center gap-2.5 border border-danger/50 text-danger bg-background/70 px-3.5 py-2 backdrop-blur-sm">
            <ShieldAlert className="size-4" />
            <div className="leading-none">
              <p className="font-mono text-lg font-bold">{stats.canhBao}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">Cảnh báo</p>
            </div>
          </div>
        </>,
        document.getElementById('header-stats-portal')!
      )}

      {/* Floating "Thêm acc" FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary px-4 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-2xl shadow-primary/20 hover:bg-primary hover:glow-cyan transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span>Thêm acc</span>
      </button>

      <Board
        initialAccounts={accounts}
        initialSessions={sessions}
        initialSources={sources}
        initialFarmers={farmers}
        initialMilestones={milestones}
        holderRevenue={holderRevenue}
        deletedIds={deletedIds}
        onOpenAccount={handleOpenAccount}
        onRealtimeAccountUpdate={handleRealtimeAccountUpdate}
      />

      {modalAccount && (
        <AccountModal
          account={modalAccount}
          milestones={accountMilestones}
          sessions={accountSessions}
          onClose={handleCloseModal}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {showCreate && (
        <CreateAccountForm
          sources={sources}
          farmers={farmers}
          presetMilestones={initialPresetMilestones}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
