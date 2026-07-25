# WBT-01 — React-free contract, compatibility, configuration

- status: `DONE` (main; see WBT-01-RECEIPT.md)
- covers: `WB-101`, `WB-102`, `WB-103`, `WB-104`, `WB-106`, `WB-107`, `WB-105`
- goal: runtime/framework와 분리된 JSON-safe workbench contract와 admission policy를 고정한다.
- hard dependency: WBT-00 receipt
- unlocks: `WBT-02`

## 변경 범위

write set:

```text
src/shared/workbench/
  contract/
    featureManifest.ts
    surface.ts
    context.ts
    command.ts
    scope.ts
    configuration.ts
    errors.ts
    schemas.ts
    index.ts
    __tests__/**
  index.ts
```

필요 시 `zod`의 기존 dependency를 사용한다. 새 schema runtime을 추가하지 않는다.

non-goals:

- React component/loader/handler 구현
- registry/scope/store 구현
- browser/Tauri API
- persisted settings backend
- extension host

## Contract 불변식

- 모든 외부 입력은 `unknown -> schema parse -> typed DTO`를 거친다.
- metadata/envelope는 JSON round-trip 가능하며 function, symbol, ReactNode를 포함하지 않는다.
- ID는 owner namespace를 포함하고 core namespace는 built-in owner만 사용한다.
- compatibility tuple은 `manifestSchemaVersion`, `engineRange`, `ownerVersion`을 분리한다.
- secret 값은 manifest/config persistence에 들어가지 않고 `SecretStoragePort` reference만 사용한다.

## Leaf tickets

### WB-101 — Contract primitives

작업:

- manifest/surface/view/context/command/scope/configuration/error 타입을 정의한다.
- mutable runtime object와 DTO를 분리한다.
- reason-coded error union을 exhaustive하게 정의한다.

DoD:

- [ ] contract import graph에 React/DOM/Router/Zustand/Tauri가 0개다.
- [ ] DTO property가 readonly이고 JSON-safe type으로 제한된다.
- [ ] error reason을 boolean/string fallback으로 축약하지 않는다.

### WB-102 — Schema and validators

작업:

- manifest/context/command/config envelope schema와 parser를 추가한다.
- malformed, unknown version, excess payload, missing reference corpus를 고정한다.
- JSON Schema export와 runtime validator가 동일 golden corpus를 사용하게 한다.

DoD:

- [ ] valid corpus가 parse와 JSON round-trip을 통과한다.
- [ ] malformed/unknown/version-skew가 exact reason code로 거부된다.
- [ ] parser가 input object를 mutate하지 않는다.

### WB-103 — Namespace, reference, sensitivity policy

작업:

- duplicate ID, dangling group/view/command reference, reserved namespace를 reject한다.
- sensitivity/durability/capability escalation 규칙을 고정한다.
- context producer가 receiver policy를 낮출 수 없게 한다.

DoD:

- [ ] validate-all에서 오류 하나라도 있으면 accepted result가 없다.
- [ ] sensitivity downgrade와 durable-secret 조합이 reject된다.
- [ ] manifest input order가 verdict를 바꾸지 않는다.

### WB-104 — Public boundary

작업:

- `contract/index.ts`와 `shared/workbench/index.ts`의 public export만 허용한다.
- internal schema/helper deep import fixture를 실패시킨다.
- type-only consumer fixture를 제공한다.

DoD:

- [ ] public consumer typecheck가 green이다.
- [ ] deep import fixture가 fail-new rule로 red다.
- [ ] barrel cycle이 없다.

### WB-106 — Host compatibility policy

작업:

- host engine version과 schema support matrix를 한 policy로 정의한다.
- owner upgrade/downgrade verdict와 error detail을 고정한다.
- unsupported future schema는 permissive parse하지 않는다.

DoD:

- [ ] engine-range mismatch, schema skew, owner downgrade가 구분된다.
- [ ] compatibility 판정이 locale/time/order에 무관하게 deterministic하다.
- [ ] same input의 built-in/external validator verdict가 동일하다.

### WB-107 — Configuration and secret contract

작업:

- `SettingContribution`, `ConfigurationRegistry`, `ConfigurationService`, `SecretStoragePort`를 정의한다.
- precedence를 `default < user < workspace < folder`로 고정한다.
- trust/capability, scope, migration, secret reference 정책을 정의한다.

DoD:

- [ ] precedence matrix 전 조합이 테스트된다.
- [ ] untrusted owner의 restricted setting 기여가 reject된다.
- [ ] secret plaintext persistence/serialization이 reject된다.
- [ ] unknown/deleted setting migration은 typed result를 낸다.

### WB-105 — Contract CI owner rail

작업:

- contract suite를 fast owner-local script/CI에 연결한다.
- test discovery가 0이면 실패하도록 한다.

DoD:

- [ ] exact suite와 test count가 receipt에 남는다.
- [ ] WBT-00 architecture rail 뒤, full build 앞에서 실행된다.

proof:

```bash
pnpm exec vitest run src/shared/workbench/contract
pnpm typecheck
pnpm lint:strict
pnpm ui-infra:audit
```

## Package DoD

- [ ] WB-101..107/105 모두 receipt가 있다.
- [ ] contract/core forbidden import count가 0이다.
- [ ] golden corpus가 runtime parser와 JSON Schema에서 동일 verdict를 낸다.
- [ ] WBT-02가 runtime 세부 타입을 재정의하지 않고 이 public contract만 소비할 수 있다.

## Stop / rollback

- schema와 TypeScript 타입이 서로 다른 source of truth가 되면 중단한다.
- UI 편의를 위해 contract에 component/loader/callback을 넣어야 하면 activation adapter로 라우팅한다.
- compatibility를 unknown-field ignore나 best-effort fallback으로 풀지 않는다.
