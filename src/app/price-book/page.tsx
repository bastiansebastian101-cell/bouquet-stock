'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Flower {
  id: string;
  name: string;
  priceCzk: number;
  stockQuantity: number;
  color: string | null;
  imageUrl: string | null;
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

function EditableCell({
  value,
  onSave,
  suffix = '',
  width = 'w-24',
}: {
  value: string;
  onSave: (newValue: string) => void;
  suffix?: string;
  width?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false);
            if (draft !== value) onSave(draft);
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${width} border border-emerald-400 rounded px-2 py-1 text-sm`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`${width} text-left px-2 py-1 text-sm rounded hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors`}
      title="Click to edit"
    >
      {value}
      {suffix}
    </button>
  );
}

function PhotoCell({ flower, onUploaded }: { flower: Flower; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) onUploaded(url);
  };

  return (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50 flex items-center justify-center hover:border-emerald-400 transition-colors"
      title={flower.imageUrl ? 'Click to change photo' : 'Click to add photo'}
    >
      {flower.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flower.imageUrl} alt={flower.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-emerald-400 text-xl">{uploading ? '…' : '+'}</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </button>
  );
}

export default function PriceBookPage() {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newImageUploading, setNewImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newImageInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/flowers');
    const data = await res.json();
    setFlowers(data.flowers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateFlower = async (id: string, patch: Record<string, unknown>) => {
    await fetch(`/api/flowers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    load();
  };

  const handleNewImageFile = async (file: File) => {
    setNewImageUploading(true);
    const url = await uploadImage(file);
    setNewImageUploading(false);
    if (url) setNewImageUrl(url);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceCzk = Math.round(parseFloat(newPrice.replace(',', '.')) * 100);
    const stockQuantity = newStock.trim() ? parseInt(newStock, 10) : 0;

    if (!newName.trim() || !Number.isFinite(priceCzk) || priceCzk < 0) {
      setError('Enter a flower name and a valid price.');
      return;
    }

    const res = await fetch('/api/flowers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), priceCzk, stockQuantity, imageUrl: newImageUrl }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === 'name_taken' ? 'A flower with that name already exists.' : 'Could not add flower.');
      return;
    }

    setNewName('');
    setNewPrice('');
    setNewStock('');
    setNewImageUrl(null);
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the price book?`)) return;
    setError(null);
    const res = await fetch(`/api/flowers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === 'flower_in_use'
          ? `Can't remove ${name} — it's used in a saved bouquet.`
          : `Could not remove ${name}.`
      );
      return;
    }
    load();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-emerald-900">Flower Price Book</h1>
        <Link href="/builder" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          Go to Bouquet Builder →
        </Link>
      </div>

      <p className="text-sm text-emerald-700/70 mb-6">
        Click any price or stock number to edit it directly — handy for updating prices the moment new flowers
        arrive. Click a photo square to add or change a picture.
      </p>

      <form onSubmit={handleAdd} className="bg-emerald-50 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Photo</label>
          <button
            type="button"
            onClick={() => newImageInputRef.current?.click()}
            disabled={newImageUploading}
            className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 bg-white flex items-center justify-center hover:border-emerald-500 transition-colors"
          >
            {newImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-emerald-400 text-xl">{newImageUploading ? '…' : '+'}</span>
            )}
            <input
              ref={newImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleNewImageFile(file);
                e.target.value = '';
              }}
            />
          </button>
        </div>
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Flower name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Red Rose"
            className="border border-emerald-300 rounded px-3 py-1.5 text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Price per stem (Kč)</label>
          <input
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="15"
            className="border border-emerald-300 rounded px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs text-emerald-700 mb-1">Stock (stems)</label>
          <input
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
            placeholder="0"
            className="border border-emerald-300 rounded px-3 py-1.5 text-sm w-24"
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          Add flower
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-emerald-700/60 text-sm">Loading…</p>
      ) : flowers.length === 0 ? (
        <p className="text-emerald-700/60 text-sm">No flowers yet — add your first one above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-emerald-700/70 border-b border-emerald-200">
              <th className="py-2 font-medium">Photo</th>
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Price / stem</th>
              <th className="py-2 font-medium">Stock</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {flowers.map((f) => (
              <tr key={f.id} className="border-b border-emerald-100">
                <td className="py-2">
                  <PhotoCell flower={f} onUploaded={(url) => updateFlower(f.id, { imageUrl: url })} />
                </td>
                <td className="py-2">
                  <EditableCell
                    value={f.name}
                    width="w-40"
                    onSave={(v) => updateFlower(f.id, { name: v })}
                  />
                </td>
                <td className="py-2">
                  <EditableCell
                    value={(f.priceCzk / 100).toFixed(2)}
                    suffix=" Kč"
                    onSave={(v) => {
                      const priceCzk = Math.round(parseFloat(v.replace(',', '.')) * 100);
                      if (Number.isFinite(priceCzk) && priceCzk >= 0) updateFlower(f.id, { priceCzk });
                    }}
                  />
                </td>
                <td className="py-2">
                  <EditableCell
                    value={String(f.stockQuantity)}
                    onSave={(v) => {
                      const stockQuantity = parseInt(v, 10);
                      if (Number.isInteger(stockQuantity) && stockQuantity >= 0)
                        updateFlower(f.id, { stockQuantity });
                    }}
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDelete(f.id, f.name)}
                    className="text-xs text-emerald-700/50 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
