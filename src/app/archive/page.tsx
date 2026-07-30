import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import { ArchiveView, type ArchiveRow } from '@/components/archive/archive-view';
import Link from 'next/link';

export default async function ArchivePage() {
  const supabase = await createClient();

  const [{ data: accountsData }, { data: sources }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, username, password, amount_received, source, completed_at, delivered_at, paid_at, holder_sessions(holder_name)')
      .eq('status', 'da_nhan_tien')
      .order('paid_at', { ascending: false }),
    supabase.from('sources').select('id, name'),
  ]);

  const sourceMap: Record<string, string> = {};
  (sources ?? []).forEach((s) => { sourceMap[s.id] = s.name; });

  const rows: ArchiveRow[] = (accountsData ?? []).map((item) => ({
    id: item.id,
    username: item.username,
    password: item.password,
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-midnight" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

      <main className="relative mx-auto max-w-6xl px-6 py-8 text-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg border border-white/[0.06] bg-gunmetal/60 p-2 text-ash hover:text-white hover:border-brass/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-white tracking-wide">Kho lưu trữ</h1>
              <p className="text-xs text-ash">Các acc đã nhận tiền, đã hoàn tất</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-gunmetal/60 px-3 py-2 text-xs text-ash hover:text-white hover:border-signal-red/30 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>

        <ArchiveView rows={rows} />
      </main>
    </div>
  );
}
