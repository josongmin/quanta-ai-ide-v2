# Worker start here

## 1. 착수 전

```bash
git rev-parse HEAD
git status --short
pnpm ui-infra:audit
pnpm typecheck
```

- `00-ticket-status-board.md`에서 `READY` 또는 `IN_PROGRESS`인 package만 선택한다.
- 상세 WBT 파일에서 다음 미완료 WB leaf 하나를 선택한다.
- write set과 현재 dirty files의 교집합을 확인한다.
- 기존 변경의 소유/의도가 불명확하면 덮어쓰지 말고 blocker로 기록한다.
- baseline failure가 있으면 ticket 변경으로 발생한 실패와 분리한다.

## 2. RED 먼저

- acceptance를 가장 싸고 owner-local한 실패 rail로 고정한다.
- RED는 기대한 reason code/identity/cleanup 위반 때문에 실패해야 한다.
- 단순 compile error, 누락 import, zero-test 실행은 유효한 RED가 아니다.
- random/property test는 seed를 출력하고 실패 corpus를 fixture로 승격한다.

## 3. 변경 규칙

- leaf write set 밖의 변경이 필요하면 현재 leaf를 확장하지 말고 새 blocker/dependency를 기록한다.
- canonical owner가 생긴 뒤 legacy는 adapter로만 읽고 canonical port를 호출한다.
- dual-write, silent fallback, permissive unknown handling은 금지한다.
- error는 empty UI나 boolean이 아니라 reason-coded typed result로 전달한다.
- registration/materialization/migration은 중간 상태를 외부에 노출하지 않는다.

## 4. 검증 순서

1. ticket의 exact owner-local test
2. `pnpm typecheck`
3. `pnpm lint:strict`
4. `pnpm ui-infra:audit`
5. 변경 owner에 해당하는 renderer/build/Tauri rail
6. milestone에서만 `pnpm verify && pnpm verify:ui`

명령이 실제 package script와 다르면 임의로 green 처리하지 말고 ticket 문서와 script를 같은 leaf에서 수정한다.

## 5. 완료 처리

- `COMPLETION_REPORT_TEMPLATE.md`를 채운다.
- receipt에 HEAD, dirty state, exact command, exit code, test count, artifact를 기록한다.
- status board 행에 receipt를 연결한다.
- downstream package를 자동 시작하지 말고 admission evidence를 확인해 `READY`로 바꾼다.

## 절대 금지

- `ui-infra:update`로 신규 위반을 baseline에 흡수
- root router/AppShell/tab union에 새 family를 수동 등록
- family 간 store/Context import
- stale/wrong-workspace context를 current selection으로 대체
- disposed scope의 command/contribution 유지
- 문서나 mock-only test를 runtime 완료 증거로 사용
