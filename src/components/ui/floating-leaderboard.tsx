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
            holder_name
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

        return {
          id: acc.id,
          username: acc.username,
          amount_received: String(acc.amount_received || 0),
          holders: uniqueHolders,
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
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(10, Math.min(window.innerWidth - 60, posStartRef.current.x + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 60, posStartRef.current.y + dy));

    setPosition({ x: newX, y: newY });
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
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={toggleModal}
        className="fixed z-50 flex h-12 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-full border border-brass/40 bg-midnight/90 text-brass shadow-lg shadow-brass/20 backdrop-blur-md transition-shadow hover:scale-105 hover:border-brass hover:shadow-brass/40"
        title="Bảng Xếp Hạng Thu Nhập AE"
      >
        <span className="text-xl select-none">🏆</span>
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[9px] font-bold text-midnight">
          TOP
        </span>
      </div>

      {/* Leaderboard Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gunmetal p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide font-display">
                    BẢNG XẾP HẠNG THU NHẬP AE
                  </h2>
                  <p className="text-xs text-ash/70">Thống kê từ các tài khoản đã nhận tiền</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ash hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-ash">
                <div className="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Đang tải dữ liệu...</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-12 text-center text-ash text-sm">
                Chưa có dữ liệu thu nhập tài khoản đã nhận tiền.
              </div>
            ) : (
              <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                {/* Podium Top 3 */}
                <div className="grid grid-cols-3 gap-2 pt-2 items-end">
                  {/* Hạng 2 */}
                  <div className="flex flex-col items-center">
                    {top2 ? (
                      <div className="w-full flex flex-col items-center rounded-xl border border-silver/30 bg-silver/10 p-3 text-center">
                        <span className="text-2xl mb-1">🥈</span>
                        <span className="text-xs font-bold text-gray-200 truncate max-w-full">
                          {top2.holder}
                        </span>
                        <span className="text-[11px] font-bold text-silver mt-1">
                          {formatVndString(top2.totalIncome)}
                        </span>
                        <span className="text-[9px] text-ash/60 mt-0.5">
                          {top2.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-xs text-ash/40">
                        --
                      </div>
                    )}
                  </div>

                  {/* Hạng 1 */}
                  <div className="flex flex-col items-center -mt-3">
                    {top1 ? (
                      <div className="w-full flex flex-col items-center rounded-xl border border-brass bg-brass/15 p-4 text-center shadow-lg shadow-brass/20">
                        <span className="text-3xl mb-1">🥇</span>
                        <span className="text-sm font-bold text-brass truncate max-w-full">
                          {top1.holder}
                        </span>
                        <span className="text-xs font-extrabold text-brass mt-1">
                          {formatVndString(top1.totalIncome)}
                        </span>
                        <span className="text-[10px] text-ash/80 mt-0.5">
                          {top1.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-xl border border-dashed border-brass/30 flex items-center justify-center text-xs text-ash/40">
                        --
                      </div>
                    )}
                  </div>

                  {/* Hạng 3 */}
                  <div className="flex flex-col items-center">
                    {top3 ? (
                      <div className="w-full flex flex-col items-center rounded-xl border border-amber-700/40 bg-amber-900/20 p-3 text-center">
                        <span className="text-2xl mb-1">🥉</span>
                        <span className="text-xs font-bold text-amber-200 truncate max-w-full">
                          {top3.holder}
                        </span>
                        <span className="text-[11px] font-bold text-amber-400 mt-1">
                          {formatVndString(top3.totalIncome)}
                        </span>
                        <span className="text-[9px] text-ash/60 mt-0.5">
                          {top3.accountCount} acc
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-xs text-ash/40">
                        --
                      </div>
                    )}
                  </div>
                </div>

                {/* Rest of the leaderboard list */}
                {restList.length > 0 && (
                  <div className="space-y-1.5 border-t border-white/10 pt-4">
                    <h3 className="text-xs font-semibold text-ash/80 mb-2 uppercase tracking-wider">
                      Vị trí tiếp theo
                    </h3>
                    {restList.map((item, index) => (
                      <div
                        key={item.holder}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-ash/60 w-5 font-bold">
                            #{index + 4}
                          </span>
                          <span className="font-medium text-gray-200">{item.holder}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-brass">
                            {formatVndString(item.totalIncome)}
                          </div>
                          <div className="text-[10px] text-ash/50">{item.accountCount} acc</div>
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
