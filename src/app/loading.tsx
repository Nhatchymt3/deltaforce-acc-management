export default function Loading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-midnight text-gray-200">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-midnight" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 pt-5">
        <div className="flex items-baseline gap-3">
          <div className="h-7 w-14 rounded bg-gunmetal skeleton" />
          <div className="h-4 w-28 rounded bg-gunmetal skeleton" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-gunmetal skeleton" />
          <div className="h-8 w-20 rounded-lg bg-gunmetal skeleton" />
          <div className="h-8 w-20 rounded-lg bg-gunmetal skeleton" />
        </div>
      </header>

      <section className="mx-auto mt-6 flex gap-4 px-6 pb-8 overflow-hidden">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="w-[300px] flex-shrink-0 flex flex-col rounded-xl border border-white/[0.04] bg-midnight/40 min-h-[500px]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <div className="h-5 w-28 rounded bg-gunmetal skeleton" />
              <div className="h-4 w-6 rounded bg-gunmetal skeleton" />
            </div>

            <div className="flex flex-col gap-2 p-3">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-gunmetal/80"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-ash/30 skeleton" />
                  <div className="pl-4 pr-3 py-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 rounded bg-white/[0.06] skeleton" />
                      <div className="h-4 w-12 rounded bg-white/[0.06] skeleton" />
                    </div>
                    <div className="h-3 w-16 rounded bg-white/[0.04] skeleton" />
                    <div className="h-3 w-28 rounded bg-white/[0.04] skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-brass/20 bg-gunmetal px-4 py-2 text-xs text-brass/80 shadow-xl">
        <svg className="w-3.5 h-3.5 animate-spin text-brass" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Đang tải...
      </div>
    </div>
  );
}
