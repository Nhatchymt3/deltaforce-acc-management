'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/browser';
import { signOut } from '@/app/actions/auth';

const AudioPlayer = dynamic(
  () => import('@/components/ui/audio-player').then((mod) => mod.AudioPlayer),
  { ssr: false }
);

const FloatingLeaderboard = dynamic(
  () => import('@/components/ui/floating-leaderboard').then((mod) => mod.FloatingLeaderboard),
  { ssr: false }
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('app-shell-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => {
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_milestones' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="relative h-screen flex flex-col overflow-hidden text-foreground bg-background">
      {/* Background Star Effect */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

      {/* Global Top Bar */}
      <header className="shrink-0 mx-auto flex w-full items-center justify-between gap-4 px-6 pt-3 pb-2 border-b border-white/[0.04] bg-background/40 backdrop-blur-md">
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <h1 className="font-display text-xl font-bold tracking-wide text-white">
              DF<span className="text-brass">△</span>
            </h1>
            <span className="text-[11px] font-display font-medium uppercase tracking-[0.2em] text-muted-foreground/60 hidden sm:inline">
              Acc Management
            </span>
          </Link>
        </div>
      </header>

      {/* Control Dock: Bottom bar on mobile, Right sidebar on desktop */}
      <FloatingLeaderboard />
      <aside className="fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-4 md:top-16 z-40 flex flex-row md:flex-col items-center justify-around md:justify-start gap-1.5 md:gap-2 border-t md:border border-white/[0.08] bg-gunmetal/95 md:bg-gunmetal/90 p-2 shadow-2xl backdrop-blur-xl transition-all">
        {/* Background Music Player */}
        <AudioPlayer />

        <div className="hidden md:block w-6 h-px bg-white/10 my-0.5" />
        <div className="block md:hidden h-6 w-px bg-white/10 mx-0.5" />

        {/* Board Acc / Trang chủ */}
        <Link
          href="/"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-white hover:border-primary/30'
          }`}
          title="Board Acc (Trang chủ)"
          aria-label="Trang chủ Board Acc"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </Link>

        {/* Finance */}
        <Link
          href="/finance"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/finance'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-brass hover:border-primary/30'
          }`}
          title="Tài chính"
          aria-label="Quản lý Tài chính"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>

        {/* Farmers */}
        <Link
          href="/farmers"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/farmers'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-white hover:border-primary/30'
          }`}
          title="Quản lý AE"
          aria-label="Quản lý AE"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </Link>

        {/* Milestones */}
        <Link
          href="/milestones"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/milestones'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-white hover:border-primary/30'
          }`}
          title="Quản lý Mốc cày"
          aria-label="Quản lý Mốc cày"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </Link>

        {/* Sources */}
        <Link
          href="/sources"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/sources'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-white hover:border-primary/30'
          }`}
          title="Nguồn"
          aria-label="Quản lý Nguồn"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        </Link>

        {/* Archive */}
        <Link
          href="/archive"
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
            pathname === '/archive'
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-brass/30'
              : 'border-white/[0.06] bg-background/60 text-muted-foreground hover:text-white hover:border-primary/30'
          }`}
          title="Kho lưu trữ"
          aria-label="Kho lưu trữ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </Link>

        <div className="hidden md:block w-6 h-px bg-white/10 my-0.5" />
        <div className="block md:hidden h-6 w-px bg-white/10 mx-0.5" />

        {/* Logout */}
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-background/60 text-muted-foreground hover:text-signal-red hover:border-signal-red/30 hover:bg-signal-red/10 transition-all"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </form>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 relative overflow-hidden pb-16 md:pb-0">
        {children}
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-white/[0.04] bg-background/90 py-2 px-6 text-center text-[10px] text-muted-foreground/50 font-mono flex items-center justify-between z-30">
        <span>DF△ ACC MANAGEMENT SYSTEM</span>
        <span>Delta Force Farming & Allocation Platform</span>
      </footer>
    </div>
  );
}
