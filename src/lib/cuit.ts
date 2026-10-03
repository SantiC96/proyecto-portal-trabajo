// CUIT/CUIL validation — Argentine tax identification number (AFIP standard)
// Weights: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] applied to the first 10 digits.
// mod===0 → check digit is 0; mod===1 → check digit is 9 (standard for legal entities);
// otherwise check digit is 11 - mod.

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

export function validarCUIT(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const mod = sum % 11;
  const expected = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  return Number(digits[10]) === expected;
}

export function formatearCUIT(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}
