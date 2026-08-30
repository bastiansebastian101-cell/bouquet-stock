'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';

interface Flower {
  id: string;
  name: string;
  priceCzk: number;
  stockQuantity: number;
  imageUrl: string | null;
}

interface WasteEntry {
  id: string;
  quantity: number;
  costCzk: number;
  createdAt: string;
  flower: { name: string; imageUrl: string | null };
}

export default function WastePage() {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [selectedFlowerId, setSelectedFlowerId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [flowersRes, wasteRes] = await Promise.all([apiFetch('/api/flowers'), apiFetch('/api/waste')]);
    const flowersData = await flowersRes.json();
    const wasteData = await wasteRes.json();
    setFlowers(flowersData.flowers ?? []);
    setEntries(wasteData.entries ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = parseInt(quantity, 10);

    if (!selectedFlowerId) {
      setError('Pick a flower.');
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a valid quantity.');
      return;
    }

    setSaving(true);
    const res = await apiFetch('/api/waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowerId: selectedFlowerId, quantity: qty }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === 'insufficient_stock'
          ? "You don't have that many in stock to waste."
          : 'Could not record waste.'
      );
      return;
    }

    setSelectedFlowerId('');
    setQuantity('');
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Waste Flowers</h1>
        <Link href="/dashboard" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          ← Home
        </Link>
      </div>

      <p className="text-sm text-emerald-700/70 mb-6">
        Record flowers that went bad or got thrown away — this removes them from stock and counts as a loss on
        the dashboard.
      </p>

      <form onSubmit={handleSubmit} className="bg-emerald-50 rounded-xl p-4 mb-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Flower</label>
          <select
            value={selectedFlowerId}
            onChange={(e) => setSelectedFlowerId(e.target.value)}
            className="border border-emerald-300 rounded px-3 py-1.5 text-sm w-48"
          >
            <option value="">Select a flower…</option>
            {flowers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.stockQuantity} in stock)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Quantity wasted</label>
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="border border-emerald-300 rounded px-3 py-1.5 text-sm w-24"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          {saving ? 'Recording…' : 'Record waste'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <h2 className="text-sm font-medium text-emerald-700/70 mb-3 uppercase tracking-wide">Recent waste</h2>
      {entries.length === 0 ? (
        <p className="text-emerald-700/60 text-sm">No waste recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between bg-white border border-emerald-100 rounded-lg px-3 py-2 text-sm">
              <span className="text-emerald-900">
                {entry.flower.name} × {entry.quantity}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-red-600 font-medium">−{(entry.costCzk / 100).toFixed(2)} Kč</span>
                <span className="text-xs text-emerald-700/50">
                  {new Date(entry.createdAt).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
