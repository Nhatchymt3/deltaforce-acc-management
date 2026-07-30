export default function Loading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-950" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="stars-bg absolute inset-0" />
      </div>

      {/* Header skeleton */}
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 pt-6">
        <div>
          <div className="h-3 w-24 rounded bg-white/10 skeleton mb-2" />
          <div className="h-8 w-48 rounded-xl bg-white/10 skeleton" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 rounded-xl bg-white/10 skeleton" />
          <div className="h-10 w-24 rounded-xl bg-white/10 skeleton" />
          <div className="h-10 w-24 rounded-xl bg-white/10 skeleton" />
        </div>
      </header>

      {/* Kanban columns skeleton */}
      <section className="mx-auto mt-8 flex gap-4 px-6 pb-8 overflow-hidden">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="w-[300px] flex-shrink-0 flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 min-h-[500px]"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-2">
              <div className="h-6 w-32 rounded-lg bg-white/10 skeleton" />
              <div className="h-5 w-8 rounded-full bg-white/10 skeleton" />
            </div>

            {/* Skeleton Cards */}
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-28 rounded bg-white/10 skeleton" />
                  <div className="h-5 w-14 rounded-full bg-white/10 skeleton" />
                </div>
                <div className="h-3 w-20 rounded bg-white/5 skeleton" />
                <div className="h-4 w-36 rounded bg-white/10 skeleton" />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Loading Spinner Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-cyan-400/30 bg-slate-900/80 backdrop-blur-xl px-4 py-2 text-xs text-cyan-300 shadow-xl">
        <svg className="w-4 h-4 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Đang tải dữ liệu...
      </div>
    </div>
  );
}
