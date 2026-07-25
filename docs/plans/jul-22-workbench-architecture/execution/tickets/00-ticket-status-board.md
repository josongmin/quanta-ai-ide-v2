# Workbench ticket status board

이 파일만 현재 실행 상태의 권위다. 상세 티켓의 상태 문구와 충돌하면 이 파일이 우선한다.

snapshot: `2026-07-25 @ dc551ce8450374d8007dfb379835d23817ca4467`

| package | status | blocker | 지금 허용된 작업 | DONE receipt |
|---|---|---|---|---|
| `WBT-00` | `DONE` | — | 완료 | [WBT-00-RECEIPT.md](WBT-00-RECEIPT.md) — `test:ui-infra-audit` 14/14, `ui-infra:audit`/`typecheck`/`lint:strict` exit 0 @ the `feat/wbt-00-architecture-guardrail` branch tip (branch feat/wbt-00-architecture-guardrail) |
| `WBT-01` | `READY` | 없음 | WB-101 RED부터: contract 공개 계약 + schema/manifest 테스트 착수 가능 | — |
| `WBT-02` | `BLOCKED_BY_WBT-01` | canonical contract 없음 | 구현 금지 | — |
| `WBT-03` | `BLOCKED_BY_WBT-02` | ScopeNode/command authority 없음 | fixture 설계만 허용 | — |
| `WBT-04` | `BLOCKED_BY_WBT-03` | kernel lifecycle/context/layout 미완료 | 구현 금지 | — |
| `WBT-05` | `BLOCKED_BY_WBT-04` | SurfaceHost와 UI authority 수렴 미완료 | migration corpus inventory만 허용 | — |
| `WBT-06` | `BLOCKED_BY_WBT-05` | generic surface runtime 없음 | receiver/legacy-provider inventory만 허용 | — |
| `WBT-07` | `BLOCKED_BY_WBT-05` | built-in catalog transaction 없음 | route/page inventory와 fixture 설계만 허용 | — |
| `WBT-08` | `DEFERRED_BY_WBT-06_WBT-07` | P1..P6 proof 미완료 | threat-model 질문 목록만 작성 가능 | — |
| `WBT-09` | `ACTIVE_CROSS_CUTTING` | 각 owner ticket의 proof 필요 | 모든 PR receipt 검증; final closeout은 WBT-08 뒤 | — |

## 상태 전이

```text
BLOCKED/DEFERRED -> READY -> IN_PROGRESS -> PROOF_PENDING -> DONE
                                      \-> BLOCKED
```

- `READY`: predecessor receipt가 있고 owner-local RED rail 착수가 가능하다.
- `IN_PROGRESS`: write set과 RED rail이 실제 branch/worktree에 있다.
- `PROOF_PENDING`: 구현은 있으나 필수 검증 또는 receipt가 없다.
- `DONE`: code + owner proof + required integration proof + receipt가 현재 HEAD에 결속됐다.
- `ACTIVE_CROSS_CUTTING`: 모든 leaf에 적용되며 campaign 종료 전까지 닫지 않는다.

## 상태 갱신 규칙

- 상태 변경 시 date, HEAD, receipt/PR 링크를 같은 행에 기록한다.
- 실패한 rail이 있으면 `DONE`을 유지하지 않는다.
- 다른 worktree/과거 commit의 receipt를 현재 HEAD 증거로 재사용하지 않는다.
- blocker가 해소되면 dependency를 재확인한 뒤 `READY`로만 이동한다. 바로 `DONE`으로 건너뛰지 않는다.
- checkbox나 구현 추정으로 상태를 갱신하지 않는다.
