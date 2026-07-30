'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Board } from '@/components/board/board';
import dynamic from 'next/dynamic';

const AccountModal = dynamic(() => import('@/components/account/account-modal').then(mod => mod.AccountModal), { ssr: false });
const CreateAccountForm = dynamic(() => import('@/components/account/create-account-form').then(mod => mod.CreateAccountForm), { ssr: false });
import { getAccountSessions } from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession, Source, Farmer } from '@/lib/types';

interface BoardWrapperProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  initialMilestones: Milestone[];
  initialSources: Source[];
  initialFarmers: Farmer[];
  holderRevenue: Record<string, string>;
}

export function BoardWrapper({
  initialAccounts,
  initialSessions,
  initialMilestones,
  initialSources,
  initialFarmers,
  holderRevenue,
}: BoardWrapperProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [milestones] = useState<Milestone[]>(initialMilestones);
  const [sessions, setSessions] = useState<HolderSession[]>(initialSessions);
  const [sources] = useState<Source[]>(initialSources);
  const [farmers] = useState<Farmer[]>(initialFarmers);
  const router = useRouter();

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Ids deleted locally. Board keeps its own accounts state, so we bridge
  // deletions down explicitly instead of relying on realtime DELETE events
  // (which require the accounts table to be in the realtime publication).
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
      // keep stale data on failure rather than blanking the history
    }
  }, []);

  const handleOpenAccount = useCallback((account: Account) => {
    setModalAccount(account);
    void refreshSessions(account.id);
  }, [refreshSessions]);

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
  }, [refreshSessions, sourceMap]);

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

  return (
    <>
      {/* Floating "Thêm acc" FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/30 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-110 active:scale-95"
      >
        <span className="text-xl">+</span> Thêm acc
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
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
