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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="stars-bg absolute inset-0" />
      </div>

      <main className="relative mx-auto max-w-5xl px-6 py-10 text-white">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400 mb-1">DeltaForce</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
            Tài chính
          </h1>
          <p className="mt-1 text-sm text-slate-400">Theo dõi thu nhập và chia tiền AE</p>
        </div>

        {/* Per-account breakdown */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Chi tiết từng acc</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Username</th>
                    <th className="px-5 py-3 font-medium">AE</th>
                    <th className="px-5 py-3 font-medium text-right">Tổng tiền</th>
                    <th className="px-5 py-3 font-medium text-right">Mỗi người</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-600">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          Chưa có acc nào nhận tiền.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    summary.accounts.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-white/5 text-slate-300 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                              <span className="text-cyan-400 font-semibold text-xs">
                                {row.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-white">{row.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {row.holders.map((h) => (
                              <span key={h} className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-400">
                                {h}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-300">{formatVnd(row.amount_received)}</td>
                        <td className="px-5 py-4 text-right font-semibold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                          {formatVnd(row.share)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Per-holder totals */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Tổng theo AE</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {holderRows.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-10 text-center text-slate-600">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Chưa có dữ liệu.
              </div>
            ) : (
              holderRows.map(({ holder, formatted }) => (
                <article
                  key={holder}
                  className="group rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl p-5 hover:border-green-400/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-xs">
                        {holder.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{holder}</p>
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                    {formatted}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
