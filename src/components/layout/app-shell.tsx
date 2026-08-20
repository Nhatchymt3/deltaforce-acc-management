'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
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

      {/* cinematic command banner */}
      <header className="relative z-10 shrink-0 overflow-hidden border-b border-panel-border">
        <Image
          src="/df-hero.png"
          alt=""
          fill
          priority
          aria-hidden
          className="object-cover object-[center_38%] opacity-60"
        />
        {/* darkening + accent overlays */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60"
        />
        <div aria-hidden className="scanlines absolute inset-0 opacity-40" />

        <div className="relative flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            {/* logo lockup */}
            <Link href="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
              <span className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan/50 bg-cyan/10">
                <svg className="w-5 h-5 fill-cyan text-cyan text-glow-cyan" strokeWidth="0" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2z"/>
                </svg>
              </span>
              <div className="leading-none">
                <h1 className="font-mono text-2xl font-bold tracking-[0.2em] text-foreground text-glow-cyan">
                  DELTA FORCE
                </h1>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.42em] text-cyan/90">
                  Acc Management Command
                </p>
              </div>
            </Link>
          </div>
          {/* live readout portal */}
          <div id="header-stats-portal" className="hidden items-center gap-3 md:flex" />
        </div>
      </header>

      {/* Body container with Side Rail */}
      <div className="flex min-h-0 flex-1 relative">
        {/* Main Content Area */}
        <main className="flex-1 min-w-0 relative overflow-hidden pb-16 md:pb-0 md:pr-16">
          {children}
        </main>

        {/* Side Rail Desktop (Bottom bar Mobile) */}
        <aside className="fixed bottom-0 left-0 right-0 md:absolute md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-16 z-[60] flex flex-row md:flex-col items-center justify-around md:justify-start gap-3 md:gap-4 border-t md:border-t-0 md:border-l border-panel-border bg-panel p-2 md:p-3 md:py-6 shadow-2xl backdrop-blur-md">
          {/* Background Music Player */}
          <AudioPlayer />

          <div className="hidden md:block w-8 h-px bg-panel-border my-1" />
          <div className="block md:hidden h-6 w-px bg-panel-border mx-1" />

          {/* Board Acc / Trang chủ */}
          <Link
            href="/"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Board Acc (Trang chủ)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Link>

          {/* Finance */}
          <Link
            href="/finance"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/finance'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Tài chính"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>

          {/* Farmers */}
          <Link
            href="/farmers"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/farmers'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Quản lý AE"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </Link>

          {/* Milestones */}
          <Link
            href="/milestones"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/milestones'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Quản lý Mốc cày"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>

          {/* Sources */}
          <Link
            href="/sources"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/sources'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Nguồn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </Link>

          {/* Archive */}
          <Link
            href="/archive"
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
              pathname === '/archive'
                ? 'border-cyan/50 bg-cyan/20 text-cyan text-glow-cyan shadow-[0_0_12px_-2px_var(--cyan)]'
                : 'border-transparent text-muted-foreground hover:text-cyan hover:border-cyan/30 hover:bg-cyan/10'
            }`}
            title="Kho lưu trữ"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </Link>

          <div className="hidden md:block w-8 h-px bg-panel-border my-1" />
          <div className="block md:hidden h-6 w-px bg-panel-border mx-1" />

          {/* Logout */}
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:text-danger hover:border-danger/30 hover:bg-danger/10 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-panel-border px-6 py-3 font-mono text-[11px] tracking-wider text-muted-foreground bg-background z-30">
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
          DFA ACC MANAGEMENT SYSTEM · ONLINE
        </span>
        <span>Delta Force Farming & Allocation</span>
      </footer>

      <FloatingLeaderboard />
    </div>
  );
}
