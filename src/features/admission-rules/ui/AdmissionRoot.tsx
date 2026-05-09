import AdmissionV2 from './v2/AdmissionV2';

// Top-level admission page. The v1 / v2 switcher is gone — v2 is the
// canonical surface and v1 (AdmissionWorkspace + RulesBoard + the per-
// tab god-component family) was deleted. This component is now a thin
// passthrough; kept as a separate file so the route can keep importing
// `AdmissionRoot` without churn.

export default function AdmissionRoot() {
  return (
    <div className="absolute inset-0">
      <AdmissionV2 />
    </div>
  );
}
