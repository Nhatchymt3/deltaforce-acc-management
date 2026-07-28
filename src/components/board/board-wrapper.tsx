'use client';

import { useState, useCallback } from 'react';
import { Board } from '@/components/board/board';
import { AccountModal } from '@/components/account/account-modal';
import { CreateAccountForm } from '@/components/account/create-account-form';
import { getAccountSessions } from '@/app/actions/accounts';
import type { Account, Milestone, HolderSession, Source } from '@/lib/types';

interface BoardWrapperProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  initialMilestones: Milestone[];
  initialSources: Source[];
}

export function BoardWrapper({
  initialAccounts,
  initialSessions,
  initialMilestones,
  initialSources,
}: BoardWrapperProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [milestones] = useState<Milestone[]>(initialMilestones);
  const [sessions, setSessions] = useState<HolderSession[]>(initialSessions);
  const [sources] = useState<Source[]>(initialSources);

  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    setAccounts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setModalAccount(updated);
    void refreshSessions(updated.id);
  }, [refreshSessions]);

  const handleDeleted = useCallback((accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setSessions((prev) => prev.filter((s) => s.account_id !== accountId));
    setModalAccount(null);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreate(false);
    window.location.reload();
  }, []);

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
        initialMilestones={milestones}
        onOpenAccount={handleOpenAccount}
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
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
