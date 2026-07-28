import { createClient } from '@/lib/supabase/server';
import { calculateFinance, formatVnd, formatHolders } from '@/lib/finance';
import type { Account, HolderSession } from '@/lib/types';

export default async function FinancePage() {
  const supabase = await createClient();

  // Fetch paid accounts with all their holder sessions
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, username, amount_received, holder_sessions(holder_name)')
    .eq('status', 'da_nhan_tien');

  const accounts = (accountsData ?? []).map((item) => ({
    id: item.id,
    username: item.username,
    amount_received: String(item.amount_received ?? '0'),
    holders: Array.from(
      new Set(
        (item.holder_sessions ?? []).map(
          (s: { holder_name: string }) => s.holder_name
        )
      )
    ),
  }));

  const summary = calculateFinance(accounts);
  const holderRows = formatHolders(summary.byHolder);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <h1 className="text-3xl font-bold">Tài chính</h1>

      {/* Per-account breakdown */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-300">Chi tiết từng acc</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400">
                <th className="pb-2 pr-4 font-medium">Username</th>
                <th className="pb-2 pr-4 font-medium">AE</th>
                <th className="pb-2 pr-4 font-medium text-right">Tổng tiền</th>
                <th className="pb-2 pr-4 font-medium text-right">Mỗi người</th>
              </tr>
            </thead>
            <tbody>
              {summary.accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Chưa có acc nào nhận tiền.
                  </td>
                </tr>
              ) : (
                summary.accounts.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800 text-slate-300"
                  >
                    <td className="py-3 pr-4 font-medium text-white">{row.username}</td>
                    <td className="py-3 pr-4">{row.holders.join(', ')}</td>
                    <td className="py-3 pr-4 text-right">{formatVnd(row.amount_received)}</td>
                    <td className="py-3 text-right text-cyan-300">{formatVnd(row.share)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Per-holder totals */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-300">Tổng theo AE</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {holderRows.length === 0 ? (
            <p className="text-slate-500">Chưa có dữ liệu.</p>
          ) : (
            holderRows.map(({ holder, formatted }) => (
              <article
                key={holder}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{holder}</p>
                <p className="mt-2 text-2xl font-bold text-cyan-300">{formatted}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
