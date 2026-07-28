'use client';

import { useState, useCallback } from 'react';
import { Board } from '@/components/board/board';
import { AccountModal } from '@/components/account/account-modal';
import { CreateAccountForm } from '@/components/account/create-account-form';
import type { Account, Milestone, HolderSession } from '@/lib/types';

interface BoardWrapperProps {
  initialAccounts: Account[];
  initialSessions: HolderSession[];
  initialMilestones: Milestone[];
}

export function BoardWrapper({ initialAccounts, initialSessions, initialMilestones }: BoardWrapperProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [milestones] = useState<Milestone[]>(initialMilestones);
  const [sessions] = useState<HolderSession[]>(initialSessions);

  const [modalAccount, setModalAccount] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const accountMilestones = modalAccount
    ? milestones.filter((m) => m.account_id === modalAccount.id)
    : [];

  const accountSessions = modalAccount
    ? sessions.filter((s) => s.account_id === modalAccount.id)
    : [];

  const handleOpenAccount = useCallback((account: Account) => {
    setModalAccount(account);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalAccount(null);
  }, []);

  const handleUpdated = useCallback((updated: Account) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setModalAccount(updated);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreate(false);
    // revalidate will refresh the page via the server action
    window.location.reload();
  }, []);

  // The "Thêm acc" button needs to be accessible from the board header.
  // We expose this via a custom event / ref approach by rendering the
  // button here and using CSS to position it in the board header.
  // A simpler approach: render a floating action button below the header.

  return (
    <>
      {/* Floating "Thêm acc" FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 z-40 flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-cyan-500 transition"
      >
        <span className="text-xl">+</span> Thêm acc
      </button>

      <Board
        initialAccounts={accounts}
        initialSessions={sessions}
        onOpenAccount={handleOpenAccount}
      />

      {modalAccount && (
        <AccountModal
          account={modalAccount}
          milestones={accountMilestones}
          sessions={accountSessions}
          onClose={handleCloseModal}
          onUpdated={handleUpdated}
        />
      )}

      {showCreate && (
        <CreateAccountForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
