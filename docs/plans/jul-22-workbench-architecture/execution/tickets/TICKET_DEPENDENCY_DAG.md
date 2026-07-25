# Workbench ticket dependency DAG

```text
WBT-00 guardrails
  -> WBT-01 contracts
      -> WBT-02 scope/registry/command
          -> WBT-03 workspace/context/layout
              -> WBT-04 React host/runtime convergence
                  -> WBT-05 surface/route/tab migration
                      +-> WBT-06 analysis reference family --+
                      +-> WBT-07 app-page catalog/DX --------+-> WBT-08 plugin admission

WBT-09 receipt/closeout applies to every leaf and closes after WBT-08.
```

## Package admission

| package | hard predecessor | admission evidence |
|---|---|---|
| WBT-00 | 없음 | live baseline과 invalid fixture RED |
| WBT-01 | WBT-00 | fail-new import/switch/provider rules green |
| WBT-02 | WBT-01 | public contract/schema suite green |
| WBT-03 | WBT-02 | ScopeNode, registry, command public API green |
| WBT-04 | WBT-03 | context/layout/lifecycle suite green |
| WBT-05 | WBT-04 | React host lifecycle와 canonical UI authority green |
| WBT-06 | WBT-05 | generic route/tab migration receipt |
| WBT-07 | WBT-05 | atomic built-in surface catalog receipt |
| WBT-08 | WBT-06 + WBT-07 | reference family와 scaffold proof 모두 green |
| WBT-09 final | WBT-08 | 모든 package receipt와 legacy ledger |

## 병렬화

허용:

- WBT-02 구현 중 WBT-03의 corpus/fixture 설계
- WBT-05 완료 후 WBT-06 receiver inventory와 WBT-07 page inventory
- WBT-06과 WBT-07의 구현은 write set이 겹치지 않을 때만 병렬
- WBT-09 receipt 작성은 모든 leaf PR과 병렬

금지:

- WBT-02/WBT-03에서 `ScopeNode`, public exports, error taxonomy 동시 수정
- WBT-04/WBT-05에서 runtime authority와 tab/router migration 동시 수정
- WBT-05 전에 새 surface를 closed `TabKind`에 추가
- WBT-08 전에 Node extension host, VSIX, Open VSX, webview sandbox 구현

## leaf dependency

```text
001 -> 002,003 -> 004
004 -> 101 -> 102 -> 103 -> 104 -> 106 -> 107 -> 105
105 -> 201 -> 202 -> 203 -> 205
                  \-> 204
201,103 -> 211,212
203,212 -> 213
201 -> 214 -> 215
205,213,215 -> 301 -> 303 -> 304 -> 305
203,301 -> 302
202,301 -> 401 -> 402 -> 403 -> 404 -> 405 -> 406
406 -> 501 -> 502 -> 503 -> 504 -> 505 -> 506 -> 507
401 -> 601 -> 606 -> 602 -> 604
507 -> 603
603,604 -> 605
507,605 -> 701 -> 702 -> 703 -> 704
```

`WB-901`은 모든 leaf의 완료 dependency다. `WB-902..904`는 milestone/campaign closure에 적용한다.
