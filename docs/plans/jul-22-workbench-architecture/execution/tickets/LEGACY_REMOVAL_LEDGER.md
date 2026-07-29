# Workbench legacy removal ledger

snapshot: `2026-07-28 @ b597404` (직전 `2026-07-25 @ dc551ce`; 커널 수렴 `2b9e097` 반영 — [CONVERGENCE.md](CONVERGENCE.md))

이 ledger는 WB-904의 값이다. status/consumer 는 current HEAD 실측이다. `removed` 는
symbol 삭제 + remaining consumer 0 이 모두 확인된 경우만 표기한다.

| legacy owner | canonical owner | current mode | removal gate | target ticket | status (@`b597404`) |
|---|---|---|---|---|---|
| `src/shared/config/workspaceTabs.ts::TabKind` | `SurfaceRegistry` IDs | read/write authority | persisted kind migration + zero production consumer | WB-403, WB-406 | active |
| `workspaceTabsRegistry.tsx::TAB_COMPONENTS/TAB_ICONS` | built-in catalog(`app/workbench/surfaceCatalog`) + `surfaceRuntime` | — | SurfaceHost resolution + zero central switch | WB-401, WB-404, WB-406 | **removed** (파일 삭제, `TAB_COMPONENTS/TAB_ICONS` 0 consumers, `ui-infra:audit centralSurfaceSwitch:0`) |
| `src/features/workspace-tabs/model/RegistryContext.tsx::TabKindDef.Provider` | scoped activation service | read/write authority | analysis provider adapter + zero arbitrary Provider | WB-404, WB-503, WB-406 | migration-only (3 consumers: `workspace-tabs/index.ts`, `ui/WorkspaceTabsHost.tsx`, `ui/parts/TabChip.tsx`; `arbitraryProvider:0`) |
| legacy workspace URLs in `src/app/router/router.tsx` | `/w/$workspaceId/$surfaceId` (`workspaceSurfaceRoute`) | route authority | alias identity/history-loop proof | WB-402, WB-405 | active (route mounted; alias read-only) |
| `{kind}` persisted tabs in `src/features/workspace-tabs/model/store.ts` | `{workspaceId,surfaceId,stateVersion}` | read/write authority | migration corpus + idempotency + canonical-only write | WB-403 | active (migrateTabs 2→3 on load) |
| `src/shared/ui/runtime/CommandService.ts` implementation | `src/shared/workbench/react/KeybindingService.ts` (수렴 후; core CommandService 도 삭제) | — | zero duplicate instance/registration | WB-203, WB-302 | **removed** (`ui/runtime/CommandService.ts` 파일 없음, 0 importer) |
| UI-local scope state in `UIRuntimeProvider.tsx` | `ScopeNode` identity | independent authority | projection + reverse cleanup proof | WB-201, WB-303 | active |
| panel layout legacy persistence | app-level layout store (수렴 후; `core/LayoutStore.ts` v3 삭제) | legacy authority | v2->v3 receipt + canonical-only write | WB-214, WB-215 | active |
| manual app-page lazy imports/routes in `router.tsx` | app-page catalog | route authority | compatibility manifests + route parity + zero manual new family | WB-601, WB-602, WB-606 | active |
| `IntelligenceTabProviders` tab composition | analysis surface scope adapter | — | duplicate-tab isolation + consumer ledger | WB-503 | **removed** (0 consumers @`b597404`) |

## Row update contract

각 migration PR은 대상 row에 아래를 추가하거나 receipt에서 연결한다.

- exact remaining consumer paths/count
- legacy read 여부와 canonical write 여부
- zero-consumer/static proof command
- rollback path
- removal commit/PR

`removed`는 symbol 삭제만 뜻하지 않는다. current HEAD에서 remaining consumer 0과 replacement proof가 모두 있어야 한다.
