export default function ArchiveLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="h-3 w-20 rounded bg-white/10 skeleton mb-2" />
            <div className="h-8 w-40 rounded-xl bg-white/10 skeleton" />
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="h-24 rounded-2xl border border-white/10 bg-white/5 p-5 skeleton" />
          <div className="h-24 rounded-2xl border border-white/10 bg-white/5 p-5 skeleton" />
        </div>

        <div className="h-64 rounded-2xl border border-white/10 bg-white/5 p-6 skeleton" />
      </main>
    </div>
  );
}
