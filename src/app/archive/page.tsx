import { createClient } from '@/lib/supabase/server';
import { ArchiveView } from '@/components/archive/archive-view';
import { AppShell } from '@/components/layout/app-shell';

export default async function ArchivePage() {
  const supabase = await createClient();

  const [
    { data: accountsData },
    { data: sources },
    { data: milestonesData },
    { data: sessionsData },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('status', 'da_nhan_tien')
      .order('paid_at', { ascending: false }),
    supabase.from('sources').select('id, name'),
    supabase.from('account_milestones').select('*').order('level'),
    supabase.from('holder_sessions').select('*').order('started_at'),
  ]);

  const sourceMap: Record<string, string> = {};
  (sources ?? []).forEach((s) => { sourceMap[s.id] = s.name; });

  const accounts = (accountsData ?? []).map((a) => ({
    ...a,
    amount_received: a.amount_received != null ? String(a.amount_received) : null,
    sourceName: sourceMap[a.source] ?? a.source,
  })) as any[];

  const milestones = (milestonesData ?? []).map((m) => ({
    ...m,
    price: String(m.price),
  })) as any[];

  const sessions = (sessionsData ?? []).map((s) => ({
    ...s,
    duration_seconds: s.duration_seconds != null ? Number(s.duration_seconds) : null,
  })) as any[];

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-8 text-gray-200 pr-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white tracking-wide">Kho lưu trữ</h1>
          <p className="text-xs text-ash">Các acc đã nhận tiền, đã hoàn tất</p>
        </div>
      </div>

      <ArchiveView accounts={accounts} milestones={milestones} sessions={sessions} />
    </div>
  );
}
