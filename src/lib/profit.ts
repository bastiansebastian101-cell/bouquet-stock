// Commission is taken on the full sale price. DPH (21% Czech VAT) applies
// only to the commission itself — the channel's service fee — not to the
// product price, matching how the commission is normally quoted (as a price
// already including its own 21% DPH). Shared between every place that
// records a sale, so the math can't drift.
export function computeSaleResult(
  salePriceCzk: number,
  commissionPercent: number,
  vatEnabled: boolean,
  costCzk: number,
  adSpendCzk: number
): { payoutCzk: number; profitCzk: number } {
  const commissionAmount = Math.round((salePriceCzk * commissionPercent) / 100);
  const payoutCzk = salePriceCzk - commissionAmount;
  const vatCzk = vatEnabled ? Math.round((commissionAmount * 21) / 121) : 0;
  const profitCzk = payoutCzk - vatCzk - costCzk - adSpendCzk;
  return { payoutCzk, profitCzk };
}
