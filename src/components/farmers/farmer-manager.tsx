'use client';

import { useState, useEffect } from 'react';
import { getFarmers, createFarmer, updateFarmer, deleteFarmer } from '@/app/actions/farmers';
import type { Farmer } from '@/lib/types';

interface ToastEntry {
  id: string;
  message: string;
  kind: 'error' | 'success';
  progress?: number;
}

let toastCounter = 0;

export function FarmerManager({ initialFarmers }: { initialFarmers: Farmer[] }) {
  const [farmers, setFarmers] = useState<Farmer[]>(initialFarmers);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function addToast(message: string, kind: ToastEntry['kind'] = 'error') {
    const id = String(++toastCounter);
    setToasts((prev) => [...prev, { id, message, kind, progress: 100 }]);
    const interval = setInterval(() => {
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, progress: (t.progress ?? 0) - 2.5 } : t
        )
      );
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setLoading('create');
    try {
      const created = await createFarmer(trimmed);
      setFarmers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      addToast(`Đã thêm AE "${created.name}"`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Lỗi khi thêm AE', 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setLoading(`edit-${id}`);
    try {
      const updated = await updateFarmer(id, trimmed);
      setFarmers((prev) =>
        prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditingName('');
      addToast('Đã cập nhật AE', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Lỗi khi cập nhật', 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setLoading(`delete-${id}`);
    try {
      await deleteFarmer(id);
      setFarmers((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
      addToast('Đã xóa AE', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Không thể xóa AE này', 'error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`space-y-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Glassmorphism Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Quản lý danh sách AE
        </h2>

        {/* Add new Farmer */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            placeholder="Tên AE mới..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={loading === 'create' || !newName.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm
          </button>
        </div>

        {/* Farmers list */}
        {farmers.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
            <svg className="w-10 h-10 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">Chưa có AE nào trong hệ thống</p>
            <p className="text-xs text-slate-500 mt-1">Nhập tên và nhấn "Thêm" để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {farmers.map((farmer, i) => (
              <div
                key={farmer.id}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 hover:border-cyan-400/20 hover:bg-white/[0.06] transition-all duration-200"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {editingId === farmer.id ? (
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveEdit(farmer.id);
                        if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border border-cyan-400/40 bg-white/5 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    />
                    <button
                      onClick={() => void handleSaveEdit(farmer.id)}
                      disabled={loading === `edit-${farmer.id}`}
                      className="rounded-lg bg-green-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditingName(''); }}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                        <span className="text-cyan-400 font-semibold text-sm">
                          {farmer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-white">{farmer.name}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(farmer.id); setEditingName(farmer.name); }}
                        className="rounded-lg p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                        title="Sửa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(farmer.id)}
                        className="rounded-lg p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Xóa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Xóa AE?</h3>
                <p className="text-sm text-slate-400">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleDelete(deletingId)}
                disabled={loading === `delete-${deletingId}`}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {loading === `delete-${deletingId}` ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 pr-10 shadow-2xl backdrop-blur-xl min-w-[280px] ${
              t.kind === 'error'
                ? 'border-red-500/30 bg-red-950/60 text-red-200'
                : 'border-green-500/30 bg-green-950/60 text-green-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {t.kind === 'error' ? (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20">
              <div
                className={`h-full transition-all duration-100 ${
                  t.kind === 'error' ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${t.progress ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


