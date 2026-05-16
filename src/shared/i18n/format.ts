import i18n from './config';

export function currentLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'en';
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale(), opts).format(n);
}

export function formatDate(d: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(currentLocale(), opts).format(d);
}

export function formatTime(d: Date | number, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(currentLocale(), { hour: 'numeric', minute: '2-digit', ...opts }).format(d);
}
