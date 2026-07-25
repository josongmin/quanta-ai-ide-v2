# Workbench legacy removal ledger

snapshot: `2026-07-25 @ dc551ce8450374d8007dfb379835d23817ca4467`

이 ledger는 WB-904의 초기값이다. consumer count와 status는 각 migration PR에서 current HEAD 기준으로 갱신한다.

| legacy owner | canonical owner | current mode | removal gate | target ticket | status |
|---|---|---|---|---|---|
| `src/shared/config/workspaceTabs.ts::TabKind` | `SurfaceRegistry` IDs | read/write authority | persisted kind migration + zero production consumer | WB-403, WB-406 | active |
| `src/app/router/workspaceTabsRegistry.tsx::TAB_COMPONENTS/TAB_ICONS` | built-in catalog + activator binding | read/write authority | SurfaceHost resolution + zero central switch | WB-401, WB-404, WB-406 | active |
| `src/features/workspace-tabs/model/RegistryContext.tsx::TabKindDef.Provider` | scoped activation service | read/write authority | analysis provider adapter + zero arbitrary Provider | WB-404, WB-503, WB-406 | active |
| legacy workspace URLs in `src/app/router/router.tsx` | `/w/$workspaceId/$surfaceId` | route authority | alias identity/history-loop proof | WB-402, WB-405 | active |
| `{kind}` persisted tabs in `src/features/workspace-tabs/model/store.ts` | `{workspaceId,surfaceId,stateVersion}` | read/write authority | migration corpus + idempotency + canonical-only write | WB-403 | active |
| `src/shared/ui/runtime/CommandService.ts` implementation | workbench core CommandService | independent authority | delegate facade + zero duplicate instance/registration | WB-203, WB-302 | active |
| UI-local scope state in `UIRuntimeProvider.tsx` | `ScopeNode` identity | independent authority | projection + reverse cleanup proof | WB-201, WB-303 | active |
| panel layout legacy persistence | `LayoutStore` v3 | legacy authority | v2->v3 receipt + canonical-only write | WB-214, WB-215 | active |
| manual app-page lazy imports/routes in `router.tsx` | app-page catalog | route authority | compatibility manifests + route parity + zero manual new family | WB-601, WB-602, WB-606 | active |
| `IntelligenceTabProviders` tab composition | analysis surface scope adapter | provider authority | duplicate-tab isolation + consumer ledger | WB-503 | active |

## Row update contract

각 migration PR은 대상 row에 아래를 추가하거나 receipt에서 연결한다.

- exact remaining consumer paths/count
- legacy read 여부와 canonical write 여부
- zero-consumer/static proof command
- rollback path
- removal commit/PR

`removed`는 symbol 삭제만 뜻하지 않는다. current HEAD에서 remaining consumer 0과 replacement proof가 모두 있어야 한다.
