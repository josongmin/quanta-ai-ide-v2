import { describe, it, expect } from 'vitest';
import { CommandService } from '../CommandService';
import { ScopeNode } from '../ScopeNode';
import type { ScopeIdentity } from '../../contract';

const identity = (name: string): ScopeIdentity => ({ id: `core.${name}`, kind: 'surface', owner: { owner: 'core', trust: 'core' } });

describe('CommandService admission and results', () => {
  it('executes a command on an active scope', async () => {
    const svc = new CommandService();
    const scope = new ScopeNode(identity('s'));
    svc.register(scope, 'core.echo', (args) => args);
    const r = await svc.execute('core.echo', 42);
    expect(r).toEqual({ status: 'ok', value: 42 });
  });

  it('rejects an unknown command', async () => {
    const svc = new CommandService();
    const r = await svc.execute('core.missing', null);
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.error.reason).toBe('unknown-command');
  });

  it('does not execute after the owning scope is disposed and reclaims count', async () => {
    const svc = new CommandService();
    const scope = new ScopeNode(identity('s'));
    svc.register(scope, 'core.cmd', () => 'x');
    expect(svc.registrationCount('core.cmd')).toBe(1);
    scope.dispose();
    expect(svc.registrationCount('core.cmd')).toBe(0);
    const r = await svc.execute('core.cmd', null);
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.error.reason).toBe('unknown-command');
  });

  it('enforces capability', async () => {
    const svc = new CommandService();
    const scope = new ScopeNode(identity('s'));
    svc.register(scope, 'core.priv', () => 'ok', { capability: 'admin' });
    const denied = await svc.execute('core.priv', null);
    expect(denied.status === 'error' && denied.error.reason).toBe('capability-denied');
    const granted = await svc.execute('core.priv', null, { granted: ['admin'] });
    expect(granted.status).toBe('ok');
  });

  it('resolves duplicate registrations deterministically (latest active wins)', async () => {
    const svc = new CommandService();
    const a = new ScopeNode(identity('a'));
    const b = new ScopeNode(identity('b'));
    svc.register(a, 'core.dup', () => 'a');
    svc.register(b, 'core.dup', () => 'b');
    const r = await svc.execute('core.dup', null);
    expect(r).toEqual({ status: 'ok', value: 'b' });
  });

  it('distinguishes abort, timeout, and handler error as typed results', async () => {
    const svc = new CommandService();
    const scope = new ScopeNode(identity('s'));
    svc.register(scope, 'core.hang', () => new Promise<never>(() => undefined));
    svc.register(scope, 'core.boom', () => { throw new Error('boom'); });

    const timeout = await svc.execute('core.hang', null, { timeoutMs: 10 });
    expect(timeout.status === 'error' && timeout.error.reason).toBe('command-timeout');

    const aborted = await svc.execute('core.hang', null, { signal: AbortSignal.abort() });
    expect(aborted.status === 'error' && aborted.error.reason).toBe('command-aborted');

    const threw = await svc.execute('core.boom', null);
    expect(threw.status === 'error' && threw.error.reason).toBe('handler-error');
  });
});
