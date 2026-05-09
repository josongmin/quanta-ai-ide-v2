import { useMemo, useState } from 'react';
import {
  MOCK_AUTO_DRAFTS,
  MOCK_CROSS_TEAM_HOTSPOTS,
  MOCK_PEOPLE,
  MOCK_ZONES,
  findApprovalPath,
  findStack,
  type AutoDraftSuggestion,
} from '@entities/ownership';
import { OwnershipHeatLayer } from './OwnershipHeatLayer';
import { RoutingCard } from './RoutingCard';
import { StackPlanner } from './StackPlanner';
import { CrossTeamHotspotBoard } from './CrossTeamHotspotBoard';
import { AILandingPlanModal } from './AILandingPlanModal';
import { ApprovalPathCard } from './ApprovalPathCard';
import { AutoDraftSuggestions } from './AutoDraftSuggestions';
import { ProofObligationsCard } from './ProofObligationsCard';
import { SafeSeamsCard } from './SafeSeamsCard';

export function OwnershipPanel() {
  const zones = MOCK_ZONES;
  const people = MOCK_PEOPLE;
  const [selectedId, setSelectedId] = useState<string>(zones[0]?.id ?? '');
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedId) ?? zones[0],
    [zones, selectedId],
  );
  const selectedStack = useMemo(
    () => (selectedZone ? findStack(selectedZone.id) : undefined),
    [selectedZone],
  );
  const selectedApproval = useMemo(
    () => (selectedZone ? findApprovalPath(selectedZone.id) : undefined),
    [selectedZone],
  );

  const handleAcceptSuggestion = (_id: string, zoneId: string, action: AutoDraftSuggestion['proposedAction']) => {
    setSelectedId(zoneId);
    if (action === 'open-stack-plan' || action === 'split-pr') {
      setPlanModalOpen(true);
    }
  };

  return (
    <div className="space-y-3 px-2 py-3">
      <OwnershipHeatLayer
        zones={zones}
        selectedZoneId={selectedZone?.id}
        onZoneSelect={setSelectedId}
      />

      {selectedZone && <RoutingCard zone={selectedZone} people={people} />}

      <ApprovalPathCard path={selectedApproval} people={people} />

      <StackPlanner
        stack={selectedStack}
        people={people}
        onPlanRefactor={() => { setPlanModalOpen(true); }}
      />

      <AutoDraftSuggestions
        suggestions={MOCK_AUTO_DRAFTS}
        onAccept={handleAcceptSuggestion}
      />

      <CrossTeamHotspotBoard
        hotspots={MOCK_CROSS_TEAM_HOTSPOTS}
        selectedZoneId={selectedZone?.id}
        onSelect={setSelectedId}
      />

      {selectedStack && (
        <>
          <ProofObligationsCard obligations={selectedStack.proofObligations} />
          <SafeSeamsCard seams={selectedStack.safeSeams} />
        </>
      )}

      <AILandingPlanModal
        open={planModalOpen}
        onClose={() => { setPlanModalOpen(false); }}
        zone={selectedZone}
        stack={selectedStack}
        people={people}
      />
    </div>
  );
}
