import { createClient } from '@/lib/supabase/server';
import { formatVnd } from '@/lib/finance';
import { signOut } from '@/app/actions/auth';
import Link from 'next/link';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

type ArchiveRow = {
  id: string;
  username: string;
  amount_received: string;
  sourceName: string;
  holders: string[];
  completed_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
};

export default async function ArchivePage() {
  const supabase = await createClient();

  const [{ data: accountsData }, { data: sources }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, username, amount_received, source, completed_at, delivered_at, paid_at, holder_sessions(holder_name)')
      .eq('status', 'da_nhan_tien')
      .order('paid_at', { ascending: false }),
    supabase.from('sources').select('id, name'),
  ]);

  const sourceMap: Record<string, string> = {};
  (sources ?? []).forEach((s) => { sourceMap[s.id] = s.name; });

  const rows: ArchiveRow[] = (accountsData ?? []).map((item) => ({
    id: item.id,
    username: item.username,
    amount_received: String(item.amount_received ?? '0'),
    sourceName: sourceMap[item.source] ?? item.source,
    holders: Array.from(
      new Set(
        (item.holder_sessions ?? []).map((s: { holder_name: string }) => s.holder_name)
      )
    ),
    completed_at: item.completed_at,
    delivered_at: item.delivered_at,
    paid_at: item.paid_at,
  }));

  const totalReceived = rows.reduce((sum, r) => sum + Number(r.amount_received), 0);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="stars-bg absolute inset-0" />
      </div>

      <main className="relative mx-auto max-w-6xl px-6 py-10 text-white">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/"
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Quay lại board"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-400">DeltaForce</p>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-green-100 to-emerald-200 bg-clip-text text-transparent">
              Kho lưu trữ
            </h1>
            <p className="mt-1 text-sm text-slate-400">Các acc đã nhận tiền, đã hoàn tất</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tổng acc đã lưu trữ</p>
            <p className="text-2xl font-bold text-white">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-950/40 to-emerald-950/40 backdrop-blur-xl p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Tổng tiền đã nhận</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
              {formatVnd(totalReceived)}
            </p>
          </div>
        </div>

        {/* Archive table */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Nguồn</th>
                  <th className="px-5 py-3 font-medium">AE</th>
                  <th className="px-5 py-3 font-medium text-right">Tổng tiền</th>
                  <th className="px-5 py-3 font-medium">Bấm Done</th>
                  <th className="px-5 py-3 font-medium">Đã giao</th>
                  <th className="px-5 py-3 font-medium">Nhận tiền</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-600">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Chưa có acc nào được lưu trữ.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 text-slate-300 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
                            <span className="text-green-400 font-semibold text-xs">
                              {row.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-white">{row.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{row.sourceName}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {row.holders.map((h) => (
                            <span key={h} className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-400">
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                        {formatVnd(row.amount_received)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.completed_at)}</td>
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.delivered_at)}</td>
                      <td className="px-5 py-4 text-xs text-green-300 whitespace-nowrap">{formatDate(row.paid_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
