# WBT-06 — Analysis reference family and context handoff

- status: `BLOCKED_BY_WBT-05`
- covers: `WB-501..507`
- goal: 기존 Intelligence 화면을 reference surface로 포팅하고 analysis->coding->review context handoff를 증명한다.
- hard dependency: WBT-05 receipt
- unlocks: WBT-08 admission의 reference-family 조건

## 변경 범위

write set:

```text
src/pages/workspace-analysis/**
src/app/providers/IntelligenceTabProviders.tsx
analysis legacy adapter owner
coding/review context receiver adapter owner
owner-local renderer/e2e fixtures
```

non-goals:

- graph renderer/filter/design rewrite
- 분석 family 대량 분할
- Coding/Review store 재설계
- family 간 Context/store import

## Reference scenario

```text
analysis finding
  -> immutable context handle
  -> coding new/compatible surface reveal
  -> review evidence reveal
  -> source close
  -> target lease remains
  -> final target close
  -> context/scope/resource count 0
```

## Leaf tickets

### WB-501 — Analysis manifest

작업:

- analysis owner/surface/group/view/layout/context acceptance metadata를 선언한다.
- compatibility tuple과 capability/trust 요구를 명시한다.

DoD:

- [ ] manifest는 React/runtime module을 import하지 않는다.
- [ ] all references와 namespace가 contract validator를 통과한다.
- [ ] metadata discovery가 Intelligence chunk를 load하지 않는다.

### WB-502 — Lazy activator and legacy surface binding

작업:

- `activate.ts`에서 native React binding을 등록한다.
- `Surface.tsx`가 기존 IntelligenceLayout을 LegacySurfaceAdapter로 감싼다.
- activator idempotency와 failure cleanup을 구현한다.

DoD:

- [ ] activation 전 runtime import 0이다.
- [ ] concurrent activation이 loader를 1회만 호출한다.
- [ ] load failure/retry/unregister 뒤 contribution/resource leak이 0이다.

### WB-503 — Tab-local provider isolation

작업:

- IntelligenceTabProviders를 surface-scope migration adapter로 제한한다.
- view mode/overlay/stack/runner state owner를 inventory한다.
- instance identity 기반 상태 격리를 고정한다.

DoD:

- [ ] duplicate analysis tabs의 local state가 섞이지 않는다.
- [ ] provider가 app/global singleton authority를 만들지 않는다.
- [ ] remaining provider state마다 canonical target/removal milestone이 있다.

### WB-504 — Analysis context codecs and producer

작업:

- `core.resource`, `core.range`, `quanta.analysis.finding` codec을 구현한다.
- snapshot/resource refs, payload budget, sensitivity를 admission 전에 검증한다.

DoD:

- [ ] codec round-trip과 schema skew corpus가 green이다.
- [ ] mutable graph/finding object를 handle payload로 넘기지 않는다.
- [ ] wrong workspace/stale Facts/over-budget가 구분된 reject다.

### WB-505 — Coding/Review receivers

작업:

- receiver adapter가 accepted context를 canonical reveal command로 변환한다.
- receiver capability/schema/revision compatibility를 명시한다.
- incompatible receiver에서는 새 surface partial creation을 남기지 않는다.

DoD:

- [ ] 다른 family store/React Context import가 0이다.
- [ ] current global selection fallback이 0이다.
- [ ] same handle의 coding/review 해석이 codec contract와 일치한다.
- [ ] unsupported kind/schema가 typed reject된다.

### WB-506 — Cross-family lifecycle E2E

작업:

- happy path와 wrong workspace/stale Facts/unknown schema negative scenario를 자동화한다.
- source/target close 순서와 lease/refcount를 관찰한다.

DoD:

- [ ] analysis->coding->review range/revision identity가 보존된다.
- [ ] mismatch 3종이 expected error surface/reason을 보인다.
- [ ] source close 후 target context가 유효하다.
- [ ] 마지막 target close 뒤 context/resource/listener가 0이다.

### WB-507 — Reference-family zero-shell-change rail

작업:

- analysis family add/remove/re-register/hot-reload 실패 fixture를 만든다.
- shell/router/tab union diff와 leaked owner resources를 검사한다.

DoD:

- [ ] family 변경이 manifest/activate/family owner에 국한된다.
- [ ] unregister/hot-reload failure 뒤 catalog/scope/context leak이 0이다.
- [ ] WBT-07 generator가 재사용할 reference fixture가 문서화된다.

proof:

```bash
pnpm exec vitest run src/pages/workspace-analysis
pnpm typecheck
pnpm lint:strict
pnpm audit:cross-slice
pnpm ui-infra:audit
pnpm test:renderer
```

## Package DoD

- [ ] 실제 기존 Intelligence UI가 canonical surface path에서 동작한다.
- [ ] cross-family handoff는 ContextHandle/command만 사용한다.
- [ ] multi-instance isolation과 teardown zero-leak가 증명된다.
- [ ] reference rail이 신규 analysis family 포팅의 template가 된다.

## Stop / rollback

- visual/state rewrite가 필요해지면 별도 후속 ticket으로 분리한다.
- global selection fallback이나 direct store import로 E2E를 green 처리하지 않는다.
- mock-only receiver proof로 완료하지 않는다.
