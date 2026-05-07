import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { AiActivity } from '../activityStore';

// In-memory localStorage mock so we can assert persistence and ensure
// state never bleeds between tests.
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => {
      const next: Record<string, string> = {};
      for (const key of Object.keys(store)) if (key !== k) next[key] = store[key]!;
      store = next;
    },
    clear: () => { store = {}; },
    key: () => null,
    length: 0,
    // expose for assertions
    _dump: () => ({ ...store }),
  } as Storage & { _dump: () => Record<string, string> };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', storageMock);
  storageMock.clear();
  vi.resetModules();
});

async function loadStore() {
  const mod = await import('../activityStore');
  return mod;
}

function mkActivity(over: Partial<AiActivity> & { chatId: string }): AiActivity {
  const fileIds = over.fileIds ?? [1, 2];
  return {
    chatId: over.chatId,
    agent: over.agent ?? 'claude-opus-4.7',
    task: over.task ?? 'demo task',
    targets: over.targets ?? fileIds.map((id) => ({ fileId: id, action: 'reading', intent: 'looking' })),
    fileIds,
    state: over.state ?? 'thinking',
    hue: over.hue ?? '#22d3ee',
    startedAt: over.startedAt ?? Date.now(),
  };
}

describe('activityStore — activities', () => {
  it('upsertActivity adds a new activity', async () => {
    const { useActivityStore } = await loadStore();
    useActivityStore.getState().upsertActivity(mkActivity({ chatId: 'a' }));
    const list = useActivityStore.getState().activities;
    expect(list).toHaveLength(1);
    expect(list[0]?.chatId).toBe('a');
  });

  it('upsertActivity replaces existing activity with same chatId', async () => {
    const { useActivityStore } = await loadStore();
    const s = useActivityStore.getState();
    s.upsertActivity(mkActivity({ chatId: 'a', state: 'thinking' }));
    s.upsertActivity(mkActivity({ chatId: 'a', state: 'editing', fileIds: [9] }));
    const list = useActivityStore.getState().activities;
    expect(list).toHaveLength(1);
    expect(list[0]?.state).toBe('editing');
    expect(list[0]?.fileIds).toEqual([9]);
  });

  it('removeActivity removes one and leaves others', async () => {
    const { useActivityStore } = await loadStore();
    const s = useActivityStore.getState();
    s.upsertActivity(mkActivity({ chatId: 'a' }));
    s.upsertActivity(mkActivity({ chatId: 'b' }));
    s.upsertActivity(mkActivity({ chatId: 'c' }));
    useActivityStore.getState().removeActivity('b');
    const ids = useActivityStore.getState().activities.map((x) => x.chatId);
    expect(ids).toEqual(['a', 'c']);
  });

  it('clearActivities empties the list', async () => {
    const { useActivityStore } = await loadStore();
    const s = useActivityStore.getState();
    s.upsertActivity(mkActivity({ chatId: 'a' }));
    s.upsertActivity(mkActivity({ chatId: 'b' }));
    useActivityStore.getState().clearActivities();
    expect(useActivityStore.getState().activities).toEqual([]);
  });

  it('honors maxConcurrent cap by dropping the oldest activity', async () => {
    const { useActivityStore } = await loadStore();
    useActivityStore.getState().setPref('maxConcurrent', 3);
    const s = useActivityStore.getState();
    s.upsertActivity(mkActivity({ chatId: 'a' }));
    s.upsertActivity(mkActivity({ chatId: 'b' }));
    s.upsertActivity(mkActivity({ chatId: 'c' }));
    s.upsertActivity(mkActivity({ chatId: 'd' }));
    const ids = useActivityStore.getState().activities.map((x) => x.chatId);
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(['b', 'c', 'd']);
  });
});

describe('activityStore — prefs', () => {
  it('setPref updates store and persists to localStorage', async () => {
    const { useActivityStore } = await loadStore();
    useActivityStore.getState().setPref('enabled', false);
    expect(useActivityStore.getState().prefs.enabled).toBe(false);

    const dump = (storageMock as unknown as { _dump: () => Record<string, string> })._dump();
    const persisted = Object.values(dump)[0];
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted) as { enabled: boolean };
    expect(parsed.enabled).toBe(false);
  });

  it('resetPrefs restores defaults', async () => {
    const { useActivityStore } = await loadStore();
    const s = useActivityStore.getState();
    s.setPref('enabled', false);
    s.setPref('maxConcurrent', 2);
    s.setPref('speed', 'fast');

    useActivityStore.getState().resetPrefs();
    const prefs = useActivityStore.getState().prefs;
    expect(prefs.enabled).toBe(true);
    expect(prefs.maxConcurrent).toBe(5);
    expect(prefs.speed).toBe('normal');
    expect(prefs.showRing).toBe(true);
    expect(prefs.showLine).toBe(true);
    expect(prefs.showZone).toBe(true);
    expect(prefs.intensity).toBe('normal');
  });
});

describe('activityStore — pickHue', () => {
  it('returns distinct hues for seeds 0,1,2', async () => {
    const { pickHue } = await loadStore();
    const h0 = pickHue(0);
    const h1 = pickHue(1);
    const h2 = pickHue(2);
    expect(new Set([h0, h1, h2]).size).toBe(3);
  });

  it('cycles back to first hue at seed 3', async () => {
    const { pickHue } = await loadStore();
    expect(pickHue(3)).toBe(pickHue(0));
    expect(pickHue(4)).toBe(pickHue(1));
  });
});
