import type {
  ApprovalPath,
  OwnershipZone,
  Person,
  PersonId,
  RefactorStack,
} from '../model';
import {
  MOCK_APPROVAL_PATHS,
  MOCK_PEOPLE,
  MOCK_STACKS,
  MOCK_ZONES,
} from './fixtures';

export function findPerson(id: PersonId): Person | undefined {
  return MOCK_PEOPLE.find((p) => p.id === id);
}

export function findZone(id: string): OwnershipZone | undefined {
  return MOCK_ZONES.find((z) => z.id === id);
}

export function findStack(zoneId: string): RefactorStack | undefined {
  return MOCK_STACKS.find((s) => s.zoneId === zoneId);
}

export function findApprovalPath(zoneId: string): ApprovalPath | undefined {
  return MOCK_APPROVAL_PATHS.find((p) => p.zoneId === zoneId);
}

export function isPersonRoutable(person: Person | undefined): boolean {
  if (!person) return false;
  return person.active && person.lastActiveDays < 90;
}

export type RoutingResolution = {
  effectivePrimary: Person | undefined;
  declaredPrimary: Person | undefined;
  primaryStale: boolean;
  reroutedTo: Person | undefined;
  rerouteReason: string | undefined;
}

export function resolveRouting(
  zone: OwnershipZone,
): RoutingResolution {
  const declared = findPerson(zone.primary);
  const declaredRoutable = isPersonRoutable(declared);
  if (declaredRoutable) {
    return {
      effectivePrimary: declared,
      declaredPrimary: declared,
      primaryStale: false,
      reroutedTo: undefined,
      rerouteReason: undefined,
    };
  }

  const fallbackOrder = [zone.backup, zone.recommendedReviewer, zone.escalation];
  for (const id of fallbackOrder) {
    if (!id) continue;
    const candidate = findPerson(id);
    if (isPersonRoutable(candidate)) {
      return {
        effectivePrimary: candidate,
        declaredPrimary: declared,
        primaryStale: true,
        reroutedTo: candidate,
        rerouteReason: declared
          ? `${declared.name} last active ${declared.lastActiveDays}d ago`
          : 'declared primary unreachable',
      };
    }
  }

  return {
    effectivePrimary: declared,
    declaredPrimary: declared,
    primaryStale: true,
    reroutedTo: undefined,
    rerouteReason: 'no active fallback in routing graph',
  };
}
