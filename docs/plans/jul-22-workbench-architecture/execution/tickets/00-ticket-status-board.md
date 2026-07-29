# Workbench ticket status board

이 파일만 현재 실행 상태의 권위다. 상세 티켓의 상태 문구, receipt, closeout 서술과
충돌하면 이 파일이 우선한다. (`WBT-09-CLOSEOUT.md` 는 상태 권위가 아니라 시점 서술이다.)

snapshot: `2026-07-28 @ b597404` (직전 기준점 `2026-07-25 @ dc551ce` 에서 이동)

> **커널 수렴 주의** — `2b9e097`(2026-07-27) 에서 WBT-02/03가 만든 다중 서비스
> 커널이 삭제되고 scope+keybindings 로 수렴했다. 아래 WBT-02/03 행의 receipt 수치는
> 착수 HEAD 기준 역사적 증거이며 현재 HEAD 파일 존재 증거가 아니다. 단일 delta 근거:
> [`CONVERGENCE.md`](CONVERGENCE.md).

| package | status | blocker | 지금 허용된 작업 | DONE receipt |
|---|---|---|---|---|
| `WBT-00` | `DONE` | — | 완료 | [WBT-00-RECEIPT.md](WBT-00-RECEIPT.md) — `test:ui-infra-audit` 14/14, `ui-infra:audit`/`typecheck`/`lint:strict` exit 0 on `main` |
| `WBT-01` | `DONE` | — | 완료 | [WBT-01-RECEIPT.md](WBT-01-RECEIPT.md) — `test:workbench-contract` 40/40, typecheck/lint:strict/ui-infra:audit exit 0; 헬어딧 0 real defect |
| `WBT-02` | `DONE→SUPERSEDED` | — | 완료 후 `2b9e097`에서 수렴 삭제 | [WBT-02-RECEIPT.md](WBT-02-RECEIPT.md) (역사적, @`fe37c7f`) — core 28/28. **현재 HEAD**: 해당 core 서비스 삭제, command 축은 `react/KeybindingService`. → [CONVERGENCE.md](CONVERGENCE.md) |
| `WBT-03` | `DONE→SUPERSEDED` | — | 완료 후 `2b9e097`에서 수렴 삭제 | [WBT-03-RECEIPT.md](WBT-03-RECEIPT.md) (역사적, @`e930178`) — workbench 89/89. **현재 HEAD**: `SurfaceService` 등 삭제, surface open 축은 `app/router/surfaceRuntime`+`workspaceSurfaceRoute`. → [CONVERGENCE.md](CONVERGENCE.md) |
| `WBT-04` | `IN_PROGRESS` | WB-302/303/305 running-app 검증 필요 (수렴 후 command 축은 KeybindingService) | WB-301+WB-304 landed(react host+composition root=`WorkbenchRoot`); 나머지 staged | [WBT-04-RECEIPT.md](WBT-04-RECEIPT.md) — react host 유지; 현재 HEAD workbench 87/87 green, typecheck 0 |
| `WBT-05` | `IN_PROGRESS` | running-app 검증 필요 (정적 게이트는 완료) | catalog+route+migration+alias done; 컴포넌트 switch 제거 **완료**(`ui-infra:audit centralSurfaceSwitch:8→0`, `arbitraryProvider:0`, `noHardcodedSurfaceId:0` @`b597404`) | [WBT-05-RECEIPT.md](WBT-05-RECEIPT.md) — catalog+route+migration+alias; audit 수치는 현재 HEAD 기준 갱신 |
| `WBT-06` | `BLOCKED_BY_WBT-05` | generic surface runtime 없음 | receiver/legacy-provider inventory만 허용 | — |
| `WBT-07` | `BLOCKED_BY_WBT-05` | built-in catalog transaction 없음 | route/page inventory와 fixture 설계만 허용 | — |
| `WBT-08` | `DONE` | — | admission policy/schema/crash-rail + RFC landed @ `070a5f5` | admission 8 + rail 4 tests, RFC(no runtime), full 611/611 |
| `WBT-09` | `ACTIVE_CROSS_CUTTING` | WBT-06/07 + convergence STAGED | 캠페인 closeout ledger | [WBT-09-CLOSEOUT.md](WBT-09-CLOSEOUT.md) — 전 패키지 receipt + legacy removal ledger |

## 현재 게이트 baseline (`b597404`, 2026-07-28 실측)

| gate | exit | 비고 |
|---|---:|---|
| `pnpm typecheck` | 0 | clean |
| `pnpm exec vitest run src/shared/workbench src/app/workbench src/app/router` | 0 | 87 tests / 12 files |
| `pnpm ui-infra:audit` | 0 | `centralSurfaceSwitch:0 arbitraryProvider:0 workbenchReactImport:0 crossFamilyImport:0 noHardcodedSurfaceId:0 surfaceRootLocation:0` |
| `pnpm audit:cross-slice` | 0 | 45 permitted edges |
| `pnpm lint:strict` | **1** | **campaign 밖 baseline 실패** — `features/chat-agent/{palette-type.ts,TokensPanel.tsx}`(import/no-duplicates) + `shared/lib/__tests__/useAsyncResource.test.tsx`(require-await/void-expr), 최신 P0-4 커밋발. workbench write set 파일은 clean. 캠페인 규칙대로 pre-existing baseline 으로 분리 기록. |

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
