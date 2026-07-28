import { formatVnd } from '@/lib/finance';
export function FinanceSummary({ totals }: { totals: Record<string, string> }) { return <div className="grid gap-4 md:grid-cols-3">{Object.entries(totals).map(([holder, amount]) => <div key={holder}><span>{holder}</span><strong>{formatVnd(amount)}</strong></div>)}</div>; }
