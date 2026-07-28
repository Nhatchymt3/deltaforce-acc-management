import { createClient } from '@/lib/supabase/server';
import { BoardWrapper } from '@/components/board/board-wrapper';
import type { Account, HolderSession, Milestone, Source } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: sessions }, { data: milestones }, { data: sources }] =
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
      supabase
        .from('sources')
        .select('id, name')
        .order('name'),
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

  const serialisedSources = (sources ?? []) as Source[];

  // Build source map: id → name
  const sourceMap: Record<string, string> = {};
  serialisedSources.forEach((s) => { sourceMap[s.id] = s.name; });

  // Attach sourceName to accounts for display
  const accountsWithSourceName = serialisedAccounts.map((a) => ({
    ...a,
    sourceName: sourceMap[a.source] ?? a.source,
  }));

  return (
    <BoardWrapper
      initialAccounts={accountsWithSourceName}
      initialSessions={serialisedSessions}
      initialMilestones={serialisedMilestones}
      initialSources={serialisedSources}
    />
  );
}
