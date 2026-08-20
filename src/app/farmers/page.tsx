import { createClient } from '@/lib/supabase/server';
import { FarmerManager } from '@/components/farmers/farmer-manager';
import { AppShell } from '@/components/layout/app-shell';
import type { Farmer } from '@/lib/types';

export default async function FarmersPage() {
  const supabase = await createClient();
  const { data: farmers } = await supabase
    .from('farmers')
    .select('id, name')
    .order('name');

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 pr-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground tracking-wide">Quản lý AE</h1>
          <p className="text-xs text-muted-foreground">Thêm, sửa, xóa tên AE cày thuê</p>
        </div>
      </div>

      <FarmerManager initialFarmers={(farmers ?? []) as Farmer[]} />
    </div>
  );
}
