import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BoardWrapper } from '@/components/board/board-wrapper';
import { calculateFinance } from '@/lib/finance';
import type { Account, HolderSession, Milestone, Source } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: accounts },
    { data: sessions },
    { data: milestones },
    { data: sources },
    { data: farmers },
    { data: paidAccounts },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .neq('status', 'da_nhan_tien')
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
    supabase
      .from('farmers')
      .select('id, name')
      .order('name'),
    // Paid accounts carry the revenue (amount_received). They are excluded from
    // the board itself, but we still need their per-holder split to order the
    // AE columns by how much each person has earned.
    supabase
      .from('accounts')
      .select('id, username, amount_received, holder_sessions(holder_name)')
      .eq('status', 'da_nhan_tien'),
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
  const serialisedFarmers = (farmers ?? []) as { id: string; name: string }[];

  // Auto-sync: If an account has a current_holder string not in valid farmers,
  // sync it to the active farmer name so no account is left behind.
  const validFarmerNames = new Set(serialisedFarmers.map((f) => f.name.trim().toLowerCase()));
  if (serialisedFarmers.length > 0) {
    const defaultFarmerName = serialisedFarmers[0].name;
    const admin = createAdminClient();
    let needsUpdate = false;

    serialisedAccounts.forEach((acc) => {
      if (acc.current_holder && !validFarmerNames.has(acc.current_holder.trim().toLowerCase())) {
        acc.current_holder = defaultFarmerName;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      await admin
        .from('accounts')
        .update({ current_holder: defaultFarmerName })
        .not('current_holder', 'is', null);
    }
  }

  // Per-holder revenue (VND string) from paid accounts, split equally among the
  // holders that ever cầm each acc — same rule the finance page uses.
  const paidForFinance = (paidAccounts ?? []).map((item) => ({
    id: item.id,
    username: item.username,
    amount_received: String(item.amount_received ?? '0'),
    holders: Array.from(
      new Set(
        (item.holder_sessions ?? []).map((s: { holder_name: string }) => s.holder_name)
      )
    ),
  }));
  const holderRevenue = calculateFinance(paidForFinance).byHolder;

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
      initialFarmers={serialisedFarmers}
      holderRevenue={holderRevenue}
    />
  );
}
