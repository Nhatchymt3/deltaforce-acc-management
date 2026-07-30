export default function FinanceLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="h-3 w-20 rounded bg-white/10 skeleton mb-2" />
          <div className="h-8 w-36 rounded-xl bg-white/10 skeleton" />
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-white/10 bg-white/5 p-5 skeleton" />
          ))}
        </div>

        <div className="h-72 rounded-2xl border border-white/10 bg-white/5 p-6 skeleton" />
      </main>
    </div>
  );
}
