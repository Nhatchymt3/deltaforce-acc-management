import { createClient } from '@/lib/supabase/server';
import { FinanceView, type FinanceAccount } from '@/components/finance/finance-view';
import { AppShell } from '@/components/layout/app-shell';

export default async function FinancePage() {
  const supabase = await createClient();

  const [{ data: accountsData }, { data: sources }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, username, amount_received, source, completed_at, delivered_at, paid_at, holder_sessions(holder_name, ended_at)')
      .eq('status', 'da_nhan_tien'),
    supabase.from('sources').select('id, name'),
  ]);

  const sourceMap: Record<string, string> = {};
  (sources ?? []).forEach((s) => { sourceMap[s.id] = s.name; });

  const accounts: FinanceAccount[] = (accountsData ?? []).map((item) => {
    const sessions = item.holder_sessions ?? [];
    const holders = Array.from(new Set(sessions.map((s: { holder_name: string }) => s.holder_name)));
    const lastSession = sessions.length > 0
      ? [...sessions].sort((a, b) => new Date(b.ended_at ?? 0).getTime() - new Date(a.ended_at ?? 0).getTime())[0]
      : null;

    return {
      id: item.id,
      username: item.username,
      amount_received: String(item.amount_received ?? '0'),
      sourceName: sourceMap[item.source] ?? item.source,
      holders,
      lastHolder: lastSession?.holder_name ?? null,
      completed_at: item.completed_at,
      delivered_at: item.delivered_at,
      paid_at: item.paid_at,
    };
  });

  return (
    <div className="relative mx-auto max-w-5xl px-6 py-8 text-gray-200 pr-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white tracking-wide">Tài chính</h1>
          <p className="text-xs text-ash">Theo dõi thu nhập AE</p>
        </div>
      </div>

      <FinanceView initialAccounts={accounts} />
    </div>
  );
}
