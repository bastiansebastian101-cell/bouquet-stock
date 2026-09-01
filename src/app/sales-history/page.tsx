'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';

interface SoldBouquet {
  id: string;
  name: string;
  costCzk: number;
  salePriceCzk: number | null;
  payoutCzk: number | null;
  profitCzk: number | null;
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

export default function SalesHistoryPage() {
  const [bouquets, setBouquets] = useState<SoldBouquet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bouquets')
      .then((res) => res.json())
      .then((data) => {
        const sold: SoldBouquet[] = (data.bouquets ?? []).filter((b: SoldBouquet) => b.soldChannel);
        sold.sort(
          (a, b) => new Date(b.soldAt ?? b.createdAt).getTime() - new Date(a.soldAt ?? a.createdAt).getTime()
        );
        setBouquets(sold);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Sales History</h1>
        <Link href="/dashboard" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          ← Home
        </Link>
      </div>

      {loading ? (
        <p className="text-emerald-700/60 text-sm">Loading…</p>
      ) : bouquets.length === 0 ? (
        <p className="text-emerald-700/60 text-sm">
          No sales recorded yet —{' '}
          <Link href="/sales" className="underline">
            add one
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {bouquets.map((b) => {
            const commissionCzk =
              b.salePriceCzk !== null && b.payoutCzk !== null ? b.salePriceCzk - b.payoutCzk : null;
            return (
              <div key={b.id} className="bg-white border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-emerald-900">{b.name}</p>
                    <p className="text-xs text-emerald-700/50">
                      {new Date(b.soldAt ?? b.createdAt).toLocaleDateString('cs-CZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1">
                    Sold via {CHANNEL_LABELS[b.soldChannel!] ?? b.soldChannel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-3">
                  <div>
                    <p className="text-xs text-emerald-700/60 uppercase tracking-wide">Sale price</p>
                    <p className="font-medium text-emerald-900">
                      {b.salePriceCzk !== null ? (b.salePriceCzk / 100).toFixed(2) : '—'} Kč
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/60 uppercase tracking-wide">Cost</p>
                    <p className="font-medium text-emerald-900">{(b.costCzk / 100).toFixed(2)} Kč</p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/60 uppercase tracking-wide">Commission</p>
                    <p className="font-medium text-emerald-900">
                      {commissionCzk !== null ? (commissionCzk / 100).toFixed(2) : '—'} Kč
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700/60 uppercase tracking-wide">Profit</p>
                    <p
                      className={`font-semibold ${
                        b.profitCzk !== null && b.profitCzk < 0 ? 'text-red-600' : 'text-emerald-900'
                      }`}
                    >
                      {b.profitCzk !== null ? (b.profitCzk / 100).toFixed(2) : '—'} Kč
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
