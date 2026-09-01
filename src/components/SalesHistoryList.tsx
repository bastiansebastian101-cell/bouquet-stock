export interface SoldBouquet {
  id: string;
  name: string;
  costCzk: number;
  salePriceCzk: number | null;
  soldChannel: string | null;
  soldAt: string | null;
  createdAt: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Website',
  bolt: 'Bolt',
  wolt: 'Wolt',
  foodora: 'Foodora',
};

// Shared between the dashboard and /sales so both show the same "cost, sale
// price, date" list rather than two copies drifting apart.
export function SalesHistoryList({ bouquets }: { bouquets: SoldBouquet[] }) {
  if (bouquets.length === 0) {
    return <p className="text-emerald-700/60 text-sm">No sales recorded yet.</p>;
  }

  const sorted = [...bouquets].sort(
    (a, b) => new Date(b.soldAt ?? b.createdAt).getTime() - new Date(a.soldAt ?? a.createdAt).getTime()
  );

  return (
    <div className="space-y-1">
      {sorted.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between bg-white border border-emerald-100 rounded-lg px-3 py-2 text-sm"
        >
          <div>
            <span className="text-emerald-900 font-medium">{b.name}</span>{' '}
            <span className="text-xs text-emerald-700/50">
              via {CHANNEL_LABELS[b.soldChannel!] ?? b.soldChannel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-700">Cost {(b.costCzk / 100).toFixed(2)} Kč</span>
            <span className="text-emerald-700 font-medium">
              Sold {b.salePriceCzk !== null ? (b.salePriceCzk / 100).toFixed(2) : '—'} Kč
            </span>
            <span className="text-xs text-emerald-700/50">
              {new Date(b.soldAt ?? b.createdAt).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
