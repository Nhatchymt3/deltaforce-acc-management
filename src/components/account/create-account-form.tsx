'use client';

import { useState } from 'react';
import { createAccountWithMilestones } from '@/app/actions/accounts';
import type { Source } from '@/lib/types';

interface MilestoneInput {
  level: string;
  price: string;
  note: string;
}

interface CreateAccountFormProps {
  sources: Source[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateAccountForm({ sources, onSuccess, onCancel }: CreateAccountFormProps) {
  const [source, setSource] = useState(sources[0]?.id ?? '');
  const [username, setUsername] = useState('');
  const [initialHolder, setInitialHolder] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { level: '', price: '', note: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMilestone() {
    setMilestones((prev) => [...prev, { level: '', price: '', note: '' }]);
  }

  function removeMilestone(i: number) {
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateMilestone(i: number, field: keyof MilestoneInput, value: string) {
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function getMilestonePreview(level: string, price: string): string {
    if (!level && !price) return '';
    return `lv${level || '?'}-${price || '?'}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Tên tài khoản không được để trống');
      return;
    }
    if (!source) {
      setError('Chọn nguồn tài khoản');
      return;
    }

    const parsedMilestones = milestones
      .filter((m) => m.level !== '' && m.price !== '')
      .map((m) => ({
        level: parseInt(m.level, 10),
        price: m.price,
        note: m.note || undefined,
      }));

    if (parsedMilestones.length === 0) {
      setError('Cần ít nhất một mốc level');
      return;
    }

    setLoading(true);
    try {
      await createAccountWithMilestones({
        source,
        username: trimmedUsername,
        milestones: parsedMilestones,
        initialHolder: initialHolder.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-lg animate-[scaleIn_0.2s_ease-out]">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-60" />

        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Thêm acc mới</h2>
                <p className="text-xs text-slate-500">Tạo tài khoản với các mốc</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-6">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Source */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Nguồn</span>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  required
                  className="relative w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-white appearance-none cursor-pointer hover:border-cyan-400/30 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all pr-10"
                >
                  {sources.length === 0 && <option value="">Chưa có nguồn nào</option>}
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </label>

            {/* Username */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Tên tài khoản</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: acc_tuan_01"
                className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </label>

            {/* Initial holder */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                AE nhận ban đầu <span className="text-slate-600 normal-case">(tùy chọn)</span>
              </span>
              <input
                type="text"
                value={initialHolder}
                onChange={(e) => setInitialHolder(e.target.value)}
                placeholder="Bỏ trống = vào Kho chung"
                className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </label>

            {/* Milestones */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Mốc Level</span>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm mốc
                </button>
              </div>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="group flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2 hover:border-cyan-400/20 transition-all">
                    <div className="flex flex-1 gap-2">
                      {/* Level input */}
                      <div className="relative flex-shrink-0">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <input
                          type="number"
                          min={1}
                          placeholder="Lv"
                          value={m.level}
                          onChange={(e) => updateMilestone(i, 'level', e.target.value)}
                          className="w-20 rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 py-1.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                        />
                      </div>

                      {/* Price text input */}
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Giá (VD: 20m, 500k)"
                          value={m.price}
                          onChange={(e) => updateMilestone(i, 'price', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 py-1.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                        />
                      </div>

                      {/* Note */}
                      <input
                        type="text"
                        placeholder="Ghi chú"
                        value={m.note}
                        onChange={(e) => updateMilestone(i, 'note', e.target.value)}
                        className="w-24 flex-shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-slate-600 focus:border-cyan-400/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                      />
                    </div>

                    {/* Preview badge */}
                    {m.level || m.price ? (
                      <span className="flex-shrink-0 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 px-2.5 py-1 text-xs font-medium text-cyan-300">
                        {getMilestonePreview(m.level, m.price)}
                      </span>
                    ) : null}

                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:border-white/20 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || sources.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-400 hover:shadow-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Đang tạo…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tạo tài khoản
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
