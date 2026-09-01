'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';
import { SalesHistoryList, type SoldBouquet } from '@/components/SalesHistoryList';

interface Stats {
  totalInventoryCzk: number;
  totalStockQuantity: number;
  totalLossCzk: number;
  totalRevenueCzk: number;
  totalPayoutCzk: number;
  totalProfitCzk: number;
}

const PERIODS: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'From Start' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState<Stats | null>(null);
  const [soldBouquets, setSoldBouquets] = useState<SoldBouquet[]>([]);

  useEffect(() => {
    apiFetch(`/api/stats?period=${period}`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, [period]);

  useEffect(() => {
    apiFetch('/api/bouquets')
      .then((res) => res.json())
      .then((data) => setSoldBouquets((data.bouquets ?? []).filter((b: SoldBouquet) => b.soldChannel)))
      .catch(() => setSoldBouquets([]));
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50/40 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💐</div>
          <h1 className="text-2xl font-semibold text-emerald-900">Bouquet Cost Calculator</h1>
        </div>

        {/* Period selector + stats */}
        <div className="flex justify-center gap-2 mb-4 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                period === p.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">
              Current Inventory Value
            </p>
            <p className="text-xl font-semibold text-emerald-900">
              {stats ? (stats.totalInventoryCzk / 100).toFixed(2) : '—'} Kč
            </p>
            <p className="text-[10px] text-emerald-700/40 mt-1">right now, not period-based</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">
              Available Flower Stems
            </p>
            <p className="text-xl font-semibold text-emerald-900">
              {stats ? stats.totalStockQuantity : '—'}
            </p>
            <p className="text-[10px] text-emerald-700/40 mt-1">right now, not period-based</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">Loss from Waste</p>
            <p className="text-xl font-semibold text-red-600">
              {stats ? (stats.totalLossCzk / 100).toFixed(2) : '—'} Kč
            </p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">Revenue</p>
            <p className="text-xl font-semibold text-emerald-900">
              {stats ? (stats.totalRevenueCzk / 100).toFixed(2) : '—'} Kč
            </p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">Net Payout</p>
            <p className="text-xl font-semibold text-emerald-900">
              {stats ? (stats.totalPayoutCzk / 100).toFixed(2) : '—'} Kč
            </p>
            <p className="text-[10px] text-emerald-700/40 mt-1">after commission, before DPH/cost/ads</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-xs text-emerald-700/60 uppercase tracking-wide mb-1">Total Profit</p>
            <p
              className={`text-xl font-semibold ${
                stats && stats.totalProfitCzk < 0 ? 'text-red-600' : 'text-emerald-900'
              }`}
            >
              {stats ? (stats.totalProfitCzk / 100).toFixed(2) : '—'} Kč
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/builder"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 rounded-xl transition-colors text-center"
          >
            🧺 Make Bouquet
          </Link>
          <Link
            href="/price-book"
            className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-100 font-medium py-4 rounded-xl transition-colors text-center"
          >
            🌷 Add Flower
          </Link>
          <Link
            href="/waste"
            className="border-2 border-red-400 text-red-600 hover:bg-red-50 font-medium py-4 rounded-xl transition-colors text-center"
          >
            🗑 Add Waste Flower Count
          </Link>
          <Link
            href="/history"
            className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-100 font-medium py-4 rounded-xl transition-colors text-center"
          >
            📖 View Old Bouquets
          </Link>
          <Link
            href="/sales"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 rounded-xl transition-colors text-center sm:col-span-2"
          >
            💰 Add Sales Record
          </Link>
        </div>

        {/* Sales history */}
        <div className="mt-10">
          <h2 className="text-sm font-medium text-emerald-700/70 mb-3 uppercase tracking-wide">
            Sales History
          </h2>
          <SalesHistoryList bouquets={soldBouquets} />
        </div>
      </div>
    </div>
  );
}
