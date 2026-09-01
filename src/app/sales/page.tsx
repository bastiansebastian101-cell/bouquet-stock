'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';
import { SalesHistoryList } from '@/components/SalesHistoryList';

interface Bouquet {
  id: string;
  name: string;
  costCzk: number;
  soldChannel: string | null;
  salePriceCzk: number | null;
  soldAt: string | null;
  createdAt: string;
}

interface ChannelSetting {
  id: string;
  name: string;
  commissionPercent: number;
  enabled: boolean;
  vatEnabled: boolean;
}

type Mode = 'existing' | 'new';

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Website',
  bolt: 'Bolt',
  wolt: 'Wolt',
  foodora: 'Foodora',
};

// Same formula as src/lib/profit.ts (server) — kept here for a live preview
// before the record is saved; the server always recomputes it for real.
// DPH applies only to the commission (the channel's service fee), not the
// product price.
function computeResult(
  salePriceCzk: number,
  commissionPercent: number,
  costCzk: number,
  vatEnabled: boolean,
  adSpendCzk: number
) {
  const commissionAmount = Math.round((salePriceCzk * commissionPercent) / 100);
  const payoutCzk = salePriceCzk - commissionAmount;
  const vatCzk = vatEnabled ? Math.round((commissionAmount * 21) / 121) : 0;
  const profitCzk = payoutCzk - vatCzk - costCzk - adSpendCzk;
  return { payoutCzk, profitCzk, vatCzk, commissionAmount };
}

