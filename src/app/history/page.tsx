'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';

interface BouquetFlower {
  id: string;
  quantity: number;
  flower: { id: string; name: string; imageUrl: string | null };
}

interface Bouquet {
  id: string;
  name: string;
  wrapCostCzk: number;
  costCzk: number;
  soldChannel: string | null;
  salePriceCzk: number | null;
  adSpendCzk: number | null;
  payoutCzk: number | null;
  profitCzk: number | null;
  createdAt: string;
  flowers: BouquetFlower[];
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Website',
  bolt: 'Bolt',
  wolt: 'Wolt',
  foodora: 'Foodora',
};

export default function HistoryPage() {
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bouquets')
      .then((res) => res.json())
      .then((data) => setBouquets(data.bouquets ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Bouquet History</h1>
        <Link href="/builder" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          + Make a new bouquet
        </Link>
      </div>

      {loading ? (
        <p className="text-emerald-700/60 text-sm">Loading…</p>
      ) : bouquets.length === 0 ? (
        <p className="text-emerald-700/60 text-sm">
          No bouquets made yet —{' '}
          <Link href="/builder" className="underline">
            build your first one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {bouquets.map((b) => (
            <div key={b.id} className="bg-white border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-emerald-900">{b.name}</p>
                  <p className="text-xs text-emerald-700/50">
                    {new Date(b.createdAt).toLocaleDateString('cs-CZ', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {b.soldChannel ? (
                  <span className="text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1">
                    Sold via {CHANNEL_LABELS[b.soldChannel] ?? b.soldChannel}
                  </span>
                ) : (
                  <span className="text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-1">
                    Recipe only
                  </span>
                )}
              </div>

              <p className="text-xs text-emerald-700/70 mb-2">
                {b.flowers.map((bf) => `${bf.flower.name} ×${bf.quantity}`).join(', ')}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-700">
                  Cost: <span className="font-medium">{(b.costCzk / 100).toFixed(2)} Kč</span>
                </span>
                {b.salePriceCzk !== null && (
                  <span className="text-emerald-700">
                    Sold: <span className="font-medium">{(b.salePriceCzk / 100).toFixed(2)} Kč</span>
                  </span>
                )}
                {b.adSpendCzk !== null && b.adSpendCzk > 0 && (
                  <span className="text-emerald-700">
                    Ads: <span className="font-medium">{(b.adSpendCzk / 100).toFixed(2)} Kč</span>
                  </span>
                )}
                {b.payoutCzk !== null && (
                  <span className="text-emerald-700">
                    Payout: <span className="font-medium">{(b.payoutCzk / 100).toFixed(2)} Kč</span>
                  </span>
                )}
                {b.profitCzk !== null && (
                  <span className={b.profitCzk >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                    Profit:{' '}
                    <span className="font-semibold">{(b.profitCzk / 100).toFixed(2)} Kč</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
