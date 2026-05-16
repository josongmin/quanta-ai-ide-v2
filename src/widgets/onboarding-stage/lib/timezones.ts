// Trimmed list of common timezones for the demo locale picker. Real apps
// pull from Intl.supportedValuesOf('timeZone'); we hard-code so the order
// is deterministic across browsers.

export const TIMEZONES: { id: string; label: string; offset: string }[] = [
  { id: 'Pacific/Honolulu',    label: 'Honolulu',     offset: 'UTC−10' },
  { id: 'America/Anchorage',   label: 'Anchorage',    offset: 'UTC−9'  },
  { id: 'America/Los_Angeles', label: 'Los Angeles',  offset: 'UTC−8'  },
  { id: 'America/Denver',      label: 'Denver',       offset: 'UTC−7'  },
  { id: 'America/Chicago',     label: 'Chicago',      offset: 'UTC−6'  },
  { id: 'America/New_York',    label: 'New York',     offset: 'UTC−5'  },
  { id: 'America/Sao_Paulo',   label: 'São Paulo',    offset: 'UTC−3'  },
  { id: 'Atlantic/Azores',     label: 'Azores',       offset: 'UTC−1'  },
  { id: 'Europe/London',       label: 'London',       offset: 'UTC+0'  },
  { id: 'Europe/Berlin',       label: 'Berlin',       offset: 'UTC+1'  },
  { id: 'Europe/Helsinki',     label: 'Helsinki',     offset: 'UTC+2'  },
  { id: 'Africa/Nairobi',      label: 'Nairobi',      offset: 'UTC+3'  },
  { id: 'Asia/Dubai',          label: 'Dubai',        offset: 'UTC+4'  },
  { id: 'Asia/Karachi',        label: 'Karachi',      offset: 'UTC+5'  },
  { id: 'Asia/Kolkata',        label: 'Kolkata',      offset: 'UTC+5:30' },
  { id: 'Asia/Bangkok',        label: 'Bangkok',      offset: 'UTC+7'  },
  { id: 'Asia/Singapore',      label: 'Singapore',    offset: 'UTC+8'  },
  { id: 'Asia/Shanghai',       label: 'Shanghai',     offset: 'UTC+8'  },
  { id: 'Asia/Seoul',          label: 'Seoul',        offset: 'UTC+9'  },
  { id: 'Asia/Tokyo',          label: 'Tokyo',        offset: 'UTC+9'  },
  { id: 'Australia/Sydney',    label: 'Sydney',       offset: 'UTC+10' },
  { id: 'Pacific/Auckland',    label: 'Auckland',     offset: 'UTC+12' },
];

export const LOCALES: { id: string; label: string; native: string }[] = [
  { id: 'en-US', label: 'English (United States)', native: 'English' },
  { id: 'en-GB', label: 'English (United Kingdom)', native: 'English' },
  { id: 'ko-KR', label: 'Korean',                   native: '한국어' },
  { id: 'ja-JP', label: 'Japanese',                 native: '日本語' },
  { id: 'zh-CN', label: 'Chinese (Simplified)',     native: '简体中文' },
  { id: 'fr-FR', label: 'French',                   native: 'Français' },
  { id: 'de-DE', label: 'German',                   native: 'Deutsch' },
  { id: 'es-ES', label: 'Spanish',                  native: 'Español' },
  { id: 'pt-BR', label: 'Portuguese (Brazil)',      native: 'Português' },
];

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Los_Angeles';
  }
}

export function detectBrowserLocale(): string {
  try {
    const lang = navigator.language ?? 'en-US';
    return LOCALES.find((l) => l.id.startsWith(lang.slice(0, 2)))?.id ?? 'en-US';
  } catch {
    return 'en-US';
  }
}
