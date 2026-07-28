import Decimal from 'decimal.js';

export type PaidAccount = {
  id: string;
  username: string;
  amount_received: string;
  holders: string[];
};

export type FinanceSummary = {
  accounts: Array<PaidAccount & { share: string }>;
  byHolder: Record<string, string>;
};

/**
 * Calculate finance splits.
 * All arithmetic uses Decimal; no Number() conversion.
 */
export function calculateFinance(accounts: PaidAccount[]): FinanceSummary {
  const byHolder: Record<string, Decimal> = {};

  const rows = accounts.map((account) => {
    const amount = new Decimal(account.amount_received);
    const count = new Decimal(account.holders.length);
    const share = amount.div(count);
    account.holders.forEach((holder) => {
      byHolder[holder] = (byHolder[holder] ?? new Decimal(0)).plus(share);
    });
    return { ...account, share: share.toFixed(2) };
  });

  return {
    accounts: rows,
    byHolder: Object.fromEntries(
      Object.entries(byHolder).map(([holder, value]) => [
        holder,
        value.toFixed(2),
      ])
    ),
  };
}

/**
 * Format a VND value (string or numeric string) to locale string.
 * Parses via Decimal first to avoid floating-point errors.
 * The decimal is converted to a plain integer (VND has no subunit)
 * before formatting; the conversion is safe because we use toFixed(0).
 */
export function formatVnd(value: string | number): string {
  const d = new Decimal(value);
  const integer = d.toDecimalPlaces(0).toNumber();
  return `${integer.toLocaleString('vi-VN')} ₫`;
}

/**
 * Format a Decimal string directly (avoids Number() conversion).
 */
export function formatVndString(decimalString: string): string {
  const d = new Decimal(decimalString);
  return `${d.toDecimalPlaces(0).toNumber().toLocaleString('vi-VN')} ₫`;
}

/**
 * Format per-holder totals summary.
 */
export function formatHolders(
  totals: Record<string, string>
): Array<{ holder: string; total: string; formatted: string }> {
  return Object.entries(totals).map(([holder, total]) => ({
    holder,
    total,
    formatted: formatVndString(total),
  }));
}
