'use client';

import { useState } from 'react';
import { createAccountWithMilestones } from '@/app/actions/accounts';

const SOURCES = ['Bên A', 'Bên B', 'Bên C'] as const;

interface MilestoneInput {
  level: string;
  price: string;
  note: string;
}

interface CreateAccountFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateAccountForm({ onSuccess, onCancel }: CreateAccountFormProps) {
  const [source, setSource] = useState<typeof SOURCES[number]>('Bên A');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Tên tài khoản không được để trống');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Thêm acc mới</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg bg-red-900/50 border border-red-800 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Source */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Nguồn</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as typeof SOURCES[number])}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          {/* Username */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Tên tài khoản</span>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: acc_tuan_01"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500"
            />
          </label>

          {/* Initial holder */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-300">
              AE nhận ban đầu <span className="text-slate-500">(tùy chọn)</span>
            </span>
            <input
              type="text"
              value={initialHolder}
              onChange={(e) => setInitialHolder(e.target.value)}
              placeholder="Bỏ trống = vào Kho chung"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500"
            />
          </label>

          {/* Milestones */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Mốc Level</span>
              <button
                type="button"
                onClick={addMilestone}
                className="text-sm text-cyan-400 hover:underline"
              >
                + Thêm mốc
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Level"
                    value={m.level}
                    onChange={(e) => updateMilestone(i, 'level', e.target.value)}
                    className="w-24 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Giá (VND)"
                    value={m.price}
                    onChange={(e) => updateMilestone(i, 'price', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white placeholder-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Ghi chú (tùy)"
                    value={m.note}
                    onChange={(e) => updateMilestone(i, 'note', e.target.value)}
                    className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white placeholder-slate-500"
                  />
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      ✕
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
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              {loading ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
