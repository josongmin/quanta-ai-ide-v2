# WBT-09 — Proof receipts and campaign closeout

- status: `ACTIVE_CROSS_CUTTING`
- covers: `WB-901..904`
- goal: 구현, 검증, migration debt, Git identity를 분리해 모든 완료 주장을 재현 가능하게 만든다.
- applies to: WBT-00..08의 모든 WB leaf
- final dependency: WBT-08 receipt

## 변경 범위

write set:

- 각 PR 본문의 completion report
- `00-ticket-status-board.md`
- `LEGACY_REMOVAL_LEDGER.md`
- CI/local proof artifacts
- 필요 시 milestone closeout 문서

non-goals:

- owner implementation 대신 문서로 완료 처리
- 과거/다른 HEAD receipt 재사용
- 실패/skip/zero-test를 green으로 정규화

## Leaf tickets

### WB-901 — Owner-local receipt

모든 WB leaf에 적용한다.

DoD:

- [ ] ticket/branch/PR/HEAD/worktree identity가 있다.
- [ ] RED command, expected cause, observed cause가 있다.
- [ ] GREEN exact command, exit code, test count/result가 있다.
- [ ] changed/non-goal/residual/unlocked ticket이 있다.
- [ ] artifact/fixture/seed 경로가 있다.

실패 조건:

- HEAD 불일치
- zero-test/skip
- exit code 누락
- dirty overlap 미기록
- test file 존재만으로 green 주장

### WB-902 — Milestone full verification

적용 시점:

- P0/P1 contract foundation 종료
- P2/P3 kernel+host 종료
- P4/P5/P6 migration/reference/DX 종료
- P7 admission 종료

DoD:

- [ ] owner-local receipt가 모두 현재 milestone HEAD에 결속됐다.
- [ ] 아래 full rail이 동일 HEAD에서 green이다.
- [ ] pre-existing failure와 introduced failure가 분리돼 있다.

proof:

```bash
pnpm verify
pnpm verify:ui
```

`verify:workbench`가 WBT-07에서 추가된 뒤에는 full rail에 포함한다.

### WB-903 — Tauri/native verification

Tauri/capability/IPC/native host owner를 수정한 leaf에만 적용한다.

DoD:

- [ ] web-only green과 native green을 별도 기록한다.
- [ ] capability allowlist/IPC schema 변경 receipt가 있다.
- [ ] 아래 rail 또는 승인된 동등 native rail이 green이다.

proof:

```bash
pnpm test:tauri
cargo check --manifest-path src-tauri/Cargo.toml --locked
```

### WB-904 — Legacy removal ledger

대상:

- closed `TabKind`
- central component/icon/provider registry
- legacy routes
- UI command/scope facade
- layout/tab migration reader
- page compatibility manifests

각 row 필수 필드:

| field | meaning |
|---|---|
| legacy owner | 현재 symbol/file |
| canonical owner | 대체 authority |
| remaining consumers | exact path/count |
| read/write mode | legacy-read/canonical-write 여부 |
| removal gate | 어떤 proof 후 삭제하는가 |
| target ticket | 제거 leaf |
| status | active/migration-only/removed |

DoD:

- [ ] adapter마다 remaining consumer와 removal gate가 있다.
- [ ] dual-write row가 0이다.
- [ ] removed row는 static zero-consumer proof가 있다.

## Final campaign DoD

- [ ] WBT-00..08이 status board에서 모두 `DONE`이다.
- [ ] 모든 leaf에 WB-901 receipt가 있다.
- [ ] milestone full rails가 final HEAD에서 green이다.
- [ ] native 변경이 있으면 WB-903이 별도 green이다.
- [ ] legacy removal ledger에 owner 없는 adapter가 0이다.
- [ ] docs status, implementation, proof, Git publication이 별도 항목으로 보고됐다.

## Stop rules

- 문서 checkbox만으로 package를 닫지 않는다.
- local commit을 remote publication으로 보고하지 않는다.
- flaky rerun 1회 성공을 안정적 proof로 승격하지 않는다.
- blocker가 남으면 `PROOF_PENDING` 또는 `BLOCKED`로 유지한다.
