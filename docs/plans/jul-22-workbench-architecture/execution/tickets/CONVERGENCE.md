# Workbench kernel convergence — the WBT-02/03 → scope+keybindings pivot

reconciled: `2026-07-28 @ b597404` (was authored against `origin/main` pre-`2b9e097`)

이 문서는 실행 원장(status board / receipts / closeout / source-truth-map / legacy
ledger)이 공유하는 **단일 delta 근거**다. WBT-02/WBT-03가 만든 다중 서비스 커널이
왜 지금 HEAD에 없는지, 그리고 그 권위가 어디로 옮겨갔는지를 여기 한 곳에서만
설명한다. 다른 문서는 이 파일을 링크하고 자기 자리의 사실만 갱신한다.

## 무슨 일이 있었나

1. `fe37c7f` **WBT-02** — `core/{ContributionRegistry,CommandService,ContextKeyService,IntentBus,ScopeNode}` 를 VSCode식 다중 서비스 커널로 구현. 착수 시점 HEAD 기준 28 tests green. (receipt: [WBT-02-RECEIPT](WBT-02-RECEIPT.md))
2. `e930178` **WBT-03** — `core/{WorkspaceSession,ContextStore,SurfaceService,LayoutStore}` 추가. 그 시점 89 workbench tests green. (receipt: [WBT-03-RECEIPT](WBT-03-RECEIPT.md))
3. `070a5f5`/`34daed0` **WBT-08** — host-neutral admission 을 `contract/admission.ts` 로 통합(별도 core 서비스 아님).
4. `2b9e097` **P0-1 수렴 (2026-07-27)** — "remove dead parallel workbench authority — converge kernel onto scope+keybindings". 위 다중 서비스 8개(+테스트 9개)를 **삭제**했다. 이유: runtime 어디에도 wiring되지 않은 dead parallel authority였고, 실제 축은 이미 다른 owner가 갖고 있었다.

근거는 코드 자체에 남아 있다 — [`core/index.ts`](../../../../../src/shared/workbench/core/index.ts) 헤더 주석 참조.

## 삭제된 것 ↔ 실제 살아있는 canonical owner

| WBT-02/03가 만든 것 (삭제됨 @ `2b9e097`) | 현재 HEAD `b597404` canonical owner |
|---|---|
| `core/CommandService.ts`, `ContextKeyService.ts`, `IntentBus.ts`, `ContributionRegistry.ts` | command/keybinding 축 → `src/shared/workbench/react/KeybindingService.ts` (scope+context로 라우팅) |
| `core/SurfaceService.ts` (context 기반 surface open) | surface open 축 → `src/app/router/surfaceRuntime.ts` (`SURFACE_RUNTIME`) + `src/app/router/workspaceSurfaceRoute.tsx` + `src/app/workbench/surfaceCatalog.ts` + zustand tab store |
| `core/WorkspaceSession.ts`, `ContextStore.ts` | workspace/context identity → `contract/{context,scope}.ts` 타입 + app-level store (독립 core 서비스 없음) |
| `core/LayoutStore.ts` | layout persistence → app-level 소유 (독립 core LayoutStore 없음) |
| `core/ScopeNode.ts` | **유지됨** — 커널의 유일한 load-bearing primitive (app-root scope + child-first disposable teardown), react host가 `WorkbenchRoot`/`appScope`로 project |

## 현재 HEAD `b597404` 실제 workbench 표면

- `contract/**` (React-free): errors, schemas, featureManifest, surface, command, scope, context, configuration, admission, schemaArtifact
- `core/`: `ScopeNode` **만** (+ `index.ts`)
- `react/` (host): `WorkbenchRoot`(=`WorkbenchProvider`), `KeybindingService`, `useWorkbench` 훅
- `app/workbench/`: `surfaceCatalog`, `builtinSurfaces`, `icons`, `surfaceView`
- `app/router/`: `surfaceRuntime`, `workspaceSurfaceRoute`

## receipt 해석 규칙 (중요)

- WBT-02/WBT-03 receipt 의 `core/*Service.ts` 목록과 28/68/89 test 수치는 **각자의 착수 HEAD(`fe37c7f`/`e930178`)에서 참**이었다. 역사적 증거로 보존한다.
- 그 수치를 **현재 HEAD 파일 존재 증거로 재사용하지 않는다** (README 전역 규칙: "과거 commit의 receipt를 현재 HEAD 증거로 재사용하지 않는다").
- 현재 HEAD 의 workbench 커널/host/surface 테스트는 **87 tests / 12 files green** (`pnpm exec vitest run src/shared/workbench src/app/workbench src/app/router`, `2026-07-28 @ b597404`).

## 왜 이게 퇴보가 아니라 구조 개선인가

삭제된 서비스들은 **parallel authority** 였다. 같은 축(command·surface·context)을
두 owner가 동시에 소유하는 것은 이 캠페인 전역 불변식 위반이다(README: dual-write
금지, 단일 canonical authority). 수렴은 그 위반을 제거하고 각 축을 실제 사용되는
단일 owner로 접었다. `ui-infra:audit` 의 `centralSurfaceSwitch:0`,
`arbitraryProvider:0`, `noHardcodedSurfaceId:0`, `workbenchReactImport:0` 가
현재 HEAD에서 이 수렴이 정합함을 정적으로 증명한다.
