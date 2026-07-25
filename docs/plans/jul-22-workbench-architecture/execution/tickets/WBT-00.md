# WBT-00 — Architecture guardrail

- status: `DONE` @ the `feat/wbt-00-architecture-guardrail` branch tip (branch feat/wbt-00-architecture-guardrail; see WBT-00-RECEIPT.md)
- covers: `WB-001`, `WB-002`, `WB-003`, `WB-004`
- goal: canonical workbench 구현 전에 신규 shell/router/tab/provider 결합을 fail-new로 차단한다.
- hard dependency: 없음
- unlocks: `WBT-01`

## 현재 사실

- `scripts/ui-infra-audit.mjs`와 `tools/ui-infra-ledger.json`은 존재한다.
- 현재 audit에는 direct dialog/portal/global keydown/magic z-index/headless import 규칙만 있다.
- invalid architecture fixture harness는 없다.
- CI의 UI infrastructure audit는 typecheck/lint/semgrep 뒤에 있어 fast-fail이 아니다.

## 변경 범위

write set:

- `tools/ui-infra-fixtures/**`
- `scripts/ui-infra-audit.mjs`
- `scripts/**/ui-infra-audit*.test.mjs`
- `eslint.config.js`
- `package.json`
- `.github/workflows/ci.yml`

non-goals:

- `src/shared/workbench/**` 생성
- 기존 위반의 대규모 정리
- UI runtime, router, tab migration
- baseline 숫자 증가

## Leaf tickets

### WB-001 — Architecture fixture harness

작업:

- valid fixture와 invalid fixture 3종을 격리된 임시 tree에서 실행한다.
- invalid 종류는 cross-family import, workbench React 역의존, central surface switch/arbitrary Provider다.
- fixture test가 rule ID와 offending path를 확인하게 한다.
- 실제 `src` tree나 사용자 파일을 fixture 실행 중 수정하지 않는다.

DoD:

- [ ] 각 invalid fixture가 정확히 한 기대 rule로 non-zero 종료한다.
- [ ] valid fixture가 zero 종료한다.
- [ ] 누락/깨진 fixture는 test harness 자체가 non-zero 종료한다.
- [ ] 임시 디렉터리는 성공/실패 모두 정리된다.

proof:

```bash
pnpm test:ui-infra-audit
```

### WB-002 — Import boundary rules

작업:

- workspace family 간 직접 import를 차단한다.
- `shared/workbench/contract|core`에서 React/DOM/Router/Zustand/Tauri import를 차단한다.
- public barrel을 우회하는 deep import를 차단한다.
- test/fixture exemption은 exact path로 제한한다.

DoD:

- [ ] invalid/valid fixture 쌍에서 오탐·미탐 0이다.
- [ ] 기존 FSD boundary rule을 약화하지 않는다.
- [ ] 같은 family 내부 import와 contract public import는 허용된다.

proof:

```bash
pnpm lint:strict
pnpm test:ui-infra-audit
```

### WB-003 — Fail-new structural audit

작업:

- closed union/central component switch/arbitrary `Provider?: ComponentType` 신규 유입을 탐지한다.
- baseline은 site/path/count 단위로 유지하고 감소는 자동 허용한다.
- `--update`가 CI나 verify path에서 호출되지 않게 한다.

DoD:

- [ ] 신규 violation 1개가 rule ID/path/count와 함께 실패한다.
- [ ] 기존 violation 감소 후 old baseline이어도 green이다.
- [ ] 같은 count로 다른 site를 바꾸는 substitution을 탐지한다.
- [ ] baseline schema/version 오류는 exit 2로 fail-closed다.

proof:

```bash
pnpm ui-infra:audit
pnpm test:ui-infra-audit
```

### WB-004 — CI fast-fail admission

작업:

- install 직후 architecture fixture/audit job 또는 step을 배치한다.
- typecheck/build/renderer보다 먼저 실패하게 한다.
- 로컬과 CI가 같은 package script를 호출한다.

DoD:

- [ ] invalid fixture를 주입한 CI simulation이 architecture step에서 먼저 실패한다.
- [ ] audit step은 baseline update 권한/명령을 갖지 않는다.
- [ ] 정상 tree에서 기존 web/Tauri jobs를 생략하지 않는다.

proof:

```bash
pnpm test:ui-infra-audit
pnpm ui-infra:audit
pnpm lint:strict
```

## Package DoD

- [ ] WB-001..004 receipt가 현재 HEAD에 결속됐다.
- [ ] 신규 central switch/provider/cross-family import가 fail-new다.
- [ ] ledger 증가 없이 실제 tree가 green이다.
- [ ] status board가 WBT-00 `DONE`, WBT-01 `READY`로 갱신됐다.

## Stop / rollback

- 기존 unrelated violation 때문에 rail이 실패하면 baseline을 갱신하지 말고 별도 pre-existing 항목으로 분리한다.
- fixture가 production path를 수정하거나 audit가 regex count만 비교해 site substitution을 놓치면 중단한다.
- `eslint.config.js`, CI, `package.json`의 현재 미커밋 변경을 덮어써야 하면 owner 확인 전 중단한다.
