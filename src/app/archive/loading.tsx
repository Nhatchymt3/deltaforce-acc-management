export default function ArchiveLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-midnight text-gray-200">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-midnight" />
        <div className="stars-bg absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brass/30 to-transparent" />
      </div>

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-gunmetal skeleton" />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="h-20 rounded-xl border border-white/[0.06] bg-gunmetal p-4 skeleton" />
          <div className="h-20 rounded-xl border border-white/[0.06] bg-gunmetal p-4 skeleton" />
        </div>

        <div className="h-64 rounded-xl border border-white/[0.06] bg-gunmetal p-4 skeleton" />
      </main>
    </div>
  );
}
