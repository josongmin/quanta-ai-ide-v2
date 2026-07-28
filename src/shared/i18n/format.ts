import i18n from './config';

export function currentLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'en';
}

// Locale-aware Intl formatters — the SINGLE source of truth for number/date
// display. (There used to be a second, locale-BLIND copy in shared/lib/format
// using `new Intl.NumberFormat()` with the runtime default locale, so ja/ko/zh
// rendered half-localized; those were deleted and all callers moved here.)
// Instances are cached per (locale, options) so we keep the GC win of a reused
// formatter that the old singleton had, while still reformatting on language
// change. NOTE: no baked-in date defaults — merging month/day into a caller's
// `{ dateStyle }` throws RangeError, so presets are separate functions below.
const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function numberFmt(opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = currentLocale() + ' ' + (opts ? JSON.stringify(opts) : '');
  let f = numberCache.get(key);
  if (!f) { f = new Intl.NumberFormat(currentLocale(), opts); numberCache.set(key, f); }
  return f;
}

function dateFmt(opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = currentLocale() + ' ' + (opts ? JSON.stringify(opts) : '');
  let f = dateCache.get(key);
  if (!f) { f = new Intl.DateTimeFormat(currentLocale(), opts); dateCache.set(key, f); }
  return f;
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return numberFmt(opts).format(n);
}

export function formatDate(d: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return dateFmt(opts).format(d);
}

export function formatTime(d: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return dateFmt({ hour: 'numeric', minute: '2-digit', ...opts }).format(d);
}

// "when did this happen" stamp (month/day + hour/minute) — the preset formerly
// exported as formatTimestamp from shared/lib, now locale-aware.
export function formatTimestamp(d: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return dateFmt({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', ...opts }).format(d);
}
