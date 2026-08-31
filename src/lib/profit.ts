// Sale price is treated as already including 21% DPH (Czech VAT), matching
// how this is normally quoted to customers. Commission is taken on the full
// sale price, and VAT owed is the 21% portion baked into that same price.
// Shared between every place that records a sale, so the math can't drift.
export function computeSaleResult(
  salePriceCzk: number,
  commissionPercent: number,
  vatEnabled: boolean,
  costCzk: number,
  adSpendCzk: number
): { payoutCzk: number; profitCzk: number } {
  const commissionAmount = Math.round((salePriceCzk * commissionPercent) / 100);
  const payoutCzk = salePriceCzk - commissionAmount;
  const vatCzk = vatEnabled ? Math.round((salePriceCzk * 21) / 121) : 0;
  const profitCzk = payoutCzk - vatCzk - costCzk - adSpendCzk;
  return { payoutCzk, profitCzk };
}
