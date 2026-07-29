# WBT-05 — Surface catalog, generic route, tab migration

- status: `IN_PROGRESS` (catalog+route+migration+alias done, 컴포넌트 switch 제거 완료 `centralSurfaceSwitch:0`; running-app 검증 남음. 권위: [00-ticket-status-board.md](00-ticket-status-board.md))
- covers: `WB-401..406`
- goal: closed `TabKind`/central registry/manual route를 manifest-driven surface runtime으로 교체한다.
- hard dependency: WBT-04 receipt
- unlocks: `WBT-06`, `WBT-07`

## 변경 범위

write set:

```text
src/app/workbench/**
src/app/router/workspaceSurfaceRoute.tsx
src/app/router/router.tsx
src/app/router/workspaceTabsRegistry.tsx
src/shared/config/workspaceTabs.ts
src/features/workspace-tabs/**
src/pages/workspace-*/manifest.ts
src/pages/workspace-*/activate.ts
```

non-goals:

- feature visual/state rewrite
- analysis context handoff
- general app-page routes
- external plugin loading

## Migration 원칙

- metadata는 eager discovery 가능하지만 runtime/React code를 import하지 않는다.
- activator는 lazy function이며 activation 전 호출하지 않는다.
- persisted tab의 canonical identity는 `{workspaceId,surfaceId,stateVersion}`다.
- legacy URL/kind는 read-only alias/migration input이다.
- unknown/disabled/untrusted surface는 typed error surface로 닫는다.

## Leaf tickets

### WB-401 — Built-in surface catalog

작업:

- 제한된 `manifest.ts` eager glob과 `activate.ts` lazy glob을 만든다.
- metadata/activator one-to-one, owner ID, contribution references를 validate-all한다.
- sorted atomic transaction으로 SurfaceRegistry에 materialize한다.

DoD:

- [ ] discovery 시 surface chunk import 호출이 0이다.
- [ ] missing/orphan/duplicate activator/manifest가 typed reject된다.
- [ ] glob/input order와 무관하게 같은 catalog snapshot을 만든다.
- [ ] invalid owner 하나 때문에 partial catalog가 보이지 않는다.

### WB-402 — Generic workspace surface route

작업:

- canonical route를 `/w/$workspaceId/$surfaceId`로 수렴한다.
- route loader가 catalog/admission/context 결과를 typed surface state로 전달한다.
- error surface는 unknown/disabled/untrusted/incompatible을 구분한다.

DoD:

- [ ] 새 surface 추가에 `router.tsx` 수정이 필요 없다.
- [ ] deep link가 workspace/surface identity를 보존한다.
- [ ] invalid deep link가 default surface로 silent redirect되지 않는다.
- [ ] route cancellation 뒤 orphan activation이 0이다.

### WB-403 — Persisted tab schema migration

작업:

- existing `{kind}` corpus를 수집해 canonical tab record로 변환한다.
- state version, migration marker, quarantine reason을 기록한다.
- migration 성공 후 canonical store만 write한다.

DoD:

- [ ] 모든 legacy kind fixture가 expected surfaceId로 복원된다.
- [ ] unknown/corrupt record는 quarantine되고 다른 valid tab은 유지된다.
- [ ] reload identity와 pinned/order state가 보존된다.
- [ ] legacy/canonical dual-write가 0이다.

### WB-404 — WorkspaceTabsHost registry resolution

작업:

- tab component/provider lookup을 SurfaceRegistry/SurfaceHost 경로로 전환한다.
- singleton/multi-instance policy와 pin/reorder/LRU를 surface identity로 계산한다.

DoD:

- [ ] component/provider central switch를 호출하지 않는다.
- [ ] multi-instance scope/state가 격리된다.
- [ ] singleton focus/reuse가 duplicate tab을 만들지 않는다.
- [ ] pin/reorder/close/reload 회귀 suite가 green이다.

### WB-405 — Legacy URL and surface adapter

작업:

- `/intelligence`, `/coding`, `/reviews` 등 legacy URL을 canonical identity로 alias한다.
- 기존 React stage/provider는 `LegacySurfaceAdapter` 안에서만 binding한다.
- alias/adapter usage ledger를 만든다.

DoD:

- [ ] legacy/canonical URL이 같은 surface identity에 합류한다.
- [ ] redirect/history loop와 double activation이 0이다.
- [ ] adapter는 canonical lifecycle/command/context를 우회하지 않는다.

### WB-406 — Closed authority removal

작업:

- `TabKind`, `TAB_COMPONENTS`, `TAB_ICONS`, arbitrary Provider를 제거하거나 migration-only owner로 축소한다.
- test surface add/remove fixture로 zero-shell-change를 고정한다.

DoD:

- [ ] 새 test family diff에서 router/AppShell/tab union/central registry 수정이 0이다.
- [ ] production path의 central component/provider switch가 0이다.
- [ ] 남은 legacy symbol은 migration ledger에 consumer/removal milestone이 있다.
- [ ] audit baseline이 감소하고 증가하지 않는다.

proof:

```bash
pnpm exec vitest run src/app/workbench src/features/workspace-tabs
pnpm typecheck
pnpm lint:strict
pnpm ui-infra:audit
pnpm test:renderer
pnpm build
```

## Package DoD

- [ ] test family add/remove가 manifest/activate owner만 변경한다.
- [ ] discovery eager-load 0과 activation 1회가 receipt로 남는다.
- [ ] persistence migration은 idempotent하고 dual-write가 없다.
- [ ] central TabKind/component/provider authority가 production path에서 제거됐다.

## Stop / rollback

- 신규 surface를 legacy union/switch에 먼저 추가하지 않는다.
- migration 실패를 default tab 생성으로 숨기지 않는다.
- route/tab/provider의 현재 미커밋 변경을 덮어써야 하면 diff owner를 확인할 때까지 중단한다.
