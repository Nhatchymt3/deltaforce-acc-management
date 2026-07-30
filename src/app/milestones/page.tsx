import { createClient } from '@/lib/supabase/server';
import { PresetMilestoneManager } from '@/components/milestones/milestone-manager';
import { signOut } from '@/app/actions/auth';
import type { PresetMilestone } from '@/lib/types';
import Link from 'next/link';

export default async function MilestonesPage() {
  const supabase = await createClient();
  const { data: milestones } = await supabase
    .from('preset_milestones')
    .select('id, level, price, note')
    .order('level', { ascending: true });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-midnight" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
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
              <h1 className="font-display text-xl font-bold text-white tracking-wide">Quản lý Mốc Cày</h1>
              <p className="text-xs text-ash">Thêm, sửa, xóa các mốc Level & Giá tiền cố định</p>
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

        <PresetMilestoneManager initialMilestones={(milestones ?? []) as PresetMilestone[]} />
      </div>
    </div>
  );
}
