'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/actions/auth';

export function HeaderNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Board Acc' },
    { href: '/finance', label: 'Tài chính' },
    { href: '/farmers', label: 'Quản lý AE' },
    { href: '/milestones', label: 'Mốc cày' },
    { href: '/sources', label: 'Nguồn' },
    { href: '/archive', label: 'Lưu trữ' },
  ];

  return (
    <header className="shrink-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0">
      <div className="mx-auto flex max-w-full items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold tracking-wide text-foreground">
              DF<span className="text-primary">△</span>
            </span>
            <span className="text-[10px] font-display font-medium uppercase tracking-[0.2em] text-muted-foreground/60 hidden sm:inline">
              Acc Management
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-signal-red/30 transition-all"
              title="Đăng xuất"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
