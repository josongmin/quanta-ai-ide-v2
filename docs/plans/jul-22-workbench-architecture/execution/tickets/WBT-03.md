# WBT-03 — Workspace, context, layout kernel

> ⚠ **수렴 반영 (`2b9e097`)** — 이 티켓의 write set(`core/{WorkspaceSession,
> ContextStore,SurfaceService,LayoutStore}.ts`)은 landed(@`e930178`) 후 삭제됐다.
> 아래 설계는 역사적 스펙으로 보존한다. 현재 HEAD 실제 owner: workspace/context
> identity → `contract/{context,scope}.ts` + app store, **context 기반 surface open
> → `src/app/router/surfaceRuntime.ts` + `workspaceSurfaceRoute.tsx` + `app/workbench/surfaceCatalog.ts`**,
> layout → app-level store. 유지된 커널 primitive 는 `core/ScopeNode.ts` 뿐.
> 근거: [`CONVERGENCE.md`](CONVERGENCE.md).

- status: `DONE→SUPERSEDED` (landed @`e930178`, superseded @`2b9e097`; see WBT-03-RECEIPT.md + CONVERGENCE.md)
- covers: `WB-211..215`
- goal: workspace snapshot identity, bounded context handoff, surface-open admission, layout persistence를 canonical kernel로 고정한다.
- hard dependency: WBT-02 receipt
- unlocks: `WBT-04`

## 변경 범위

write set:

```text
src/shared/workbench/core/
  WorkspaceSession.ts
  ContextStore.ts
  SurfaceService.ts
  LayoutStore.ts
  __tests__/workspaceSession.test.ts
  __tests__/contextStore.test.ts
  __tests__/surfaceService.test.ts
  __tests__/layoutStore.test.ts
```

read/migration inputs:

- existing workspace identity/session owners
- `src/features/workspace-tabs/model/store.ts`
- existing panel/layout persistence owners

non-goals:

- React mount/navigation
- router and tab record migration
- Search/Facts/blob payload ownership
- cross-family UI wiring

## Data invariants

- context handle은 payload가 아니라 immutable envelope/ref를 가리킨다.
- workspace/revision/Facts generation이 다르면 current selection으로 보정하지 않는다.
- layout mutation은 operation transaction이며 validated snapshot만 persistence한다.
- migration은 legacy-read/canonical-write 일회성이며 dual-write하지 않는다.

## Leaf tickets

### WB-211 — Workspace session identity

작업:

- workspace ID, revision, search generation, Facts generation, dirty identity를 정의한다.
- generation 전환 시 request/context invalidation을 일관되게 발생시킨다.

DoD:

- [ ] generation rollover가 이전 request/handle을 stale 처리한다.
- [ ] 다른 workspace의 동일 revision 문자열이 같은 identity가 아니다.
- [ ] dirty state와 immutable revision identity를 혼합하지 않는다.

### WB-212 — Context store and lease

작업:

- envelope, handle, lease, TTL, refcount, byte budget을 구현한다.
- payload owner는 external immutable ref이며 ContextStore가 대용량 객체를 복제하지 않는다.
- sensitivity/durability/schema compatibility를 admission에서 확인한다.

DoD:

- [ ] wrong workspace/stale/expired/unknown schema가 각각 구분된다.
- [ ] source close 후 target lease가 있으면 유지된다.
- [ ] 마지막 lease close 후 entry/resource count가 0이다.
- [ ] secret/durable 정책 위반과 byte overflow가 reject된다.

### WB-213 — Surface open admission

작업:

- `SurfaceService.openSurface({surfaceId, contextHandle, reuse})`를 구현한다.
- reuse는 `new`, `active-compatible`, `singleton`으로 제한한다.
- surface resolver/navigation은 injected port이며 Router를 core가 import하지 않는다.

DoD:

- [ ] incompatible active instance를 잘못 재사용하지 않는다.
- [ ] missing/disabled/untrusted surface가 typed reject된다.
- [ ] context admission 실패 시 tab/surface partial creation이 0이다.
- [ ] cancellation race에서 orphan instance/lease가 0이다.

### WB-214 — LayoutStore v3

작업:

- layout schema v3, operation transaction, validator, persistence port를 구현한다.
- corrupt/partial state를 quarantine하고 deterministic safe layout을 제공한다.

DoD:

- [ ] operation sequence round-trip이 동일 snapshot을 만든다.
- [ ] invalid operation batch가 partial commit하지 않는다.
- [ ] corrupt blob 원문/사유가 quarantine receipt에 남는다.
- [ ] recovery가 last-known invalid blob에 재쓰기하지 않는다.

### WB-215 — Legacy layout migration

작업:

- existing panel layout/v2 fixture를 수집한다.
- v2를 v3로 한 번 변환하고 marker/receipt를 기록한다.
- 실패 시 legacy 원본을 보존하고 safe layout으로 닫는다.

DoD:

- [ ] v2->v3 fixture matrix가 green이다.
- [ ] migration 재실행이 idempotent하다.
- [ ] legacy/canonical dual-write가 0이다.
- [ ] unknown version은 best-effort parse하지 않는다.

proof:

```bash
pnpm exec vitest run src/shared/workbench/core
pnpm typecheck
pnpm lint:strict
pnpm audit:cross-slice
pnpm ui-infra:audit
```

## Package DoD

- [ ] lifecycle/context/layout negative corpus가 exact reason code를 검증한다.
- [ ] store byte/ref/resource count가 teardown 뒤 0이다.
- [ ] core import graph에 React/Router/Tauri가 0개다.
- [ ] layout migration receipt에 source version, target version, result가 있다.

## Stop / rollback

- context가 family store나 mutable singleton을 참조해야 하면 계약을 재검토하고 중단한다.
- SurfaceService가 Router를 직접 import하거나 layout migration이 dual-write하면 실패다.
- corrupt state를 조용히 버리거나 unknown version을 기본값으로 덮지 않는다.
