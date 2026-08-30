export function formatCzk(haleru: number): string {
  return `${(haleru / 100).toFixed(2)} Kč`;
}

export function czkToHaleru(input: string): number | null {
  const n = parseFloat(input.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
