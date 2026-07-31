import { createClient } from '@/lib/supabase/server';
import { SourceManager } from '@/components/sources/source-manager';
import { AppShell } from '@/components/layout/app-shell';
import type { Source } from '@/lib/types';

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from('sources')
    .select('id, name')
    .order('name');

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 pr-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white tracking-wide">Quản lý nguồn</h1>
          <p className="text-xs text-ash">Thêm, sửa, xóa nguồn tài khoản</p>
        </div>
      </div>

      <SourceManager initialSources={(sources ?? []) as Source[]} />
    </div>
  );
}
