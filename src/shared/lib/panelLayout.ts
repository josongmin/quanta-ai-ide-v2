import { useEffect, useState } from 'react';

import { safeLocalGet, safeLocalSet } from './safeStorage';
import { STORAGE_KEYS } from './storageKeys';

export type PanelWidthConfig = {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
};

export const LEFT_PANEL: PanelWidthConfig = {
  storageKey: STORAGE_KEYS.panelLeftWidth,
  defaultWidth: 296,
  min: 240,
  max: 420,
};

export const RIGHT_PANEL: PanelWidthConfig = {
  storageKey: STORAGE_KEYS.panelRightWidth,
  defaultWidth: 360,
  min: 320,
  max: 620,
};

export const INTELLIGENCE_LAYOUT = {
  sideInset: 12,
  panelGap: 20,
  topInset: 12,
  bottomInset: 12,
  centerReserve: 88,
} as const;

function clampWidth(width: number, config: PanelWidthConfig): number {
  return Math.min(config.max, Math.max(config.min, width));
}

function readStoredWidth(config: PanelWidthConfig): number {
  if (typeof window === 'undefined') return config.defaultWidth;
  const raw = safeLocalGet(config.storageKey);
  if (!raw) return config.defaultWidth;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampWidth(parsed, config) : config.defaultWidth;
}

export function usePersistedPanelWidth(config: PanelWidthConfig): [number, (next: number) => void] {
  const [width, setWidth] = useState<number>(() => readStoredWidth(config));

  useEffect(() => {
    safeLocalSet(config.storageKey, String(width));
  }, [config.storageKey, width]);

  return [width, (next: number) => { setWidth(clampWidth(next, config)); }];
}

export function getFloatingToolbarLeft(leftPanelWidth: number): number {
  return leftPanelWidth + INTELLIGENCE_LAYOUT.panelGap;
}

export function getCenterMaxWidth(leftPanelWidth: number, rightPanelWidth: number): string {
  return `calc(100vw - ${leftPanelWidth + rightPanelWidth + INTELLIGENCE_LAYOUT.centerReserve}px)`;
}