export default function SalesPage() {
  const [mode, setMode] = useState<Mode>('existing');
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [soldBouquets, setSoldBouquets] = useState<Bouquet[]>([]);
  const [channels, setChannels] = useState<ChannelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [bouquetId, setBouquetId] = useState('');
  const [productName, setProductName] = useState('');
  const [productCost, setProductCost] = useState('');
  const [channelName, setChannelName] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [adSpend, setAdSpend] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = async () => {
    const [bouquetsRes, channelsRes] = await Promise.all([
      apiFetch('/api/bouquets'),
      apiFetch('/api/channel-settings'),
    ]);
    const bouquetsData = await bouquetsRes.json();
    const channelsData = await channelsRes.json();
    const all: Bouquet[] = bouquetsData.bouquets ?? [];
    setBouquets(all.filter((b) => !b.soldChannel));
    setSoldBouquets(all.filter((b) => b.soldChannel));
    setChannels(channelsData.channels ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedBouquet = bouquets.find((b) => b.id === bouquetId) ?? null;
  const selectedChannel = channels.find((c) => c.name === channelName) ?? null;

  const productCostCzk = productCost.trim() ? Math.round(parseFloat(productCost.replace(',', '.')) * 100) : NaN;
  const hasProductCost = mode === 'new' && Number.isFinite(productCostCzk) && productCostCzk >= 0;

  const costCzk = mode === 'existing' ? selectedBouquet?.costCzk ?? null : hasProductCost ? productCostCzk : null;
  const itemName = mode === 'existing' ? selectedBouquet?.name ?? null : productName.trim() || null;

  const salePriceCzk = salePrice.trim() ? Math.round(parseFloat(salePrice.replace(',', '.')) * 100) : NaN;
  const hasSalePrice = Number.isFinite(salePriceCzk) && salePriceCzk > 0;
  const adSpendInputCzk = adSpend.trim() ? Math.round(parseFloat(adSpend.replace(',', '.')) * 100) : 0;
  const adSpendCzk = Number.isFinite(adSpendInputCzk) && adSpendInputCzk > 0 ? adSpendInputCzk : 0;

  const result =
    costCzk !== null && selectedChannel && hasSalePrice
      ? computeResult(salePriceCzk, selectedChannel.commissionPercent, costCzk, selectedChannel.vatEnabled, adSpendCzk)
      : null;

  const resetForm = () => {
    setBouquetId('');
    setProductName('');
    setProductCost('');
    setChannelName('');
    setSalePrice('');
    setAdSpend('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    if (mode === 'existing' && !selectedBouquet) {
      setError('Pick which bouquet this sale is for.');
      return;
    }
    if (mode === 'new') {
      if (!productName.trim()) {
        setError('Give the new product a name.');
        return;
      }
      if (!hasProductCost) {
        setError('Enter what this product cost you to make/buy.');
        return;
      }
    }
    if (!selectedChannel) {
      setError('Pick where this sale came from.');
      return;
    }
    if (!hasSalePrice) {
      setError('Enter a valid sale price.');
      return;
    }

    setSaving(true);
    const res =
      mode === 'existing'
        ? await apiFetch(`/api/bouquets/${selectedBouquet!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soldChannel: selectedChannel.name, salePriceCzk, adSpendCzk }),
          })
        : await apiFetch('/api/bouquets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: productName.trim(),
              costCzk: productCostCzk,
              soldChannel: selectedChannel.name,
              salePriceCzk,
              adSpendCzk,
            }),
          });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === 'already_sold'
          ? 'That bouquet already has a sale recorded.'
          : 'Could not save this sales record — try again.'
      );
      return;
    }

    const data = await res.json();
    setSavedMessage(
      `Saved — sold "${itemName}" via ${CHANNEL_LABELS[selectedChannel.name] ?? selectedChannel.name} — profit ${(data.bouquet.profitCzk / 100).toFixed(2)} Kč`
    );
    resetForm();
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Add Sales Record</h1>
        <Link href="/dashboard" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          ← Home
        </Link>
      </div>

      <p className="text-sm text-emerald-700/70 mb-4">
        Record a sale — pick something you already made, or add a new product on the spot — say where it sold,
        and the payout, DPH, and profit are calculated automatically.
      </p>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('existing');
            setError(null);
          }}
          className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
            mode === 'existing' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-300'
          }`}
        >
          Existing bouquet
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('new');
            setError(null);
          }}
          className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
            mode === 'new' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-300'
          }`}
        >
          + New product
        </button>
      </div>

      {loading ? (
        <p className="text-emerald-700/60 text-sm">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="bg-emerald-50 rounded-xl p-4 space-y-3">
          {mode === 'existing' ? (
            bouquets.length === 0 ? (
              <p className="text-sm text-emerald-700/60">
                No unsold bouquets to record a sale for —{' '}
                <Link href="/builder" className="underline">
                  make one
                </Link>{' '}
                or use &quot;+ New product&quot; above.
              </p>
            ) : (
              <div>
                <label className="block text-xs text-emerald-700 mb-1">Bouquet</label>
                <select
                  value={bouquetId}
                  onChange={(e) => setBouquetId(e.target.value)}
                  className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
                >
                  <option value="">Select a bouquet…</option>
                  {bouquets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — cost {(b.costCzk / 100).toFixed(2)} Kč
                    </option>
                  ))}
                </select>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-emerald-700 mb-1">Product name</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Wedding centerpiece"
                  className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-emerald-700 mb-1">What it cost you (Kč)</label>
                <input
                  value={productCost}
                  onChange={(e) => setProductCost(e.target.value)}
                  placeholder="0"
                  className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-emerald-700 mb-1">Source of revenue</label>
            <select
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">Select a channel…</option>
              {channels
                .filter((c) => c.enabled)
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {CHANNEL_LABELS[c.name] ?? c.name} ({c.commissionPercent}% commission)
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-emerald-700 mb-1">Sale price (Kč)</label>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0"
                className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-700 mb-1">Ads spent (Kč)</label>
              <input
                value={adSpend}
                onChange={(e) => setAdSpend(e.target.value)}
                placeholder="0"
                className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {result && costCzk !== null && (
            <div className="bg-white rounded-lg p-3 space-y-0.5 text-sm">
              <div className="flex justify-between text-emerald-700/70">
                <span>Commission ({selectedChannel!.commissionPercent}%)</span>
                <span>−{(result.commissionAmount / 100).toFixed(2)} Kč</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium pt-0.5 border-t border-emerald-100">
                <span>Payout</span>
                <span>{(result.payoutCzk / 100).toFixed(2)} Kč</span>
              </div>
              <div className="flex justify-between text-emerald-700/70">
                <span>DPH (21%){!selectedChannel!.vatEnabled && ' — off'}</span>
                <span>−{(result.vatCzk / 100).toFixed(2)} Kč</span>
              </div>
              <div className="flex justify-between text-emerald-700/70">
                <span>{mode === 'existing' ? 'Bouquet cost' : 'Product cost'}</span>
                <span>−{(costCzk / 100).toFixed(2)} Kč</span>
              </div>
              {adSpendCzk > 0 && (
                <div className="flex justify-between text-emerald-700/70">
                  <span>Ads spent</span>
                  <span>−{(adSpendCzk / 100).toFixed(2)} Kč</span>
                </div>
              )}
              <div
                className={`flex justify-between font-semibold pt-0.5 border-t border-emerald-100 ${
                  result.profitCzk >= 0 ? 'text-emerald-900' : 'text-red-600'
                }`}
              >
                <span>Profit</span>
                <span>{(result.profitCzk / 100).toFixed(2)} Kč</span>
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {savedMessage && <p className="text-emerald-700 text-sm">{savedMessage}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save sales record'}
          </button>
        </form>
      )}

      <h2 className="text-sm font-medium text-emerald-700/70 mt-8 mb-3 uppercase tracking-wide">
        Sales history
      </h2>
      {loading ? <p className="text-emerald-700/60 text-sm">Loading…</p> : <SalesHistoryList bouquets={soldBouquets} />}
    </div>
  );
}
