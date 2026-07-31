import { createClient } from '@/lib/supabase/server';
import { PresetMilestoneManager } from '@/components/milestones/milestone-manager';
import { AppShell } from '@/components/layout/app-shell';
import type { PresetMilestone } from '@/lib/types';

export default async function MilestonesPage() {
  const supabase = await createClient();
  const { data: milestones } = await supabase
    .from('preset_milestones')
    .select('id, level, price, note')
    .order('level', { ascending: true });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-6 py-8 pr-16">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white tracking-wide">Quản lý Mốc Cày</h1>
            <p className="text-xs text-ash">Thêm, sửa, xóa các mốc Level & Giá tiền cố định</p>
          </div>
        </div>

        <PresetMilestoneManager initialMilestones={(milestones ?? []) as PresetMilestone[]} />
      </div>
    </AppShell>
  );
}
