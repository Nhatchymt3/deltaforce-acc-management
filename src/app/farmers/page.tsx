import { createClient } from '@/lib/supabase/server';
import { FarmerManager } from '@/components/farmers/farmer-manager';
import { signOut } from '@/app/actions/auth';
import type { Farmer } from '@/lib/types';
import Link from 'next/link';

export default async function FarmersPage() {
  const supabase = await createClient();
  const { data: Farmers } = await supabase
    .from('Farmers')
    .select('id, name')
    .order('name');

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        {/* Stars */}
        <div className="stars-bg absolute inset-0" />
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/"
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">
                DeltaForce
              </p>
            </div>
            <h1 className="text-3xl font-bold text-white">Quản lý nguồn</h1>
            <p className="mt-1 text-sm text-slate-400">
              Thêm, sửa, xóa nguồn tài khoản
            </p>
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

        <FarmerManager initialFarmers={(Farmers ?? []) as Farmer[]} />
      </div>
    </div>
  );
}


