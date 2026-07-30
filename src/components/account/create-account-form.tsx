'use client';

import { useState, useEffect, useRef } from 'react';
import { createAccountWithMilestones } from '@/app/actions/accounts';
import type { Source, Farmer } from '@/lib/types';
import { Dropdown } from '@/components/ui/dropdown';

interface ParsedAccount {
  username: string;
  password: string;
  isValid: boolean;
  raw: string;
}

interface MilestoneInput {
  level: string;
  price: string;
  note: string;
}

interface CreateAccountFormProps {
  sources: Source[];
  farmers: Farmer[];
  onSuccess: () => void;
  onCancel: () => void;
}

function parseAccountsInput(input: string): ParsedAccount[] {
  const lines = input.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const trimmed = line.trim();
    const parts = trimmed.split('|');
    const username = parts[0]?.trim() || '';
    const password = parts[1]?.trim() || '';
    return {
      username,
      password,
      isValid: username.length > 0,
      raw: line,
    };
  });
}

export function CreateAccountForm({ sources, farmers, onSuccess, onCancel }: CreateAccountFormProps) {
  const [accountsInput, setAccountsInput] = useState('');
  const [source, setSource] = useState(sources[0]?.id ?? '');
  const [initialHolder, setInitialHolder] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { level: '', price: '', note: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parsedAccounts = parseAccountsInput(accountsInput);
  const validAccounts = parsedAccounts.filter(a => a.isValid);
  const invalidLines = parsedAccounts.filter(a => !a.isValid);

  useEffect(() => {
    if (!showSuccessToast) return;
    const timer = setTimeout(() => setShowSuccessToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccessToast]);

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
    return `LV${level || '?'}-${price ? price + 'M' : '?'}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (validAccounts.length === 0) {
      setError('Cần ít nhất một tài khoản hợp lệ (username)');
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
    let createdCount = 0;
    try {
      for (const account of validAccounts) {
        await createAccountWithMilestones({
          source,
          username: account.username,
          password: account.password || undefined,
          milestones: parsedMilestones,
          initialHolder: initialHolder.trim() || undefined,
        });
        createdCount++;
      }
      setSuccessCount(createdCount);
      setShowSuccessToast(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setAccountsInput(e.target.value);
    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }

  return (
    <>
      {/* Success Toast */}
      <div
        className={`fixed top-6 right-6 z-[100] transform transition-all duration-300 ${
          showSuccessToast
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-gradient-to-r from-green-950/90 to-emerald-950/90 backdrop-blur-xl px-5 py-4 shadow-xl shadow-green-500/10">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-300">Thành công!</p>
            <p className="text-xs text-green-400/70">Đã tạo {successCount} tài khoản</p>
          </div>
        </div>
      </div>

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
                <div className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-sm text-red-300 flex items-center gap-2 animate-[shake_0.3s_ease-out]">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Accounts Input - Smart Textarea */}
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Username & Password
                  </span>
                  <div className="relative group">
                    <textarea
                      ref={textareaRef}
                      value={accountsInput}
                      onChange={handleInputChange}
                      placeholder={`acc1|pw1\nacc2|pw2\nacc3|pw3\n\nhoặc chỉ username:\nacc1\nacc2`}
                      rows={3}
                      className={`w-full rounded-xl border ${
                        invalidLines.length > 0
                          ? 'border-red-500/50 focus:border-red-400/50'
                          : 'border-white/10 focus:border-cyan-400/30'
                      } bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none font-mono text-sm`}
                      style={{ minHeight: '80px' }}
                    />
                    {/* Line count indicator */}
                    {validAccounts.length > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/50 rounded-lg px-2 py-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Đã nhận <strong>{validAccounts.length}</strong> tài khoản</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Live Preview */}
                {validAccounts.length > 0 && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {validAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm animate-[slideIn_0.2s_ease-out]"
                          style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400">
                              {idx + 1}
                            </span>
                            <span className="text-slate-300 font-mono">{acc.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono">
                              {acc.password ? '●●●●●●●●' : <span className="text-slate-600 italic">không có</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalid lines warning */}
                {invalidLines.length > 0 && (
                  <div className="mt-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                    <span className="font-medium">{invalidLines.length} dòng lỗi:</span> Dòng trống hoặc không có username
                  </div>
                )}
              </div>

              {/* Source */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Nguồn</span>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                  <Dropdown
                    value={source}
                    onChange={setSource}
                    placeholder={sources.length === 0 ? 'Chưa có nguồn nào' : 'Chọn nguồn'}
                    options={sources.map((s) => ({ value: s.id, label: s.name }))}
                    ariaLabel="Nguồn"
                  />
                </div>
              </label>

              {/* Initial holder */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  AE nhận ban đầu <span className="text-slate-600 normal-case">(tùy chọn)</span>
                </span>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                  <Dropdown
                    value={initialHolder}
                    onChange={setInitialHolder}
                    placeholder="Bỏ trống = vào Kho chung"
                    options={[{ value: '', label: 'Vào Kho chung' }, ...farmers.map((f) => ({ value: f.name, label: f.name }))]}
                    ariaLabel="AE nhận"
                  />
                </div>
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

                        {/* Price numeric input */}
                        <div className="relative flex-1">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <input
                            type="number"
                            step="any"
                            placeholder="Tiền (VD: 1, 1.5)"
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
                  disabled={loading}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || sources.length === 0 || validAccounts.length === 0}
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
                      {validAccounts.length > 1 ? `Tạo ${validAccounts.length} tài khoản` : 'Tạo tài khoản'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </>
  );
}
