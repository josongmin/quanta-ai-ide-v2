# WBT-07 — App-page catalog and scaffold DX

- status: `BLOCKED_BY_WBT-05`
- covers: `WB-601`, `WB-606`, `WB-602..605`
- goal: org/me/public/auth/settings page family를 root router 수동 수정 없이 atomic materialize한다.
- hard dependency: WBT-05 receipt
- unlocks: WBT-08 admission의 scaffold/catalog 조건

## 변경 범위

write set:

```text
src/app/router/appPageCatalog.ts
src/app/router/__tests__/appPageCatalog.test.ts
existing org/me/public/auth compatibility manifest owners
scripts/create-surface.mjs
scripts/create-page-family.mjs
scripts/verify-workbench-scaffolds.mjs
package.json
```

non-goals:

- 기존 page 전체를 `src/pages`로 이동
- workspace task surface와 app-page contract 통합
- runtime plugin page injection
- auth/session authority 재작성

## Catalog 규칙

- page route batch는 validate-all 후 atomic materialize한다.
- route/auth/chrome/owner/provenance를 receipt에 기록한다.
- surface catalog와 page catalog는 별도 registry/contract다.
- generator는 temp output->validate->atomic rename 순서다.

## Leaf tickets

### WB-601 — App-page catalog validation

작업:

- route collision, route shape, auth policy, chrome policy, lazy loader relation을 검증한다.
- deterministic sorted materialization plan을 생성한다.
- loader failure를 typed PageCatalogError로 전달한다.

DoD:

- [ ] collision/invalid auth-chrome/dangling loader가 구분된다.
- [ ] invalid family 하나가 partial route mount를 만들지 않는다.
- [ ] input order와 무관하게 같은 plan/receipt를 만든다.

### WB-606 — Provenance and atomic materialization

작업:

- owner ID, manifest schema/engine/owner version을 materialization receipt에 결속한다.
- prepare/commit/rollback 경계를 구현한다.
- duplicate owner/route와 mid-batch failure rollback을 증명한다.

DoD:

- [ ] partial page catalog가 observer/router에 노출되지 않는다.
- [ ] receipt에 owner/routes/auth/chrome/version/result가 있다.
- [ ] rollback 뒤 route/loader/resource count가 baseline과 같다.

### WB-602 — Existing page compatibility manifests

작업:

- org/me/public/auth-stage loader를 compatibility manifest로 등록한다.
- root router의 기존 동작을 golden navigation fixture로 보존한다.
- manual route/chrome/auth entries를 단계적으로 catalog consumer로 바꾼다.

DoD:

- [ ] URL/auth redirect/chrome behavior가 기존 golden과 같다.
- [ ] compatibility는 legacy-read/canonical-materialize 단방향이다.
- [ ] manual root imports가 감소하고 새 duplicate authority가 없다.
- [ ] adapter consumer/removal ledger가 있다.

### WB-603 — Surface scaffold generator

작업:

- namespaced ID, manifest, activate, Surface, test/story skeleton을 생성한다.
- 충돌/reserved namespace/invalid capability를 write 전에 reject한다.
- WBT-06 reference rails를 생성물에 연결한다.

DoD:

- [ ] temp dir에서 생성/validation 후 atomic rename한다.
- [ ] failure/cancel 뒤 partial file이 0이다.
- [ ] 생성 family가 shell/router/tab union 수정 없이 materialize된다.
- [ ] repeated run이 overwrite하지 않고 typed conflict로 종료된다.

### WB-604 — Page-family scaffold generator

작업:

- org/settings/public/auth family matrix를 생성한다.
- auth/chrome/route 조합을 사전 검증한다.
- manifest/test/loader skeleton을 생성한다.

DoD:

- [ ] valid matrix 전부 catalog materialization을 통과한다.
- [ ] invalid auth/chrome/route 조합은 file write 전에 reject된다.
- [ ] root router manual switch 변경이 0이다.
- [ ] cleanup이 성공/실패 모두 idempotent하다.

### WB-605 — Scaffold verification front door

작업:

- `create:surface`, `create:page-family`, `verify:workbench` package scripts를 제공한다.
- temporary family create->validate->materialize->typecheck->cleanup을 실행한다.
- CI와 local이 같은 front door를 사용한다.

DoD:

- [ ] zero generated artifacts remain after success/failure.
- [ ] zero-shell-change diff check가 포함된다.
- [ ] test discovery 0과 skipped materialization은 실패다.
- [ ] CI receipt가 exact generated IDs와 cleanup result를 기록한다.

proof:

```bash
pnpm exec vitest run src/app/router/__tests__/appPageCatalog.test.ts
pnpm verify:workbench
pnpm typecheck
pnpm lint:strict
pnpm ui-infra:audit
pnpm build
```

## Package DoD

- [ ] 기존 page behavior가 compatibility manifest 경로에서 보존된다.
- [ ] partial catalog mount/partial generated files가 0이다.
- [ ] surface/page family 모두 root shell 수정 없이 scaffold 가능하다.
- [ ] package scripts와 CI front door가 실제 `package.json`에 존재한다.

## Stop / rollback

- 기존 pages의 대량 이동/시각 변경은 별도 migration ticket으로 분리한다.
- root router switch에 새 family를 추가해 generator를 흉내내지 않는다.
- surface/page contract를 하나의 permissive manifest로 합치지 않는다.
