export default function FinanceLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br bg-background" />

      <main className="relative mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="h-3 w-20 rounded bg-muted skeleton mb-2" />
          <div className="h-8 w-36 rounded-xl bg-muted skeleton" />
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-border bg-card p-5 skeleton" />
          ))}
        </div>

        <div className="h-72 rounded-2xl border border-border bg-card p-6 skeleton" />
      </main>
    </div>
  );
}
