import { createClient } from '@/lib/supabase/server';
import { BoardWrapper } from '@/components/board/board-wrapper';
import type { Account, HolderSession, Milestone } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: sessions }, { data: milestones }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .order('position'),
      supabase
        .from('holder_sessions')
        .select('*')
        .order('started_at'),
      supabase
        .from('account_milestones')
        .select('*')
        .order('level'),
    ]);

  // Serialize bigint fields to strings for JSON transport
  const serialisedAccounts = (accounts ?? []).map((a) => ({
    ...a,
    amount_received:
      a.amount_received != null ? String(a.amount_received) : null,
  })) as Account[];

  const serialisedSessions = (sessions ?? []).map((s) => ({
    ...s,
    duration_seconds: s.duration_seconds != null ? Number(s.duration_seconds) : null,
  })) as HolderSession[];

  const serialisedMilestones = (milestones ?? []).map((m) => ({
    ...m,
    price: String(m.price),
  })) as Milestone[];

  return (
    <BoardWrapper
      initialAccounts={serialisedAccounts}
      initialSessions={serialisedSessions}
      initialMilestones={serialisedMilestones}
    />
  );
}
