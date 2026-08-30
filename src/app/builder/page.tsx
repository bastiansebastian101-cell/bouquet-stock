'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiFetch';

interface Flower {
  id: string;
  name: string;
  priceCzk: number;
  stockQuantity: number;
  color: string | null;
  imageUrl: string | null;
}

interface FlyingFlower {
  id: number;
  emoji: string;
  imageUrl: string | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ChannelSetting {
  id: string;
  name: string; // "website" | "bolt" | "wolt" | "foodora"
  commissionPercent: number;
  enabled: boolean;
  vatEnabled: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Website',
  bolt: 'Bolt',
  wolt: 'Wolt',
  foodora: 'Foodora',
};

// Sale price is treated as already including 21% DPH (Czech VAT), matching
// how this is normally quoted to customers. Commission is taken on the full
// sale price, and VAT owed is the 21% portion baked into that same price.
function computeChannelResult(
  salePriceCzk: number,
  commissionPercent: number,
  bouquetCostCzk: number,
  vatEnabled: boolean
) {
  const commissionAmount = Math.round((salePriceCzk * commissionPercent) / 100);
  const payoutCzk = salePriceCzk - commissionAmount;
  const vatCzk = vatEnabled ? Math.round((salePriceCzk * 21) / 121) : 0;
  const profitCzk = payoutCzk - vatCzk - bouquetCostCzk;
  return { payoutCzk, profitCzk, vatCzk, commissionAmount };
}

const COLOR_EMOJI: Record<string, string> = {
  red: '🌹',
  white: '🤍',
  yellow: '🌻',
  purple: '💜',
  pink: '🌸',
  orange: '🧡',
};

function emojiFor(flower: Flower): string {
  if (flower.color && COLOR_EMOJI[flower.color.toLowerCase()]) return COLOR_EMOJI[flower.color.toLowerCase()];
  return '🌸';
}

// Shows the flower's real photo if one's been uploaded, otherwise a color-matched emoji.
function FlowerVisual({ flower, className }: { flower: Flower; className: string }) {
  if (flower.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={flower.imageUrl} alt={flower.name} className={`${className} object-cover rounded-full`} />
    );
  }
  return <span className={className}>{emojiFor(flower)}</span>;
}

// Deterministic scatter so each flower type settles at a stable spot inside
// the basket's opening instead of reshuffling on every render.
function scatterPosition(index: number) {
  const angle = (index * 137.5 * Math.PI) / 180; // golden angle → even fan-out
  const radius = 14 + (index % 3) * 8;
  const x = 50 + Math.cos(angle) * radius;
  const y = 42 + Math.sin(angle) * radius * 0.45;
  return { x, y };
}

function Basket() {
  return (
    <svg viewBox="0 0 200 140" className="absolute bottom-0 left-0 w-full h-[70%]" preserveAspectRatio="none">
      {/* handle */}
      <path
        d="M 55 35 Q 100 -15 145 35"
        fill="none"
        stroke="#a16207"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* basket body */}
      <path d="M 25 40 L 175 40 L 155 130 L 45 130 Z" fill="#d9a15b" stroke="#a16207" strokeWidth="3" />
      {/* woven texture lines */}
      {[55, 70, 85, 100, 115].map((y) => (
        <line key={y} x1={28 + (y - 40) * 0.13} y1={y} x2={172 - (y - 40) * 0.13} y2={y} stroke="#a16207" strokeWidth="1.5" opacity="0.5" />
      ))}
      {[50, 75, 100, 125, 150].map((x) => (
        <line key={x} x1={x} y1="40" x2={x - (x - 100) * 0.4} y2="130" stroke="#a16207" strokeWidth="1" opacity="0.35" />
      ))}
      {/* rim */}
      <ellipse cx="100" cy="40" rx="75" ry="8" fill="#c8914f" stroke="#a16207" strokeWidth="3" />
    </svg>
  );
}

