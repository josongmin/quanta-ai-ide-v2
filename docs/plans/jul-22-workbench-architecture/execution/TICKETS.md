# Workbench execution tickets

## 실행 순서

| package | leaf tickets | 목적 |
|---|---|---|
| [`WBT-00`](tickets/WBT-00.md) | `WB-001..004` | 신규 구조 부채 유입 차단 |
| [`WBT-01`](tickets/WBT-01.md) | `WB-101..104`, `WB-106`, `WB-107`, `WB-105` | React-free contract, compatibility, configuration |
| [`WBT-02`](tickets/WBT-02.md) | `WB-201..205` | scope/registry/command kernel |
| [`WBT-03`](tickets/WBT-03.md) | `WB-211..215` | workspace/context/layout kernel |
| [`WBT-04`](tickets/WBT-04.md) | `WB-301..305` | React host와 기존 UI runtime 단일화 |
| [`WBT-05`](tickets/WBT-05.md) | `WB-401..406` | surface catalog, generic route, tab migration |
| [`WBT-06`](tickets/WBT-06.md) | `WB-501..507` | analysis reference family와 context handoff |
| [`WBT-07`](tickets/WBT-07.md) | `WB-601..606` | app-page catalog와 scaffold DX |
| [`WBT-08`](tickets/WBT-08.md) | `WB-701..704` | host-neutral plugin admission |
| [`WBT-09`](tickets/WBT-09.md) | `WB-901..904` | proof receipt와 campaign closeout |

## PR 규칙

- 기본 단위는 WB leaf 하나다.
- 같은 RED rail과 atomic migration을 공유하는 인접 leaf만 한 PR로 묶을 수 있다.
- 한 PR이 서로 다른 canonical authority를 동시에 만들지 않는다.
- PR 제목: `WB-xxx: <one-line goal>`.
- PR 본문은 `COMPLETION_REPORT_TEMPLATE.md`를 채운다.
- WBT package 체크박스는 leaf receipt 링크가 모두 있을 때만 닫는다.

## 추천 PR cut

| package | cut |
|---|---|
| WBT-00 | `001`; `002+003`; `004` |
| WBT-01 | `101+102`; `103`; `104+106`; `107`; `105` |
| WBT-02 | `201`; `202`; `203+205`; `204` |
| WBT-03 | `211`; `212`; `213`; `214+215` |
| WBT-04 | `301`; `302+303`; `304`; `305` |
| WBT-05 | `401`; `402`; `403`; `404+405`; `406` |
| WBT-06 | `501+502`; `503`; `504+505`; `506+507` |
| WBT-07 | `601+606`; `602`; `603`; `604`; `605` |
| WBT-08 | `701`; `702`; `703`; `704` |
| WBT-09 | 각 PR의 `901`; milestone별 `902/903/904` |

PR cut은 merge order이며 병렬 허용을 뜻하지 않는다. 정확한 dependency는
`tickets/TICKET_DEPENDENCY_DAG.md`를 따른다.
