import { describe, it, expect } from 'vitest';
import { toRole, toMember, toInvitation, toOrgDetail } from '../model/mappers';

describe('org mappers — defensive wire→app narrowing', () => {
  it('toRole picks the highest-privilege known role from a comma-joined value', () => {
    expect(toRole('member,admin')).toBe('admin');
    expect(toRole('owner')).toBe('owner');
    expect(toRole('billing')).toBe('billing');
  });

  it('toRole falls back to member for unknown / malformed input', () => {
    expect(toRole('superuser')).toBe('member');
    expect(toRole(null)).toBe('member');
    expect(toRole(undefined)).toBe('member');
    expect(toRole(42)).toBe('member');
  });

  it('toMember reads the nested user + coerces Date createdAt to ISO', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    const m = toMember({
      id: 'mem_1', userId: 'u_1', role: 'admin', createdAt: at,
      user: { id: 'u_1', name: 'Sora', email: 'sora@acme.com', image: null },
    });
    expect(m).toEqual({
      id: 'mem_1', userId: 'u_1', name: 'Sora', email: 'sora@acme.com',
      role: 'admin', image: null, createdAt: at.toISOString(),
    });
  });

  it('toMember tolerates a missing user object', () => {
    const m = toMember({ id: 'mem_2', role: 'member' });
    expect(m.name).toBe('');
    expect(m.email).toBe('');
    expect(m.role).toBe('member');
  });

  it('toInvitation defaults an unknown status to pending', () => {
    expect(toInvitation({ id: 'i1', email: 'x@y.z', role: 'guest', status: 'weird' }).status).toBe('pending');
    expect(toInvitation({ id: 'i2', email: 'x@y.z', role: 'admin', status: 'canceled' }).status).toBe('canceled');
  });

  it('toOrgDetail keeps only pending invitations and maps arrays defensively', () => {
    const detail = toOrgDetail({
      id: 'org_1', name: 'Acme', slug: 'acme',
      members: [{ id: 'm1', userId: 'u1', role: 'owner', user: { name: 'A', email: 'a@x.z' } }],
      invitations: [
        { id: 'i1', email: 'p@x.z', role: 'member', status: 'pending' },
        { id: 'i2', email: 'q@x.z', role: 'member', status: 'accepted' },
      ],
      teams: [{ id: 't1', name: 'Platform' }],
    });
    expect(detail.org).toEqual({ id: 'org_1', name: 'Acme', slug: 'acme', logo: null });
    expect(detail.members).toHaveLength(1);
    expect(detail.invitations).toHaveLength(1);
    expect(detail.invitations[0]?.email).toBe('p@x.z');
    expect(detail.teams[0]?.name).toBe('Platform');
  });

  it('toOrgDetail handles a null / empty payload without throwing', () => {
    const detail = toOrgDetail(null);
    expect(detail.members).toEqual([]);
    expect(detail.invitations).toEqual([]);
    expect(detail.teams).toEqual([]);
    expect(detail.org).toEqual({ id: '', name: '', slug: '', logo: null });
  });
});
