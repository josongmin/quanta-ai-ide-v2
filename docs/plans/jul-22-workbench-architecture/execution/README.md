# Workbench architecture execution packet

이 디렉터리는 `../readme.md`의 구현 실행 SSOT다.

권위는 다음처럼 분리한다.

| 질문 | 권위 |
|---|---|
| 왜 이 구조인가 / 최종 계약은 무엇인가 | `../readme.md` |
| 어떤 작업이 남았는가 | `TICKETS.md` |
| 지금 무엇이 READY/DONE인가 | `tickets/00-ticket-status-board.md` |
| 무엇이 무엇을 막는가 | `tickets/TICKET_DEPENDENCY_DAG.md` |
| 작업자는 어디서 시작하는가 | `tickets/WORKER_START_HERE.md` |
| 현재/목표 owner seam은 어디인가 | `tickets/SOURCE_TRUTH_MAP.md` |
| 어떤 legacy adapter를 언제 지우는가 | `tickets/LEGACY_REMOVAL_LEDGER.md` |
| 개별 작업의 범위와 DoD는 무엇인가 | `tickets/WBT-00.md` … `tickets/WBT-09.md` |

## ID 체계

- `WBT-xx`: owner seam 기준 실행 패킷이다. 여러 PR에 걸칠 수 있는 aggregate 상태를 가진다.
- `WB-xxx`: PR-sized leaf ticket이다. 실제 issue/branch/PR 제목은 이 ID를 사용한다.
- WBT 완료는 포함한 모든 WB leaf가 현재 HEAD 증거와 함께 완료된 경우에만 가능하다.

## 완료의 의미

`DONE`은 아래 네 조건을 모두 만족한다.

1. 코드/문서 변경이 ticket write set 안에 있다.
2. ticket의 owner-local RED rail이 변경 전 실패 원인을 재현하고 변경 후 통과한다.
3. 요구된 integration/full rail이 현재 HEAD에서 통과한다.
4. `COMPLETION_REPORT_TEMPLATE.md` 형식의 receipt가 PR 또는 후속 closeout 문서에 남는다.

문서 작성, 타입 추가, 테스트 파일 존재, 로컬 커밋 중 하나만으로는 `DONE`이 아니다.

## 전역 불변식

- compatibility는 `legacy read -> canonical port` 단방향만 허용한다. dual-write는 금지한다.
- 새 surface/page 추가 때문에 root router, `AppShell`, closed tab union을 수정하면 실패다.
- family 간 React Context/store 직접 import와 global selection fallback은 금지한다.
- contract/core는 React, DOM, Router, Zustand, Tauri에 의존하지 않는다.
- registry materialization은 validate-all 후 atomic commit한다.
- scope cleanup은 child-first, idempotent이고 owner resource를 남기지 않는다.
- extension host/VSIX/webview runtime은 WBT-08 admission 전 구현하지 않는다.

## 현재 기준점

- snapshot date: `2026-07-25`
- inspected HEAD: `dc551ce8450374d8007dfb379835d23817ca4467`
- 상태는 worktree 변화에 따라 drift할 수 있으므로 작업 시작 시 status board를 다시 검증한다.
- 현재 worktree에는 관련 owner 파일의 미커밋 변경이 있다. worker는 덮어쓰지 말고 자기 변경과 기존 diff를 분리한다.
