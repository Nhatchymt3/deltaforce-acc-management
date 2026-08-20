'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { calculateFinance, formatVndString } from '@/lib/finance';

interface LeaderboardItem {
  holder: string;
  totalIncome: string;
  accountCount: number;
}

export function FloatingLeaderboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Position state with desktop & mobile defaults
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('df_leaderboard_pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      } catch {
        // use default
      }
    }
  }, []);

  // Fetch leaderboard data when modal opens
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          username,
          amount_received,
          holder_sessions (
            holder_name,
            ended_at
          )
        `)
        .eq('status', 'da_nhan_tien');

      if (error) {
        console.error('Error fetching leaderboard data:', error);
        setLoading(false);
        return;
      }

      // Map to PaidAccount structure
      const accountCounts: Record<string, number> = {};
      const paidAccounts = (data || []).map((acc: any) => {
        const rawHolders = acc.holder_sessions?.map((s: any) => s.holder_name) || [];
        const uniqueHolders = Array.from(new Set(rawHolders)) as string[];

        uniqueHolders.forEach((h) => {
          accountCounts[h] = (accountCounts[h] || 0) + 1;
        });

        const sessions = acc.holder_sessions || [];
        const lastSession = sessions.length > 0
          ? [...sessions].sort((a: any, b: any) => new Date(b.ended_at || 0).getTime() - new Date(a.ended_at || 0).getTime())[0]
          : null;

        return {
          id: acc.id,
          username: acc.username,
          amount_received: String(acc.amount_received || 0),
          holders: uniqueHolders,
          lastHolder: lastSession?.holder_name || null,
        };
      });

      const summary = calculateFinance(paidAccounts);

      const items: LeaderboardItem[] = Object.entries(summary.byHolder)
        .map(([holder, total]) => ({
          holder,
          totalIncome: total,
          accountCount: accountCounts[holder] || 0,
        }))
        .sort((a, b) => Number(b.totalIncome) - Number(a.totalIncome));

      setLeaderboard(items);
    } catch (err) {
      console.error('Leaderboard calculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => {
    if (!hasMovedRef.current) {
      if (!isOpen) {
        fetchLeaderboard();
      }
      setIsOpen(!isOpen);
    }
  };

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(10, Math.min(window.innerWidth - 60, posStartRef.current.x + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 60, posStartRef.current.y + dy));

      setPosition({ x: newX, y: newY });
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (hasMovedRef.current) {
      localStorage.setItem('df_leaderboard_pos', JSON.stringify(position));
    }
  };

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restList = leaderboard.slice(3);

  return (
    <>
      {/* Draggable Icon Button */}
      <div
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={toggleModal}
        className={`fixed top-0 left-0 z-50 flex h-13 w-13 cursor-grab active:cursor-grabbing items-center justify-center rounded-2xl border border-primary/50 bg-background/95 text-primary shadow-2xl shadow-primary/30 backdrop-blur-xl hover:scale-110 hover:border-primary hover:shadow-primary/50 group ${
          isDragging ? 'transition-none' : 'transition-transform duration-200'
        }`}
        title="Bảng Xếp Hạng Thu Nhập AE"
      >
        <span className="text-2xl select-none group-hover:rotate-12 transition-transform duration-300">🏆</span>
        <span className="absolute -bottom-1.5 -right-1 flex h-4 w-7 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-primary-foreground tracking-wider border border-background shadow">
          TOP
        </span>
      </div>

      {/* Leaderboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-gradient-to-b from-card via-card to-background p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 blur-[90px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-xl shadow-inner">
                  🏆
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-wider font-display uppercase">
                    BẢNG XẾP HẠNG THU NHẬP AE
                  </h2>
                  <p className="text-[11px] text-muted-foreground/70">Thống kê từ các tài khoản đã hoàn tất thanh toán</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs tracking-wide">Đang tính toán dữ liệu...</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-xs tracking-wide">
                Chưa có dữ liệu tài khoản đã nhận tiền.
              </div>
            ) : (
              <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar relative z-10">
                {/* Podium Top 3 */}
                <div className="grid grid-cols-3 gap-3 pt-6 items-end">
                  {/* Hạng 2 (Bạc) */}
                  <div className="flex flex-col items-center">
                    {top2 ? (
                      <div className="w-full flex flex-col items-center rounded-2xl border border-slate-400/40 bg-gradient-to-b from-slate-400/15 to-slate-900/40 p-3.5 text-center shadow-lg hover:border-slate-300/60 transition-all">
                        <div className="mb-2">
                          <span className="text-3xl">🥈</span>
                        </div>
                        <span className="text-xs font-bold text-slate-100 truncate max-w-full tracking-wide">
                          {top2.holder}
                        </span>
                        <span className="text-xs font-extrabold text-muted-foreground mt-1.5 font-mono">
                          {formatVndString(top2.totalIncome)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 mt-0.5 bg-muted px-2 py-0.5 rounded-full border border-border">
                          {top2.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground/30 gap-1 bg-muted/50">
                        <span className="text-lg opacity-40">🥈</span>
                        <span>--</span>
                      </div>
                    )}
                  </div>

                  {/* Hạng 1 (Vàng - Nổi bật cao hơn) */}
                  <div className="flex flex-col items-center -mt-4">
                    {top1 ? (
                      <div className="w-full flex flex-col items-center rounded-2xl border-2 border-primary bg-gradient-to-b from-brass/25 via-primary/10 to-background p-4 text-center shadow-xl shadow-primary/25 hover:border-amber-300 transition-all transform hover:-translate-y-0.5">
                        <div className="mb-2">
                          <span className="text-4xl animate-bounce-short">🥇</span>
                        </div>
                        <span className="text-sm font-black text-primary truncate max-w-full tracking-wider uppercase font-display">
                          {top1.holder}
                        </span>
                        <span className="text-sm font-black text-amber-500 mt-1 font-mono tracking-tight drop-shadow">
                          {formatVndString(top1.totalIncome)}
                        </span>
                        <span className="text-[10px] font-bold text-primary-foreground bg-primary px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">
                          {top1.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-32 rounded-2xl border border-dashed border-primary/30 flex flex-col items-center justify-center text-xs text-muted-foreground/30 gap-1 bg-primary/[0.02]">
                        <span className="text-xl opacity-40">🥇</span>
                        <span>--</span>
                      </div>
                    )}
                  </div>

                  {/* Hạng 3 (Đồng) */}
                  <div className="flex flex-col items-center">
                    {top3 ? (
                      <div className="w-full flex flex-col items-center rounded-2xl border border-amber-600/40 bg-gradient-to-b from-amber-700/20 to-slate-900/40 p-3.5 text-center shadow-lg hover:border-amber-500/60 transition-all">
                        <div className="mb-2">
                          <span className="text-3xl">🥉</span>
                        </div>
                        <span className="text-xs font-bold text-amber-100 truncate max-w-full tracking-wide">
                          {top3.holder}
                        </span>
                        <span className="text-xs font-extrabold text-amber-400 mt-1.5 font-mono">
                          {formatVndString(top3.totalIncome)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 mt-0.5 bg-muted px-2 py-0.5 rounded-full border border-border">
                          {top3.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-xs text-muted-foreground/30 gap-1 bg-muted/50">
                        <span className="text-lg opacity-40">🥉</span>
                        <span>--</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rest of the leaderboard list */}
                {restList.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 font-display">
                      BẢNG THÀNH TÍCH TIẾP THEO
                    </h3>
                    {restList.map((item, index) => (
                      <div
                        key={item.holder}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-2.5 text-xs hover:bg-muted/80 hover:border-border transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-muted-foreground/50 w-6 font-extrabold text-center">
                            #{index + 4}
                          </span>
                          <span className="font-semibold text-foreground">{item.holder}</span>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <span className="text-[11px] text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-md">
                            {item.accountCount} acc
                          </span>
                          <span className="font-extrabold text-primary font-mono min-w-[90px]">
                            {formatVndString(item.totalIncome)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
