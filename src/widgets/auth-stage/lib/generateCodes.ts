export function generateCodes(n: number): string[] {
  // Demo-only deterministic-ish generator. Real systems would use cryptorandom.
  const out: string[] = [];
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';  // no 0/O/1/l/i confusables
  for (let i = 0; i < n; i++) {
    let s = '';
    for (let j = 0; j < 12; j++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    out.push(`${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`);
  }
  return out;
}
