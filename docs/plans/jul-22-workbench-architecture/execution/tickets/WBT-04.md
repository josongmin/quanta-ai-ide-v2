# WBT-04 — React host and UI runtime convergence

- status: `BLOCKED_BY_WBT-03`
- covers: `WB-301..305`
- goal: Workbench kernel을 React에 projection하고 기존 UI runtime의 command/scope 권위를 단일화한다.
- hard dependency: WBT-03 receipt
- unlocks: `WBT-05`

## 변경 범위

write set:

```text
src/shared/workbench/react/**
src/shared/ui/runtime/CommandService.ts
src/shared/ui/runtime/UIRuntimeProvider.tsx
src/shared/ui/runtime/types.ts
src/app/providers/AppProviders.tsx
src/widgets/app-shell/AppShell.tsx
```

허용되는 신규 React owner:

```text
WorkbenchRoot.tsx
ScopeProvider.tsx
SurfaceHost.tsx
NativeViewBinding.ts
PartGrid.tsx
ViewStack.tsx
ViewHost.tsx
hooks.ts
```

non-goals:

- surface catalog/route/tab migration
- 새 dialog/menu/overlay framework
- existing feature visual redesign
- DOM ownership을 core로 이동

## Authority 규칙

- `WorkbenchRoot`가 app scope/kernel session을 주입하는 composition root다.
- `UIRuntimeProvider`는 canonical CommandService/ScopeNode를 새로 만들지 않는다.
- DialogService/LayerManager는 UI service로 유지할 수 있으나 owner identity와 cleanup은 ScopeNode를 따른다.
- DOM/native binding은 React adapter에만 있고 contract/core에 역의존하지 않는다.

## Leaf tickets

### WB-301 — React host vertical slice

작업:

- WorkbenchRoot/ScopeProvider/SurfaceHost/ViewHost lifecycle을 구현한다.
- register->activate->mount->hide->show->dispose state machine을 명시한다.
- loading/crash boundary가 sibling surface를 죽이지 않게 한다.

DoD:

- [ ] lifecycle transition invalid order가 typed reject된다.
- [ ] hide/show가 remount 여부 계약을 지킨다.
- [ ] view crash 뒤 owner cleanup과 sibling 생존이 증명된다.
- [ ] StrictMode double-effect에서 resource leak이 0이다.

### WB-302 — Command delegate convergence

작업:

- existing UI CommandService public facade를 canonical command port delegate로 바꾼다.
- 기존 caller API는 compatibility adapter로 유지하고 내부 registration은 canonical owner를 사용한다.

DoD:

- [ ] UI runtime의 canonical `new CommandService()` 생성이 0이다.
- [ ] legacy caller와 new caller가 같은 command registry/scope를 사용한다.
- [ ] duplicate dispatch/dual registration이 0이다.
- [ ] adapter 제거 대상 consumer ledger가 있다.

### WB-303 — Scope projection convergence

작업:

- `UiScopeProvider`가 ScopeNode identity/active state를 projection하게 한다.
- 별도 active/dispose tree를 제거한다.
- Dialog/Layer owner cleanup을 scope disposal에 연결한다.

DoD:

- [ ] scope identity가 provider remount로 임의 재생성되지 않는다.
- [ ] cleanup order가 view->surface->tab->workspace다.
- [ ] layers/dialogs/commands/listeners count가 dispose 뒤 0이다.

### WB-304 — App composition mount

작업:

- AppProviders/AppShell에 WorkbenchRoot와 UIHost를 한 번만 mount한다.
- route change와 workspace switch에서 scope session 경계를 연결한다.

DoD:

- [ ] app root당 WorkbenchRoot/UIHost가 정확히 1개다.
- [ ] route transition이 global keydown/portal host를 중복 등록하지 않는다.
- [ ] workspace switch 뒤 old scope resource가 0이다.

### WB-305 — Interaction/error boundary proof

작업:

- loading/empty/permission/crash surface를 typed state에 연결한다.
- topmost Escape, focus trap/restore, keyboard ownership rail을 추가한다.
- accessibility/renderer fixture를 고정한다.

DoD:

- [ ] topmost dismiss만 실행되고 background command는 차단된다.
- [ ] close/unmount 뒤 이전 focus target 또는 safe fallback으로 복구된다.
- [ ] permission/crash가 blank screen이나 untyped console error가 아니다.
- [ ] renderer와 shared UI regression suite가 green이다.

proof:

```bash
pnpm exec vitest run src/shared/workbench/react src/shared/ui/runtime
pnpm typecheck
pnpm lint:strict
pnpm ui-infra:audit
pnpm test:renderer
pnpm verify:ui
```

## Package DoD

- [ ] command/scope authority가 canonical kernel 하나다.
- [ ] global listener/portal/UIHost mount가 app당 하나다.
- [ ] lifecycle/crash/focus/cleanup receipt가 있다.
- [ ] existing shared UI behavior 회귀가 없다.

## Stop / rollback

- WBT-05 파일을 같은 leaf에서 수정하지 않는다.
- 기존 UI runtime을 유지한 채 새 runtime을 병렬 생성하면 실패다.
- renderer green을 위해 lifecycle error를 swallow하거나 blanket fallback을 추가하지 않는다.
