# Workbench source-truth map

snapshot: `2026-07-25 @ dc551ce8450374d8007dfb379835d23817ca4467`

| concern | current live owner | target canonical owner | migration ticket |
|---|---|---|---|
| tab kinds/metadata | `src/shared/config/workspaceTabs.ts` | `FeatureManifest` + `SurfaceRegistry` | WB-401, WB-403, WB-406 |
| tab React composition | `src/app/router/workspaceTabsRegistry.tsx` | built-in activator + `SurfaceHost` | WB-401, WB-404, WB-405 |
| arbitrary per-tab provider | `src/features/workspace-tabs/model/RegistryContext.tsx` | `ScopeNode` services + activation adapter | WB-303, WB-404, WB-503 |
| tab persistence | `src/features/workspace-tabs/model/store.ts` | canonical surface tab record | WB-403 |
| UI command authority | `src/shared/ui/runtime/CommandService.ts` | `shared/workbench/core/CommandService.ts` | WB-203, WB-302 |
| UI scope identity | `src/shared/ui/runtime/UIRuntimeProvider.tsx` | `ScopeNode` projected by React adapter | WB-201, WB-303 |
| global layer/dialog host | `src/shared/ui/runtime/UIRuntimeProvider.tsx` + shared UI services | one WorkbenchRoot/UIHost with scoped owner cleanup | WB-304, WB-305 |
| workspace routes | `src/app/router/router.tsx` | generic workspace surface route | WB-402, WB-405 |
| app-page routes/loaders | `src/app/router/router.tsx` | `AppPageFamilyManifest` + app-page catalog | WB-601, WB-602, WB-606 |
| analysis provider composition | `src/app/providers/IntelligenceTabProviders.tsx` | analysis surface-scope adapter | WB-502, WB-503 |
| panel layout constants/persistence | `src/shared/lib/panelLayout` consumers and related storage keys | `LayoutStore` v3 | WB-214, WB-215 |
| architecture debt guard | `scripts/ui-infra-audit.mjs`, `tools/ui-infra-ledger.json`, `eslint.config.js` | same owners with architecture fixtures/rules | WB-001..004 |
| extension admission | 없음 | host-neutral schema/trust/budget policy | WB-701..704 |

## Authority read rule

- 작업 시작 시 current owner를 다시 열어 path/symbol이 이동하지 않았는지 확인한다.
- 이 표의 target 파일이 존재한다는 것만으로 authority 전환이 끝난 것이 아니다.
- consumer 전환과 zero-consumer proof 전까지 legacy owner는 `migration-only`다.
- current와 target이 모두 write authority가 되는 기간은 허용하지 않는다.
