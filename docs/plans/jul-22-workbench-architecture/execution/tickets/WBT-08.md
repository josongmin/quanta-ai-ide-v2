# WBT-08 — Host-neutral plugin admission boundary

- status: `DONE` (main; schema/admission/rail landed + RFC; L2 impl deferred)
- covers: `WB-701..704`
- goal: extension runtime을 만들기 전에 portable schema, trust/capability/budget, owner cleanup, threat-model admission을 고정한다.
- hard dependency: WBT-06 + WBT-07 receipts
- unlocks: 별도 L2 extension-host campaign

## 변경 범위

write set:

```text
src/shared/workbench/contract/schema-artifacts/**
tools/workbench-schema-golden/**
host-neutral admission policy/test owner
docs/plans/jul-22-workbench-extension-host/**
```

non-goals:

- Node extension host process
- VSIX/Open VSX install
- untrusted code execution
- webview sandbox 구현
- marketplace/update/signing backend

## Admission 불변식

- built-in native loader와 external extension loader는 같은 runtime type으로 위장하지 않는다.
- external metadata는 WBT-01 schema/validator를 통과한 뒤에만 registry transaction 후보가 된다.
- trust/capability/resource budget은 activation 전 결정된다.
- unregister/crash/reload는 owner contribution/scope/context/resource를 일괄 회수한다.

## Leaf tickets

### WB-701 — Portable schema artifact

작업:

- feature/page/context/command/config schema를 versioned artifact로 export한다.
- golden valid/invalid corpus와 expected reason code를 함께 배포한다.
- artifact digest/provenance를 생성한다.

DoD:

- [ ] browser/Node-independent validator가 golden corpus와 동일 verdict를 낸다.
- [ ] artifact version/digest/source contract revision이 receipt에 있다.
- [ ] schema export가 runtime React/Tauri module을 import하지 않는다.

### WB-702 — Trust, capability, resource admission

작업:

- owner trust level, requested/granted capability, surface/page 제한을 정의한다.
- contribution count, context bytes, command/intent rate, activation time budget을 정의한다.
- denial reason과 audit event를 고정한다.

DoD:

- [ ] untrusted top-level/chromeless/privileged contribution이 reject된다.
- [ ] capability escalation과 resource overflow가 activation 전에 reject된다.
- [ ] budget unit/default/override owner가 명시된다.
- [ ] denial이 silent omission이 아니라 typed/auditable result다.

### WB-703 — Owner teardown and crash rail

작업:

- activation transaction에 owner resource ledger를 연결한다.
- unregister/crash/hot-reload/cancel scenario를 fault injection으로 검증한다.
- rollback timeout 시 quarantine 상태를 정의한다.

DoD:

- [ ] contribution/scope/context/command/intent/resource leak이 0이다.
- [ ] partial activation이 catalog에 노출되지 않는다.
- [ ] repeated crash owner가 자동 재활성화 loop를 만들지 않는다.
- [ ] quarantine/retry가 operator-visible receipt를 남긴다.

### WB-704 — L2 extension-host RFC admission

작업:

- process isolation, IPC envelope, permission, signing, install/update/rollback, sandbox 위협 모델을 작성한다.
- Node/web/native host 선택과 built-in/external boundary를 ADR로 결정한다.
- 구현 ticket/DAG는 별도 campaign으로 만든다.

DoD:

- [ ] trust boundaries와 attacker model이 있다.
- [ ] process death/restart/version skew/revocation/rollback scenario가 있다.
- [ ] signing/marketplace/host owner와 운영 책임이 지정된다.
- [ ] RFC 승인 전 runtime 코드 diff가 0이다.

proof:

```bash
pnpm exec vitest run src/shared/workbench
pnpm verify:workbench
pnpm typecheck
pnpm lint:strict
pnpm ui-infra:audit
```

## Package DoD

- [ ] golden corpus/digest가 host-neutral artifact로 재현된다.
- [ ] trust/capability/budget denial이 fail-closed다.
- [ ] all teardown fault scenarios가 zero-leak다.
- [ ] L2 RFC 승인과 별도 implementation board가 있다.

## Stop / rollback

- extension runtime/process를 이 package에서 구현하지 않는다.
- trusted built-in path를 untrusted external path의 proof로 대체하지 않는다.
- threat model/owner/signing 결정 없이 VSIX/Open VSX/webview를 시작하지 않는다.
