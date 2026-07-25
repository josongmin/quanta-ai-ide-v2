# WBT-02 — Scope, registry, command kernel

- status: `DONE` (branch feat/wbt-00-architecture-guardrail; see WBT-02-RECEIPT.md)
- covers: `WB-201..205`
- goal: 하나의 immutable scope tree와 atomic contribution/command authority를 구현한다.
- hard dependency: WBT-01 receipt
- unlocks: `WBT-03`

## 변경 범위

write set:

```text
src/shared/workbench/core/
  ScopeNode.ts
  ContributionRegistry.ts
  CommandService.ts
  ContextKeyService.ts
  IntentBus.ts
  index.ts
  __tests__/**
```

non-goals:

- React provider/hooks
- existing `shared/ui/runtime` 변경
- layout/context persistence
- route/tab migration
- host IPC

## Leaf tickets

### WB-201 — Scope lifecycle authority

작업:

- `app -> workspace -> tab -> surface -> view` parent/child identity를 구현한다.
- parent는 생성 후 불변이며 public re-parent API를 제공하지 않는다.
- owner resource/disposable 등록과 child-first teardown을 제공한다.

DoD:

- [ ] child-first dispose order가 deterministic하다.
- [ ] `dispose()`는 재호출해도 side effect가 없다.
- [ ] disposed scope의 register/dispatch가 typed reject된다.
- [ ] child/owner/listener count가 dispose 뒤 0이다.

### WB-202 — Atomic contribution registry

작업:

- validate-all, deterministic order, atomic commit, rollback을 구현한다.
- owner별 contribution index와 unregister를 제공한다.
- observer는 committed snapshot만 본다.

DoD:

- [ ] invalid batch의 partial commit이 0이다.
- [ ] input permutation이 같은 committed snapshot/hash를 만든다.
- [ ] rollback/unregister 뒤 owner contribution이 0이다.
- [ ] duplicate/foreign namespace가 contract reason code로 reject된다.

### WB-203 — Scoped command service

작업:

- command registration/execution을 scope identity와 연결한다.
- admission, typed result, AbortSignal, timeout/defer policy를 구현한다.
- handler throw를 untyped rejection으로 누출하지 않는다.

DoD:

- [ ] inactive/disposed/missing capability scope가 실행되지 않는다.
- [ ] duplicate command resolution order가 deterministic하다.
- [ ] abort/timeout/handler error가 구분된 typed result다.
- [ ] owner dispose 뒤 command count가 0이다.

### WB-204 — Context key projection

작업:

- scope-local key, parent merge, child shadow, dispose restore를 구현한다.
- full when-expression parser/evaluator 입력을 contract에 맞춰 연결한다.
- 화면 payload를 context key에 저장하지 않는다.

DoD:

- [ ] parent update와 local shadow precedence가 테스트된다.
- [ ] child dispose 후 parent projection이 복구된다.
- [ ] unknown key/type mismatch가 fail-closed다.
- [ ] evaluation이 registration order에 무관하다.

### WB-205 — Bounded intent bus

작업:

- addressed/bubble delivery, queue byte/count/TTL, coalesce, cancellation을 구현한다.
- delivery target을 scope identity로 검증한다.
- overflow와 no-listener를 silent drop하지 않는다.

DoD:

- [ ] wrong/disposed scope delivery가 typed reject된다.
- [ ] count/byte/TTL overflow가 reason-coded다.
- [ ] coalesce key가 다른 owner의 event를 합치지 않는다.
- [ ] cancellation/teardown 뒤 pending queue가 0이다.

proof:

```bash
pnpm exec vitest run src/shared/workbench/core
pnpm typecheck
pnpm lint:strict
pnpm audit:cross-slice
pnpm ui-infra:audit
```

## Package DoD

- [ ] ScopeNode가 core lifecycle의 유일한 parent/child authority다.
- [ ] contribution/command/intent resource가 owner dispose로 전부 회수된다.
- [ ] property test는 seed를 출력하고 실패 corpus를 fixture로 보존한다.
- [ ] public exports는 WBT-01 boundary를 우회하지 않는다.

## Stop / rollback

- UI runtime integration이 필요하면 WBT-04까지 defer한다.
- context/layout 저장이 필요하면 WBT-03 owner로 넘긴다.
- partial commit이나 silent drop으로 테스트를 green 처리하면 실패다.
