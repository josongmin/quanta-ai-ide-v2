# Workbench ticket status board

이 파일만 현재 실행 상태의 권위다. 상세 티켓의 상태 문구, receipt, closeout 서술과
충돌하면 이 파일이 우선한다. (`WBT-09-CLOSEOUT.md` 는 상태 권위가 아니라 시점 서술이다.)

snapshot: `2026-08-11 @ 9dac21d (+ gate-baseline cleanup, 미커밋)` (직전 기준점 `2026-07-28 @ b597404`)

> **2026-08-11 running-app 검증 라운드** — WBT-04/05 를 티켓 지정 proof 게이트로 실측
> 검증했다. 커널 코드 작업(WB-302/303 command·scope 수렴, WB-402 제네릭 라우트,
> WB-404/406 surfaceId-native flip)은 이미 `2b9e097`/`6471301` 에서 완료돼 있었고
> (문서 stale), WB-305 Escape/a11y 레일은 renderer 스펙(`one Escape owner`,
> `modal WCAG A/AA 위반 0`)으로 검증된다. 잔여 red 는 워크벤치 밖 baseline 3파일뿐이었고
> 이번 라운드에서 정리: `chat-agent/{TokensPanel,palette-type}`(import/no-duplicates),
> `shared/lib/__tests__/useAsyncResource.test`(require-await/void-expr) 수정 +
> `me-stage/parts/MeModal`(의도적 me-모달 idiom, settings-kit SSOT) → ui-infra-ledger
> baseline 등록. 이후 전 게이트 green (아래 baseline 표).

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
| `WBT-04` | `DONE` | — | WB-301/304 landed; WB-302/303 수렴완료(`new CommandService()`:0, 병렬 scope tree 없음); WB-305 renderer 검증 | 2026-08-11 running-app 검증 @`9dac21d`: vitest `react`+`ui/runtime` 7/7, `test:renderer` 9/9(Escape owner+WCAG), typecheck/lint:strict/ui-infra:audit exit 0 |
| `WBT-05` | `DONE` | — | catalog+route+migration+alias done; surfaceId-native flip 완료(`6471301`, store "surfaceId is the sole identity, there is no kind"); `centralSurfaceSwitch:0` | 2026-08-11 running-app 검증 @`9dac21d`: vitest `app/workbench`+`workspace-tabs` 35/35, `/w/$workspaceId/$surfaceId` router wired, test:renderer 9/9, build exit 0 |
| `WBT-06` | `READY` | WBT-05 DONE 로 언블록 | generic surface runtime 착수 가능 | — |
| `WBT-07` | `READY` | WBT-05 DONE 로 언블록 | built-in catalog transaction 착수 가능 | — |
| `WBT-08` | `DONE` | — | admission policy/schema/crash-rail + RFC landed @ `070a5f5` | admission 8 + rail 4 tests, RFC(no runtime), full 611/611 |
| `WBT-09` | `ACTIVE_CROSS_CUTTING` | WBT-06/07 + convergence STAGED | 캠페인 closeout ledger | [WBT-09-CLOSEOUT.md](WBT-09-CLOSEOUT.md) — 전 패키지 receipt + legacy removal ledger |

## 현재 게이트 baseline (`9dac21d` + gate-baseline cleanup, 2026-08-11 실측)

| gate | exit | 비고 |
|---|---:|---|
| `pnpm typecheck` | 0 | clean |
| `pnpm exec vitest run src/shared/workbench src/app/workbench src/app/router src/features/workspace-tabs src/shared/ui/runtime` | 0 | WBT-04/05 proof 스코프 전부 green |
| `pnpm ui-infra:audit` | 0 | `centralSurfaceSwitch:0 arbitraryProvider:0 workbenchReactImport:0 crossFamilyImport:0 noHardcodedSurfaceId:0 surfaceRootLocation:0` (MeModal 설계예외는 ledger baseline 등록) |
| `pnpm audit:cross-slice` | 0 | 45 permitted edges |
| `pnpm test:renderer` | 0 | 9/9 (Escape owner + 모달 WCAG A/AA + CSP + theme-tokens) |
| `pnpm build` | 0 | vite build 성공 |
| `pnpm lint:strict` | 0 | **이전 baseline 실패 해소** — `chat-agent/{palette-type,TokensPanel}` 중복 import 병합, `useAsyncResource.test` require-await/void-expr 수정 (2026-08-11). |

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
