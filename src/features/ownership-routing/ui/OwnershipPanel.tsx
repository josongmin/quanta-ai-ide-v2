import { useMemo, useState } from 'react';
import { MOCK_PEOPLE, MOCK_ZONES, findStack } from '@entities/ownership';
import { OwnershipHeatLayer } from './OwnershipHeatLayer';
import { RoutingCard } from './RoutingCard';
import { StackPlanner } from './StackPlanner';

export function OwnershipPanel() {
  const zones = MOCK_ZONES;
  const people = MOCK_PEOPLE;
  const [selectedId, setSelectedId] = useState<string>(zones[0]?.id ?? '');

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedId) ?? zones[0],
    [zones, selectedId],
  );
  const selectedStack = useMemo(
    () => (selectedZone ? findStack(selectedZone.id) : undefined),
    [selectedZone],
  );

  return (
    <div className="space-y-3 px-2 py-3">
      <OwnershipHeatLayer
        zones={zones}
        selectedZoneId={selectedZone?.id}
        onZoneSelect={setSelectedId}
      />
      {selectedZone && <RoutingCard zone={selectedZone} people={people} />}
      <StackPlanner stack={selectedStack} people={people} />
    </div>
  );
}
