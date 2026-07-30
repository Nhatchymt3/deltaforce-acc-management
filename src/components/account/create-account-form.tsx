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
  const [addedBy, setAddedBy] = useState('');
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
          addedBy: addedBy.trim() || undefined,
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
        <div className="flex items-center gap-3 rounded-lg border border-brass/40 bg-gunmetal px-4 py-3 shadow-xl">
          <div className="w-6 h-6 rounded bg-brass/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-brass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-brass">Thành công!</p>
            <p className="text-[11px] text-ash">Đã tạo {successCount} tài khoản</p>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70" onClick={onCancel} />

        <div className="relative z-10 w-full max-w-lg">
          <div className="relative rounded-xl border border-white/[0.08] bg-gunmetal shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-brass/20 border border-brass/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-white tracking-wide">Thêm acc mới</h2>
                  <p className="text-xs text-ash">Tạo tài khoản với các mốc</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="rounded p-1 text-ash hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-signal-red/30 bg-signal-red/10 px-3.5 py-2.5 text-xs text-red-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-signal-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Accounts Input */}
              <div>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ash">
                    Username & Password
                  </span>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={accountsInput}
                      onChange={handleInputChange}
                      placeholder={`acc1|pw1\nacc2|pw2\nacc3|pw3`}
                      rows={3}
                      className={`w-full rounded-lg border ${
                        invalidLines.length > 0
                          ? 'border-signal-red/50 focus:border-signal-red/70'
                          : 'border-white/[0.06] focus:border-brass/40'
                      } bg-midnight px-3.5 py-2.5 text-white placeholder-ash/40 focus:outline-none focus:ring-1 focus:ring-brass/20 transition-all resize-none font-mono text-xs`}
                      style={{ minHeight: '80px' }}
                    />
                    {validAccounts.length > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[11px] text-brass bg-brass/10 border border-brass/20 rounded px-2 py-0.5 font-mono">
                        <span>Đã nhận <strong>{validAccounts.length}</strong> acc</span>
                      </div>
                    )}
                  </div>
                </label>

                {/* Preview */}
                {validAccounts.length > 0 && (
                  <div className="mt-2 rounded-lg border border-white/[0.04] bg-midnight/50 p-2.5 space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ash/60 flex items-center gap-1">
                      Preview ({validAccounts.length} acc)
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {validAccounts.map((acc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded bg-white/[0.02] px-2.5 py-1 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-brass/20 flex items-center justify-center text-[10px] text-brass font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-gray-300 font-mono">{acc.username}</span>
                          </div>
                          <span className="text-ash/40 font-mono text-[11px]">
                            {acc.password ? '●●●●●●●●' : <span className="italic">không có</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {invalidLines.length > 0 && (
                  <div className="mt-1.5 rounded border border-signal-red/20 bg-signal-red/10 px-2.5 py-1 text-[11px] text-red-300">
                    <span className="font-medium">{invalidLines.length} dòng lỗi:</span> Dòng trống hoặc không hợp lệ
                  </div>
                )}
              </div>

              {/* Source */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ash">Nguồn</span>
                <Dropdown
                  value={source}
                  onChange={setSource}
                  placeholder={sources.length === 0 ? 'Chưa có nguồn nào' : 'Chọn nguồn'}
                  options={sources.map((s) => ({ value: s.id, label: s.name }))}
                  ariaLabel="Nguồn"
                  size="sm"
                />
              </label>

              {/* Initial holder */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ash">
                  AE nhận ban đầu <span className="text-ash/40 normal-case">(tùy chọn)</span>
                </span>
                <Dropdown
                  value={initialHolder}
                  onChange={setInitialHolder}
                  placeholder="Bỏ trống = vào Kho chung"
                  options={[{ value: '', label: 'Vào Kho chung' }, ...farmers.map((f) => ({ value: f.name, label: f.name }))]}
                  ariaLabel="AE nhận"
                  size="sm"
                />
              </label>

              {/* Added by */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ash">
                  Người thêm <span className="text-ash/40 normal-case">(tùy chọn)</span>
                </span>
                <Dropdown
                  value={addedBy}
                  onChange={setAddedBy}
                  placeholder="Chọn AE người thêm..."
                  options={[{ value: '', label: 'Chưa chọn' }, ...farmers.map((f) => ({ value: f.name, label: f.name }))]}
                  ariaLabel="Người thêm"
                  size="sm"
                />
              </label>

              {/* Milestones */}
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ash">Mốc Level</span>
                <div className="space-y-1.5">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-midnight/40 p-2">
                      <div className="flex flex-1 gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Lv"
                          value={m.level}
                          onChange={(e) => updateMilestone(i, 'level', e.target.value)}
                          className="w-16 rounded border border-white/[0.06] bg-midnight px-2 py-1 text-xs text-white placeholder-ash/40 font-mono focus:border-brass/40 focus:outline-none"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Tiền (VD: 1, 1.5)"
                          value={m.price}
                          onChange={(e) => updateMilestone(i, 'price', e.target.value)}
                          className="flex-1 rounded border border-white/[0.06] bg-midnight px-2 py-1 text-xs text-white placeholder-ash/40 font-mono focus:border-brass/40 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Ghi chú"
                          value={m.note}
                          onChange={(e) => updateMilestone(i, 'note', e.target.value)}
                          className="w-20 flex-shrink-0 rounded border border-white/[0.06] bg-midnight px-2 py-1 text-xs text-white placeholder-ash/40 focus:border-brass/40 focus:outline-none"
                        />
                      </div>

                      {m.level || m.price ? (
                        <span className="flex-shrink-0 rounded bg-brass/15 border border-brass/20 px-2 py-0.5 text-xs font-mono font-medium text-brass">
                          {getMilestonePreview(m.level, m.price)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="rounded-lg border border-white/[0.06] bg-midnight px-4 py-2 text-xs text-ash hover:text-white transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || sources.length === 0 || validAccounts.length === 0}
                  className="rounded-lg bg-brass px-5 py-2 text-xs font-semibold text-midnight hover:bg-brass/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Đang tạo…' : validAccounts.length > 1 ? `Tạo ${validAccounts.length} tài khoản` : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