export default function BuilderPage() {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({}); // flowerId -> quantity
  const [wrapCost, setWrapCost] = useState('');
  const [bouquetName, setBouquetName] = useState('');
  const [flying, setFlying] = useState<FlyingFlower[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<ChannelSetting[]>([]);
  const [salePrices, setSalePrices] = useState<Record<string, string>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [soldChannelChoice, setSoldChannelChoice] = useState('');
  const basketRef = useRef<HTMLDivElement>(null);
  const flyIdRef = useRef(0);

  const load = async () => {
    const res = await apiFetch('/api/flowers');
    const data = await res.json();
    setFlowers(data.flowers ?? []);
  };

  const loadChannels = async () => {
    const res = await apiFetch('/api/channel-settings');
    const data = await res.json();
    setChannels(data.channels ?? []);
  };

  useEffect(() => {
    load();
    loadChannels();
  }, []);

  const updateChannel = async (
    name: string,
    patch: { commissionPercent?: number; enabled?: boolean; vatEnabled?: boolean }
  ) => {
    await apiFetch(`/api/channel-settings/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    loadChannels();
  };

  const remainingStock = (flower: Flower) => flower.stockQuantity - (selected[flower.id] ?? 0);

  const grabFlower = (flower: Flower, rowEl: HTMLButtonElement) => {
    if (remainingStock(flower) <= 0) return;

    setSelected((prev) => ({ ...prev, [flower.id]: (prev[flower.id] ?? 0) + 1 }));

    const rowRect = rowEl.getBoundingClientRect();
    const targetRect = basketRef.current?.getBoundingClientRect();
    if (targetRect) {
      const id = flyIdRef.current++;
      setFlying((prev) => [
        ...prev,
        {
          id,
          emoji: emojiFor(flower),
          imageUrl: flower.imageUrl,
          startX: rowRect.left + 24,
          startY: rowRect.top + rowRect.height / 2,
          endX: targetRect.left + targetRect.width / 2,
          endY: targetRect.top + targetRect.height * 0.55,
        },
      ]);
      setTimeout(() => {
        setFlying((prev) => prev.filter((f) => f.id !== id));
      }, 650);
    }
  };

  const removeOne = (flowerId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      const current = (next[flowerId] ?? 0) - 1;
      if (current <= 0) delete next[flowerId];
      else next[flowerId] = current;
      return next;
    });
  };

  const selectedEntries = Object.entries(selected).filter(([, qty]) => qty > 0);
  const flowerTotalCzk = selectedEntries.reduce((sum, [flowerId, qty]) => {
    const flower = flowers.find((f) => f.id === flowerId);
    return sum + (flower ? flower.priceCzk * qty : 0);
  }, 0);
  const wrapCostCzk = wrapCost.trim() ? Math.round(parseFloat(wrapCost.replace(',', '.')) * 100) : 0;
  const totalCzk = flowerTotalCzk + (Number.isFinite(wrapCostCzk) ? wrapCostCzk : 0);

  const handleSave = async () => {
    setSaveError(null);
    setSavedMessage(null);
    if (!bouquetName.trim()) {
      setSaveError('Give this bouquet a name first.');
      return;
    }
    if (selectedEntries.length === 0) {
      setSaveError('Add at least one flower.');
      return;
    }

    let soldChannel: string | undefined;
    let recordedSalePriceCzk: number | undefined;
    if (soldChannelChoice) {
      const input = salePrices[soldChannelChoice] ?? '';
      const parsed = Math.round(parseFloat(input.replace(',', '.')) * 100);
      if (Number.isFinite(parsed) && parsed > 0) {
        soldChannel = soldChannelChoice;
        recordedSalePriceCzk = parsed;
      }
    }

    setSaving(true);
    const res = await apiFetch('/api/bouquets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: bouquetName.trim(),
        wrapCostCzk: Number.isFinite(wrapCostCzk) ? wrapCostCzk : 0,
        flowers: selectedEntries.map(([flowerId, quantity]) => ({ flowerId, quantity })),
        ...(soldChannel && { soldChannel, salePriceCzk: recordedSalePriceCzk }),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(
        data.error === 'insufficient_stock'
          ? 'Not enough stock for one of these flowers anymore — refresh and try again.'
          : 'Could not save this bouquet.'
      );
      return;
    }

    setSavedMessage(
      soldChannel
        ? `Saved "${bouquetName.trim()}" — recorded as sold via ${soldChannel}`
        : `Saved "${bouquetName.trim()}" — total cost ${(totalCzk / 100).toFixed(2)} Kč`
    );
    setSelected({});
    setBouquetName('');
    setWrapCost('');
    setSoldChannelChoice('');
    load(); // refresh stock numbers
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Bouquet Builder</h1>
        <Link href="/price-book" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          ← Edit Price Book
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-medium text-emerald-700/70 mb-3 uppercase tracking-wide">
            Available flowers — click to grab
          </h2>
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-emerald-100 bg-white divide-y divide-emerald-50">
            {flowers.map((flower) => {
              const stock = remainingStock(flower);
              const outOfStock = stock <= 0;
              const qtyInBouquet = selected[flower.id] ?? 0;
              return (
                <button
                  key={flower.id}
                  disabled={outOfStock}
                  onClick={(e) => grabFlower(flower, e.currentTarget)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    outOfStock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-emerald-50 active:bg-emerald-100'
                  }`}
                >
                  <FlowerVisual flower={flower} className="text-2xl flex-shrink-0 w-9 h-9" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-900 truncate">{flower.name}</p>
                    <p className="text-xs text-emerald-700/60">
                      {(flower.priceCzk / 100).toFixed(2)} Kč ·{' '}
                      <span className={outOfStock ? 'text-red-500' : ''}>
                        {outOfStock ? 'out of stock' : `${stock} left`}
                      </span>
                    </p>
                  </div>
                  {qtyInBouquet > 0 && (
                    <span className="flex-shrink-0 bg-emerald-600 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center">
                      {qtyInBouquet}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {flowers.length === 0 && (
            <p className="text-sm text-emerald-700/60 mt-3">
              No flowers in your price book yet —{' '}
              <Link href="/price-book" className="underline">
                add some first
              </Link>
              .
            </p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-emerald-700/70 mb-3 uppercase tracking-wide">Your bouquet</h2>
          <div ref={basketRef} className="relative h-[260px] mb-3">
            <Basket />
            {selectedEntries.length === 0 && (
              <p className="absolute inset-x-0 top-2 text-center text-sm text-emerald-700/50 italic">
                Click flowers on the left to fill the basket
              </p>
            )}
            {selectedEntries.map(([flowerId, qty], index) => {
              const flower = flowers.find((f) => f.id === flowerId);
              if (!flower) return null;
              const { x, y } = scatterPosition(index);
              return (
                <div
                  key={flowerId}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-[popIn_0.25s_ease-out]"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <FlowerVisual flower={flower} className="text-4xl drop-shadow-sm w-14 h-14" />
                  <span className="bg-white/90 text-emerald-900 text-[11px] font-semibold rounded-full px-1.5 leading-4 -mt-1 shadow-sm">
                    ×{qty}
                  </span>
                </div>
              );
            })}
          </div>

          {selectedEntries.length > 0 && (
            <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
              {selectedEntries.map(([flowerId, qty]) => {
                const flower = flowers.find((f) => f.id === flowerId);
                if (!flower) return null;
                return (
                  <div key={flowerId} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-1.5">
                    <span className="text-sm text-emerald-900 flex items-center gap-2">
                      <FlowerVisual flower={flower} className="text-base w-5 h-5" /> {flower.name} × {qty}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-700">
                        {((flower.priceCzk * qty) / 100).toFixed(2)} Kč
                      </span>
                      <button
                        onClick={() => removeOne(flowerId)}
                        className="text-emerald-700/40 hover:text-red-600 text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-emerald-700">Wrap / packaging cost (Kč)</label>
              <input
                value={wrapCost}
                onChange={(e) => setWrapCost(e.target.value)}
                placeholder="0"
                className="w-24 border border-emerald-300 rounded px-2 py-1 text-sm text-right"
              />
            </div>

            <div className="flex items-center justify-between text-lg font-semibold text-emerald-900 border-t border-emerald-200 pt-3">
              <span>Total cost</span>
              <span key={totalCzk} className="animate-[pulseOnce_0.3s_ease-out]">
                {(totalCzk / 100).toFixed(2)} Kč
              </span>
            </div>

            <div className="pt-2">
              {Object.entries(salePrices).some(([, v]) => v.trim()) && (
                <div className="mb-2">
                  <label className="block text-xs text-emerald-700 mb-1">
                    Record as sold (optional — fill a sale price below first)
                  </label>
                  <select
                    value={soldChannelChoice}
                    onChange={(e) => setSoldChannelChoice(e.target.value)}
                    className="w-full border border-emerald-300 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="">Just save the recipe (no sale recorded)</option>
                    {channels
                      .filter((c) => salePrices[c.name]?.trim())
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {CHANNEL_LABELS[c.name] ?? c.name} — {salePrices[c.name]} Kč
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <input
                value={bouquetName}
                onChange={(e) => setBouquetName(e.target.value)}
                placeholder="Name this bouquet (e.g. Spring Special)"
                className="w-full border border-emerald-300 rounded px-3 py-2 text-sm mb-2"
              />
              {saveError && <p className="text-red-600 text-sm mb-2">{saveError}</p>}
              {savedMessage && <p className="text-emerald-700 text-sm mb-2">{savedMessage}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save bouquet'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-emerald-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-emerald-700/70 uppercase tracking-wide">
            Sell this bouquet
          </h2>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
          >
            ⚙ {showSettings ? 'Hide settings' : 'Channel settings'}
          </button>
        </div>

        {showSettings && (
          <div className="bg-emerald-50 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 text-xs text-emerald-700/60 font-medium mb-2 px-0">
              <span className="w-24">Channel</span>
              <span className="w-24 text-center">Commission</span>
              <span className="w-16 text-center">DPH</span>
              <span className="w-11 text-center">Channel on</span>
            </div>
            <div className="space-y-2">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-900 w-24">
                    {CHANNEL_LABELS[channel.name] ?? channel.name}
                  </span>
                  <div className="flex items-center gap-2 w-24">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={channel.name === 'website'}
                      defaultValue={channel.commissionPercent}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (Number.isInteger(value) && value >= 0 && value <= 100 && value !== channel.commissionPercent) {
                          updateChannel(channel.name, { commissionPercent: value });
                        }
                      }}
                      className="w-16 border border-emerald-300 rounded px-2 py-1 text-sm text-right disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="text-sm text-emerald-700 w-4">%</span>
                  </div>
                  <div className="w-16 flex justify-center">
                    <button
                      onClick={() => updateChannel(channel.name, { vatEnabled: !channel.vatEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        channel.vatEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                      title={channel.vatEnabled ? 'Turn off DPH' : 'Turn on DPH'}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          channel.vatEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="w-11 flex justify-center">
                    <button
                      onClick={() => updateChannel(channel.name, { enabled: !channel.enabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        channel.enabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                      title={channel.enabled ? 'Turn off' : 'Turn on'}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          channel.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {channels
            .filter((c) => c.enabled)
            .map((channel) => {
              const salePriceInput = salePrices[channel.name] ?? '';
              const salePriceCzk = salePriceInput.trim()
                ? Math.round(parseFloat(salePriceInput.replace(',', '.')) * 100)
                : NaN;
              const hasSalePrice = Number.isFinite(salePriceCzk) && salePriceCzk > 0;
              const result = hasSalePrice
                ? computeChannelResult(salePriceCzk, channel.commissionPercent, totalCzk, channel.vatEnabled)
                : null;

              return (
                <div key={channel.id} className="bg-white border border-emerald-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-emerald-900 mb-1">
                    {CHANNEL_LABELS[channel.name] ?? channel.name}
                    <span className="text-xs font-normal text-emerald-700/50"> · {channel.commissionPercent}%</span>
                  </p>
                  <input
                    value={salePriceInput}
                    onChange={(e) => setSalePrices((prev) => ({ ...prev, [channel.name]: e.target.value }))}
                    placeholder="Sale price (Kč)"
                    className="w-full border border-emerald-300 rounded px-2 py-1 text-sm mb-2"
                  />
                  {hasSalePrice && result ? (
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between text-emerald-700/70">
                        <span>Commission ({channel.commissionPercent}%)</span>
                        <span>−{(result.commissionAmount / 100).toFixed(2)} Kč</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-medium pt-0.5 border-t border-emerald-100">
                        <span>Payout</span>
                        <span>{(result.payoutCzk / 100).toFixed(2)} Kč</span>
                      </div>
                      <div className="flex justify-between text-emerald-700/70">
                        <span>DPH (21%){!channel.vatEnabled && ' — off'}</span>
                        <span>−{(result.vatCzk / 100).toFixed(2)} Kč</span>
                      </div>
                      <div className="flex justify-between text-emerald-700/70">
                        <span>Bouquet cost</span>
                        <span>−{(totalCzk / 100).toFixed(2)} Kč</span>
                      </div>
                      <div
                        className={`flex justify-between font-semibold pt-0.5 border-t border-emerald-100 ${
                          result.profitCzk >= 0 ? 'text-emerald-900' : 'text-red-600'
                        }`}
                      >
                        <span>Profit</span>
                        <span>{(result.profitCzk / 100).toFixed(2)} Kč</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700/40 italic">Enter a sale price to see profit</p>
                  )}
                </div>
              );
            })}
        </div>
        {channels.filter((c) => c.enabled).length === 0 && (
          <p className="text-xs text-emerald-700/50 mt-2">
            All channels are turned off — enable one in Channel settings to see it here.
          </p>
        )}
      </div>

      {/* Flying flower animations */}
      {flying.map((f) => (
        <span
          key={f.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: f.startX,
            top: f.startY,
            animation: 'flyToBouquet 0.6s ease-in forwards',
            // Custom properties consumed by the flyToBouquet keyframes below.
            ['--fly-dx' as string]: `${f.endX - f.startX}px`,
            ['--fly-dy' as string]: `${f.endY - f.startY}px`,
          }}
        >
          {f.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-2xl">{f.emoji}</span>
          )}
        </span>
      ))}
    </div>
  );
}
