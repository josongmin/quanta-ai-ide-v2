export type RuntimeEnv = {
  now: () => number;
  createId: (prefix: string) => string;
};

let fallbackSequence = 0;

export const systemRuntimeEnv: RuntimeEnv = {
  now: () => Date.now(),
  createId: (prefix) => {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}-${uuid}`;
    fallbackSequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}`;
  },
};
