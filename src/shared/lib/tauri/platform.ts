// Lightweight platform detection for layout decisions (macOS traffic-light
// inset, Windows control reservation, etc.). Synchronous and SSR-safe.

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

export const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac os x') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
};

export const isMacOS = (): boolean => detectPlatform() === 'macos';
