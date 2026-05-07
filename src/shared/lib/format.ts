export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pct(n: number, total: number): number {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

// Sequential single-hue scale for *categorical* language data. Different
// shades of gray distinguish 3-4 languages without competing with the
// severity palette (red/amber/green) for attention.
export function languageHue(lang: string, isDark: boolean): string {
  if (isDark) {
    switch (lang) {
      case 'ts':  return 'rgba(255,255,255,0.85)';
      case 'tsx': return 'rgba(255,255,255,0.65)';
      case 'js':  return 'rgba(255,255,255,0.45)';
      case 'css': return 'rgba(255,255,255,0.30)';
      case 'md':  return 'rgba(255,255,255,0.18)';
      default:    return 'rgba(255,255,255,0.25)';
    }
  }
  switch (lang) {
    case 'ts':  return 'rgba(0,0,0,0.78)';
    case 'tsx': return 'rgba(0,0,0,0.58)';
    case 'js':  return 'rgba(0,0,0,0.40)';
    case 'css': return 'rgba(0,0,0,0.25)';
    case 'md':  return 'rgba(0,0,0,0.15)';
    default:    return 'rgba(0,0,0,0.22)';
  }
}
