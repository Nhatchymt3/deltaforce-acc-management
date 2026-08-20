'use client';

import { useState, useEffect } from 'react';
import { createFarmer, updateFarmer, deleteFarmer } from '@/app/actions/farmers';
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
    <div className={`space-y-6 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="font-display text-base font-semibold text-foreground mb-4 tracking-wide">
          Danh sách AE cày thuê
        </h2>

        {/* Add new Farmer */}
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            placeholder="Tên AE mới..."
            className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={loading === 'create' || !newName.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Thêm
          </button>
        </div>

        {/* Farmers list */}
        {farmers.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-border bg-background/50">
            <p className="text-xs text-muted-foreground">Chưa có AE nào trong hệ thống</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {farmers.map((farmer) => (
              <div
                key={farmer.id}
                className="group flex items-center justify-between rounded-lg border border-border/30 bg-background/40 px-3.5 py-2.5 hover:border-white/[0.08] transition-colors"
              >
                {editingId === farmer.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveEdit(farmer.id);
                        if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                      }}
                      autoFocus
                      className="flex-1 rounded border border-primary/40 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => void handleSaveEdit(farmer.id)}
                      disabled={loading === `edit-${farmer.id}`}
                      className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditingName(''); }}
                      className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-primary/15 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-xs">
                          {farmer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{farmer.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(farmer.id); setEditingName(farmer.name); }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Sửa"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(farmer.id)}
                        className="rounded p-1 text-muted-foreground hover:text-signal-red transition-colors"
                        title="Xóa"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="absolute inset-0 bg-black/70" onClick={() => setDeletingId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/[0.08] bg-card p-5 shadow-2xl space-y-4">
            <h3 className="font-display font-semibold text-foreground text-base">Xóa AE?</h3>
            <p className="text-xs text-muted-foreground">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-border bg-background px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => void handleDelete(deletingId)}
                disabled={loading === `delete-${deletingId}`}
                className="rounded-lg bg-destructive px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {loading === `delete-${deletingId}` ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`relative overflow-hidden rounded-lg border px-3.5 py-2.5 pr-8 text-xs font-medium shadow-xl ${
              t.kind === 'error'
                ? 'border-signal-red/30 bg-card text-red-300'
                : 'border-primary/30 bg-card text-primary'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
