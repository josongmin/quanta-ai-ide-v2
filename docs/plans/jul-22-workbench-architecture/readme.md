# RFC: Quanta IDE 워크벤치 아키텍처 (실행 SSOT)

- **Status:** Architecture Accepted / Implementation Gated
- **Date:** 2026-07-22
- **Supersedes:** `docs/workbench-handoff.md` (2026-07-21) 및 후속 "확정형" 초안
- **Scope:** `quanta-ai-ide-v2` 안에 IDE 워크벤치를 신축하는 아키텍처와 마일스톤
- **관련 메모리:** `workbench-architecture`, `quanta-agent-bridge`, `protocols-punchcard-hellaudit-hellgate`

> 이 문서가 설계와 실행 순서의 유일한 SSOT다. `Accepted`는 구현 완료나 production-ready를
> 의미하지 않는다. §12의 G0 admission을 통과하기 전에는 제품 코드의 광범위한 포팅을 시작하지 않는다.
> 이전 handoff/초안에서 "확정형"으로 적힌 그림은
> 아래 §2(프로세스), §3(스코프 인스턴스화), §5(뷰 계약 3종 분리), §6(snapshot identity),
> §7(when parser)에서 **교정**되었으므로 그 부분은 폐기한다.

---

## 0. 결론 한 줄

큰 방향(WorkbenchScope 트리 · ViewHost · 3-plane · shellAdapter · 뷰 포팅)은 유지한다.
단, **별도 게이트웨이 프로세스 제거 · 스코프 인스턴스화 · snapshot identity · 뷰 매니페스트 3종 분리 ·
Surface contribution · snapshot-bound context transfer · full when parser · UI abstraction-first**까지 반영한
이 버전을 진짜 착수 기준으로 삼는다.

### 0.1 이 문서에서 SOTA++가 뜻하는 것

SOTA++는 기능 수나 추상화 계층 수가 아니다. 다음 조건을 동시에 만족하는 상태를 뜻한다.

1. **단일 권위:** wire DTO·프로토콜·snapshot identity를 소비 repo에서 재정의하지 않는다.
2. **결정론:** 등록 순서·scope 해석·layout restore·when 평가가 입력 순서나 타이밍에 흔들리지 않는다.
3. **fail-closed:** version skew, stale response, duplicate contribution, untrusted workspace, fixture/live 혼합을 조용히 허용하지 않는다.
4. **격리:** 뷰·사이드카·확장이 실패해도 커널과 다른 workspace가 생존한다.
5. **관측 가능성:** 모든 경계 호출은 owner/scope/snapshot/request identity와 reason-coded 실패를 남긴다.
6. **증명 가능성:** 각 마일스톤은 정적 계약, owner-local 테스트, 실제 process rail을 분리해 종료한다.
7. **교환 가능성:** 제품 계약은 UI 라이브러리 API와 분리하고, 현재 custom implementation과 향후 headless
   adapter가 동일 behavior contract를 통과해야 한다.

금지되는 완료 표현:

- fixture 화면을 실데이터 통합 완료로 표현
- 타입체크 통과를 process/wire 호환 증명으로 표현
- 과거 green을 현재 binary·현재 protocol 호환 증명으로 재사용
- L2 설계 존재를 VS Code 확장 호환 구현으로 표현
- React Aria/Radix/Base UI 등 범용 primitive 채택 자체를 제품 해자나 UI 플랫폼 완료로 표현

---

## 1. 배경 · 재사용 자산 · 논스코프

### 1.1 왜 리라이트인가
구 데모(`~/Documents/code-new/quanta-ide`, p0-ide-v2, ~297k라인)는 UI는 있으나 뼈대가 없다 —
객관 어딧에서 다음 4개가 file:line으로 확인됨:

1. **데이터 레이어 부재** — entities/*/api 전부 mock.ts, `Editor.tsx`가 `ORCHESTRATOR` 하드코딩이라 탭 눌러도 파일 안 바뀜.
2. **레지스트리 반쪽** — 인스펙터 해석이 `FileInspectorView.tsx`의 27-branch 인라인 + 27개 정적 import(lazy 없음).
3. **셀렉션 모델 부재** — 사이드바→인스펙터 props, 에디터→인스펙터 focusStore 싱글턴, 에디터↔사이드바 연결 없음.
4. **닫힌 플랫폼 계약** — TabApp closed union 캐스팅, ShellEvents emitter 미구현.

### 1.2 이 호스트 repo가 이미 가진 것 (행동 계약 재사용 — 권위 구조는 교정)
객관 어딧 전부 TRUE:
workspace-tabs 크롬(registry+store+테스트), TanStack Router, zustand, better-auth 실배선,
intent 토큰 + GlassCard, verify 파이프라인(typecheck·i18n·semgrep·bundle-budget),
boundaries ESLint(FSD), Tauri 셸.

UI도 greenfield가 아니다. 다음은 폐기하지 않고 새 계약 뒤의 초기 implementation으로 재사용한다.

- `@shared/ui`: Modal/Popover/Drawer/Portal/TabBar/Switch/SegmentedControl/ResizeHandle와 visual primitives
- semantic token과 z-index tier
- workspace-tabs의 다중 instance, pin/dirty/reorder/persistence, mounted LRU와 visibility lifecycle
- control-palette의 deterministic matcher와 recents
- `panelLayout.ts`의 기존 width 값은 새 LayoutStore migration input

여기서 재사용 대상은 **행동과 저장 데이터**다. 현재 `TabKind` closed union, 정적 metadata/icon/component 맵,
수동 route 나열, `TabKindDef.Provider`는 최종 확장 권위가 아니다. 이 네 표면은 §3.7의 `SurfaceRegistry`와
generic surface route로 수렴한다. 따라서 "workspace-tabs를 재사용"한다는 표현은 새 화면을 추가할 때 기존
정적 맵을 계속 늘린다는 뜻이 아니다.

반대로 현재 `useDialogA11y`/직접 portal/global keydown/magic z-index가 feature마다 늘어나는 구조는 새
platform contract로 승격하지 않는다. public facade와 외형은 보존하되 interaction plumbing은 adapter 내부로
수렴한다.

> **정정:** "agent-bridge phase1 완성"은 부정확. 정확히는
> **"chat용 `session.v1` 최소 클라이언트 완성"** — resume/heartbeat/observability는 아직 없음.
> 근거: [client.ts:1](../../../src/shared/agent-bridge/client.ts#L1)

### 1.3 구 repo에서 가져오는 것 (포팅 — 레이아웃은 **안** 가져옴)
| 자산 | 방식 |
|---|---|
| 인스펙터 27패널 뷰 | View 계약으로 포팅. **렌더 JSX는 그대로, 셀렉션 in/out 배선만 교체**(§6.5) |
| canvas-engine / canvas-worker | 패키지째 복사 (순수) |
| canvas-pixi | 복사하되 React 19 peer 문제 있음 → §8 A1 |
| CM6 익스텐션 팩토리 5종 | 패턴 보존·재포장(코드 복사 아님), event out은 인텐트 emit으로 교체 |
| telemetry / proof 라이브러리 | 그대로 (순수) |
| feature-registry **설계** | 설계만 이식, 코드는 새로 |
| e2e 시나리오 | 계승 |

### 1.4 논스코프 (Non-goals)
- free-float 도킹, dockview류 도킹 라이브러리 (글래스/backdrop-filter 충돌로 철회).
- 구 repo의 git-workspace 레이아웃·Terminal/Output 패널(전부 시뮬레이션) — 버림.
- **별도 UDS↔WS 게이트웨이 프로세스** (§2에서 제거).
- L2 확장 호스트(Node 사이드카)는 이 캠페인 밖 — 장기 트랙.
- 기존 UI의 전면 재작성 또는 일괄 React Aria/Radix/Base UI migration.
- 여러 headless UI library를 primitive별로 혼합해 두 개 이상의 focus/portal/keyboard 권위를 만드는 것.
- runtime에서 사용자별로 UI adapter를 선택하는 plugin system. implementation 선택은 build-time이다.

---

## 2. 프로세스 아키텍처 (P0-1, P0-2)

### 2.1 확정 물리 구조 — 게이트웨이 프로세스 없음
`searchd`는 실제로 `AF_UNIX` + length-prefixed CBOR, 16MiB frame cap이다.
근거: [codec.rs:17](../../../../code-new/quanta-index/crates/quanta-index-ipc/src/codec.rs#L17),
[server.rs:13](../../../../code-new/quanta-index/crates/quanta-index-ipc/src/server.rs#L13)

브라우저↔UDS 브릿지를 **별도 프로세스**로 세우면 포트·인증·CSP·재시작·장애 지점을 하나 더 만든다.
대신 **Tauri Rust 호스트가 직접 브로커**한다:

```
React WebView (React 18)
    │  typed Tauri invoke / ordered channel   (ws 직결·global event broadcast 금지)
Tauri Rust host
    ├─ ProcessSupervisor          (공통 process primitive; 정책은 owner별 분리)
    ├─ SearchBroker   ── quanta-index-sdk ── UDS/CBOR ──▶ searchd
    ├─ AgentBroker    ── generated session.v1 codec ────▶ web-daemon
    └─ ExtensionBroker ─────────────────────────────────▶ extension host (L2)
```

- **DevGateway 예외:** 브라우저 단독 개발(Tauri 없이 vite dev)이 필요할 때만 얇은 UDS↔WS
  DevGateway를 둔다. **제품 경로에서는 제외** — 조건부 dev 의존성일 뿐 아키텍처 요소 아님.
- 현재 Tauri 호스트에는 `app_version`/`ping`만 있고 브로커는 **미구현**이다.
  근거: [lib.rs:23-26](../../../src-tauri/src/lib.rs#L23-L26). → M0.5에서 SearchBroker부터 심는다.

### 2.2 wire 권위와 privilege 분리

`SearchBroker`가 CBOR DTO를 복사해서 새로 만들면 안 된다. 현재 `quanta-index`에는 이미
typed `quanta-index-sdk`가 있고 `ReaderClient::repomap_query`를 제공한다. Tauri Rust는 이 SDK의
**고정 버전/고정 source digest**를 소비한다. SDK를 publish하지 않은 상태에서 임시 path copy나
수동 serde mirror로 우회하지 않는다.

searchd는 query/control/ingest 소켓이 분리돼 있다. WebView가 도달 가능한 Tauri command는
**query capability만** 노출한다. control/ingest는 process owner 전용이며 WebView command table과
capability 파일에 등록하지 않는다.

현재 SDK transport는 동기식 one-shot UDS 호출이다. 따라서 `SearchBroker`는 Tauri main thread나
async executor worker에서 이를 직접 실행하지 않고 **전용 bounded blocking pool**로 격리한다.
operation class별 queue cap/deadline을 두고 포화 시 `Busy`를 반환한다. 현재 wire에는 in-flight cancel이
없으므로 `AbortSignal`은 queue admission 또는 UI commit만 취소할 수 있다. 실제 daemon work 취소를
지원한다고 표현하려면 별도 protocol capability와 end-to-end rail이 선행돼야 한다.

`AgentBroker`도 현재 repo의 축약 `session.v1` 타입을 production 권위로 승격하지 않는다.
권위는 `quanta-codeagent-v3/src/ipc/session`이다. M5 전에 다음 중 하나를 upstream에서 확보한다.

- versioned JSON Schema/IDL에서 Rust·TypeScript codec을 생성, 또는
- canonical client package + cross-language golden frame corpus를 배포.

둘 다 없으면 M5는 BLOCKED다. 손으로 Rust protocol mirror를 작성해 green으로 처리하지 않는다.

### 2.3 ProcessSupervisor 상태기계와 배포 권위

공통화 대상은 spawn/stdio capture/termination primitive뿐이다. searchd, agent daemon, extension host는
서로 다른 restart·권한·데이터 정책을 갖는다.

```text
Absent -> Starting -> Handshaking -> Ready -> Degraded -> Stopping -> Stopped
                    \-> Incompatible
Starting/Ready/Degraded -> Crashed -> Backoff -> Starting
```

- exponential backoff + jitter, crash-loop budget, 사용자가 볼 수 있는 terminal failure
- graceful shutdown deadline 뒤 강제 종료, 부모 종료 시 orphan 금지
- stdout/stderr 크기 제한·민감정보 redaction·회전 로그
- app 전용 runtime dir, 소켓/상태 root canonicalization, symlink/path-swap 방어
- runtime dir `0700`, 생성된 UDS socket `0600`을 spawn 직후 검증; 권한이 넓거나 owner가 다르면 연결 금지
- binary version + protocol version + capability manifest handshake
- 번들된 외부 binary의 platform tuple·SHA-256·서명/공급망 provenance 검증

현재 searchd에는 typed SDK와 30초 I/O timeout, 16MiB cap은 있지만 IDE가 소비할 명시적
`DaemonHelloV1 { binaryVersion, protocolVersion, capabilities }`는 확인되지 않았다. G0에서 upstream
owner ticket으로 고정하고 M0.5 rail은 hello 불일치 시 fail-closed해야 한다.
현재 IPC/searchd 코드 감사에서는 socket mode를 `0600`으로 고정하는 rail도 확인하지 못했다. 번들
searchd가 이를 보장하지 않으면 upstream 변경을 M0.5 admission으로 올리고, IDE가 넓은 권한의 socket을
사후 허용하는 방식으로 우회하지 않는다.

### 2.4 지원 플랫폼 결정

- **Phase 1 지원:** macOS Apple Silicon.
- **Linux:** searchd/Tauri package rail이 생길 때까지 개발 지원, release claim 금지.
- **Windows:** searchd가 `std::os::unix`인 현재 구조에서는 미지원. named-pipe transport와 searchd
  Windows artifact가 모두 생기기 전에는 `bundle.targets = all`을 지원 근거로 사용하지 않는다.

지원하지 않는 플랫폼 binary를 생성하는 것과 지원하는 것은 다르다. release matrix와 CI target을
이 결정에 맞춰 명시적으로 제한한다.

### 2.5 프로세스 수 (표현 통일)
이전 문서들이 "사이드카 2개 / 4박스 / 3개+agent-bridge"로 제각각이었다. 확정:

| 단계 | 실제 프로세스 |
|---|---|
| M0.5–M4 | **Tauri 호스트 + searchd** (+ 선택적으로 agent web-daemon) |
| M5 | 위 + agent web-daemon 상시 |
| L2 | 위 + **Node extension host** |

> `agent-bridge`는 **프로세스가 아니다.** 이 저장소 안의 WebSocket 클라이언트 코드다.
> 프로세스는 그 반대편의 `web-daemon`.
> AgentPlane가 remote `wss` endpoint를 사용하면 web-daemon은 로컬 프로세스 수에 포함하지 않는다.
> local-managed/remote-managed topology를 설정에서 명시하고 자동 추론하지 않는다.

---

## 3. 커널 아키텍처 — WorkbenchScope 트리 (P0-3)

### 3.1 스코프는 인스턴스화된다 (workspace/surface 생략 금지)
현재 앱은 **같은 kind 탭을 여러 인스턴스**로 연다(한 워크스페이스가 "coding" 탭 2개 보유 가능).
근거: [store.ts:107-119](../../../src/features/workspace-tabs/model/store.ts#L107-L119)

따라서 스코프 트리는 인스턴스 ID로 계층화한다:

```
app:<appScopeInstanceId>
└─ workspace:<workspaceScopeInstanceId>  [stable workspaceId]
   └─ tab:<tabId>                        [persisted chrome instance]
      └─ surface:<surfaceInstanceId>      [surfaceId]
         └─ view:<viewInstanceId>         [viewId]
```

workspace와 surface를 생략하고 tab 바로 아래에 임의 Provider를 두면 workspace service 공유와 surface 격리를
동시에 표현할 수 없다. `workspaceScopeInstanceId/surfaceInstanceId/viewInstanceId`는 runtime ID이며 persistence
identity가 아니다.

레이아웃 storage key도 `wb:ide` 단일 키면 인스턴스 간 충돌한다. runtime instance ID는
persistence key가 아니다. layout persistence에는 사용자 계정에
저장되는 안정적인 `workspaceId`, persisted `tabId`, manifest의 `surfaceId`를 쓴다:

```
layout:v3:<workspaceId>:<tabId>:<surfaceId>
```

기존 `layout:v2:<workspaceId>:<tabId>:ide`는 built-in IDE surface의 일회성 migration input이다.
runtime scope를 다시 열 때 instance ID가 바뀌어도 layout은 복원돼야 한다.
스코프는 mount 시 `createChild`, unmount 시 자식부터 일괄 dispose한다.

### 3.2 상호 호출 5메커니즘
1. **체인 룩업** — `views.resolve("agent.drawer")`: 로컬→부모. ID는 네임스페이스(`ide.inspector.flow`).
2. **인텐트 버블(위) + 스코프 주소(아래)** — 아래로는 `scope.commands.run("editor.reveal", …)`
   명시 주소. 비활성 scope에 대한 무조건 큐잉은 금지하고 §3.4 lifecycle admission을 따른다.
3. **context key 상속 + 섀도잉** — when 평가는 머지 뷰. 전역 키 디스패치는 루트 1회, 깊은 스코프 우선.
4. **경계 = 커맨드/인텐트/openView만** — 부모 스토어 직접 import 금지(boundaries ESLint 강제).
5. **context handle 전달** — 화면 패밀리 간 파일·심볼·finding·review 컨텍스트는 §3.8의 immutable
   `ContextHandle`로 전달한다. React Context 객체, feature store, 대용량 DTO를 다른 패밀리에 직접 넘기지 않는다.

`ContextKeyService`는 메뉴·명령·뷰의 `when/enablement`를 위한 boolean/string/number scalar projection이다.
선택 데이터, repo graph, 분석 결과를 보관하거나 전송하는 데이터 버스로 사용하지 않는다. 반대로
`ContextStore` payload를 `when` 평가 때 매번 역직렬화하지 않는다.

### 3.3 core 모듈 (정정: 7개, 순수함수 ≠ 전부)
> 이전 "순수함수 5모듈"은 부정확. 나열은 7개이고, 그중 IntentBus·LayoutStore·ContextStore는
> **순수함수가 아니라 React-free stateful core**다. contract/core에는 React 타입·ComponentType·
> 디자인 토큰이 **들어가지 않는다**(그게 들어가면 "React 무관" 경계가 깨짐).

| 모듈 | 성격 | 책임 |
|---|---|---|
| `ScopeNode` | stateful | 트리 생성/dispose, 부모 포인터 |
| `ScopedRegistry` | pure fn | surfaces/views/commands 체인 룩업 해석 |
| `ContextKeyService` | stateful | 부모 머지 + 로컬 섀도잉, 값 스토어 |
| `WhenExpr` (파서/평가) | pure fn | VS Code when 문법 파싱·평가 (§7) |
| `IntentBus` | **React-free stateful** | 버블 + 비활성 스코프 큐잉/flush |
| `LayoutStore` | **React-free stateful** | Part 트리 + 직렬화/복원 + 버전 마이그레이션 |
| `ContextStore` | **React-free stateful** | immutable context envelope, handle, TTL/budget, snapshot admission |

```ts
type PartId = "sidebar" | "editor" | "inspector" | "bottom";
type LayoutNode =
  | { kind: "split"; dir: "row" | "col"; sizes: number[]; children: LayoutNode[] }
  | { kind: "stack"; id: string; viewIds: string[]; activeViewId: string | null };
```

### 3.4 scope lifecycle와 command admission

scope parent는 생성 후 불변이다. 기존 계획의 "scope re-parent 메타모픽"은 제거한다. re-parent는 registry
lookup, context shadowing, disposer ownership을 동시에 바꾸므로 API 자체를 제공하지 않는다.

```text
Created -> Activating -> Active -> Deactivating -> Inactive -> Disposed
```

- 즉시 실행: `Active` scope의 command
- 지연 실행: manifest에서 `deferable: true`인 command만 `Activating` 동안 허용
- 거부: `Inactive/Deactivating/Disposed`, snapshot identity 불일치, queue budget 초과
- queue: item/byte/TTL 상한, `coalesceKey` 기반 latest-wins, AbortSignal 지원
- dispose/workspace 전환 시 queue 전체를 typed cancellation로 종료
- flush는 scope `Ready` barrier 뒤 FIFO. handler 등록 중간에는 실행하지 않음

command 결과는 `CommandResult<T, CommandErrorCode>`로 reason-coded한다. `boolean` 성공값이나 silent drop은
금지한다.

### 3.5 contribution transaction — FeatureManifest v2

새 RFC에서 빠졌던 `FeatureManifest`를 커널의 원자적 기여 단위로 복원한다.

```ts
interface FeatureManifest {
  ownerId: string;
  manifestSchemaVersion: number;
  engineRange: string;               // host workbench contract semver range
  ownerVersion: string;              // built-in family or extension package version
  activationEvents: readonly string[];
  contributes: {
    surfaceGroups?: readonly SurfaceGroupContribution[];
    surfaces?: readonly SurfaceContribution[];
    layoutPresets?: readonly LayoutPresetContribution[];
    contextTypes?: readonly ContextTypeContribution[];
    views?: readonly ViewContribution[];
    commands?: readonly CommandContribution[];
    keybindings?: readonly KeybindingContribution[];
    menus?: readonly MenuContribution[];
    toolbars?: readonly ToolbarContribution[];
    contextMenus?: readonly ContextMenuContribution[];
    editorExtensions?: readonly EditorExtensionContribution[];
    settings?: readonly SettingContribution[];
    statusItems?: readonly StatusItemContribution[];
  };
}

contribute(manifest): Result<Disposable, ContributionError>;
```

- 전체 validate 후 한 번에 commit; 일부 등록 후 실패하는 partial contribution 금지
- duplicate ID는 기본 fail-closed. 명시적 override capability 없이는 shadow 금지
- 정렬은 `(priority, ownerId, contributionId)`로 고정해 import/activation 순서 독립
- disposer는 해당 owner가 기여한 리소스를 역순으로 원자 해제
- 내부 command는 TypeScript command map으로 typed, 확장 command envelope는 schema-versioned JSON
- host는 `manifestSchemaVersion`과 `engineRange`를 activation 전에 검사하고, 스키마 불일치와 engine skew를
  `IncompatibleManifest`로 fail-closed한다. built-in과 extension 모두 owner package version을 `ownerVersion`으로
  따로 노출한다. 하나의 `version` 문자열에 schema/engine/owner 릴리스를 섞지 않는다.
- activation 실패·중복·dispose leak은 ownerId와 함께 관측
- menu/toolbar/context menu는 handler를 직접 소유하지 않고 command ID + when + group/order만 기여
- surface는 직접 Provider tree나 mutable store를 소유하지 않고 default layout·entry view·context 계약만 기여
- surface의 `groupId/entryViewId/defaultLayoutId/context kind`, layout의 view ID, menu의 command ID는 transaction commit 전에
  같은 manifest batch + 이미 committed registry를 대상으로 referential integrity를 검증한다

#### 3.5.1 설정/구성 권위

`SettingContribution`은 placeholder slot으로만 남기지 않는다. IDE급 확장성과 page/family 포팅을 위해
설정 권위를 별도 계약으로 닫는다.

```ts
interface SettingContribution {
  key: string;                       // namespaced. example: "quanta.analysis.maxResults"
  scope: "application" | "workspace" | "folder";
  schemaRef: string;
  defaultValue?: unknown;
  secret: boolean;
  requiresTrust?: boolean;
}
```

- 권위는 `ConfigurationRegistry` + `ConfigurationService` + `SecretStoragePort`로 분리한다.
- precedence는 `default < user < workspace < folder`로 고정하고, family/view-local store가 이를 우회해 shadow config를
  만들지 않는다.
- `secret: true` 설정은 일반 persistence, URL, layout blob, plain JSON export에 저장하지 않는다. host-owned secure
  storage handle만 저장한다.
- `requiresTrust: true` 설정은 restricted workspace에서 read는 가능해도 effectful command/feature enablement에는 바로
  승격되지 않는다. command admission에서 trust를 다시 검사한다.
- route/page/surface manifest는 setting key 존재 여부만 참조할 수 있고, settings payload 원문을 registry metadata에
  싣지 않는다.

### 3.6 react 레이어
`WorkbenchRoot / ScopeProvider / PartGrid / ViewStack / ViewHost`.
ViewHost 파이프라인: `resolve → lazy load → Suspense 스켈레톤 → ErrorBoundary(뷰 죽어도 워크벤치 생존)
→ isActive/isVisible 주입 → keepAlive 정책`.
**shellAdapter는 이 react 레이어에만 존재**한다(§5.2).

현재 `UiScopeProvider`는 Workbench 커널 이전의 bootstrap adapter다. M1부터 `UiOwnerRef`는 `ScopeNode`의
`ownerId/scopeInstanceId/workspaceId/tabId`에서 투영하고, 별도 UI scope tree를 만들지 않는다. Workbench scope
dispose가 UI layer/dialog와 context handle을 함께 정리하는 단일 종료 경로가 된다.

### 3.7 화면 패밀리와 Surface 계약

용어와 권위를 분리한다.

| 개념 | 의미 | 런타임 권위 |
|---|---|---|
| `Family` | analysis/coding/review처럼 함께 개발·테스트·배포하는 패키지 단위 | 런타임 객체 아님 |
| `Surface` | 상단 workspace tab에서 열리는 작업 화면 인스턴스 | `SurfaceRegistry` + `WorkspaceTabsStore` |
| `View` | surface 내부 sidebar/editor/inspector/bottom에 배치되는 패널 | `ViewRegistry` + `LayoutStore` |
| `Route` | surface를 deep-link하는 URL projection | generic surface route |

```ts
type ContextKind = string & { readonly __brand: "ContextKind" };
// reserved core examples: "core.resource", "core.symbol", "core.range"
// namespaced examples: "quanta.analysis.finding", "quanta.review.item"

interface SurfaceGroupContribution {
  id: string;                         // "quanta.analysis"
  title: string;
  order: number;
  when?: string;
}

interface SurfaceContribution {
  id: string;                         // "quanta.analysis.overview"
  title: string;
  groupId: string;                    // registered SurfaceGroup id
  iconId: string;                     // semantic icon registry key
  defaultLayoutId: string;            // versioned layout preset
  entryViewId: string;                // already-contributed View id
  instancePolicy: "singleton" | "multi";
  accepts?: readonly ContextContract[];
  produces?: readonly ContextContract[];
  requiredCapabilities?: readonly string[];
  when?: string;
}

interface LayoutPresetContribution {
  id: string;
  version: number;
  root: LayoutNode;
}

interface ContextContract {
  kind: ContextKind;
  minSchemaVersion: number;
  maxSchemaVersion: number;
  required?: boolean;
}

interface ContextTypeContribution {
  kind: ContextKind;                  // owner namespace required
  schemaVersion: number;
  schemaRef: string;                  // bundled JSON Schema or canonical built-in codec id
  maxBytes: number;
  sensitivity: "public" | "workspace" | "secret-ref";
  durable: boolean;
}
```

- `FeatureManifest`의 contribution metadata는 JSON 직렬화 가능하다. built-in React loader와 command handler는
  manifest 밖의 lazy `activate.ts`가 `NativeViewBinding`/handler binding으로 등록한다.
- context kind와 surface group은 closed union이 아니다. namespaced contribution으로 등록하며 reserved `core.*`
  namespace는 platform owner만 사용할 수 있다. unknown group/kind/schema는 fallback하지 않고 transaction을 거부한다.
- built-in family와 extension 모두 surface를 조립할 때 기존 view/command/menu contribution을 재사용한다.
- 외부 extension의 top-level surface 기여는 `workbench.surface.external` capability와 trust admission 없이는 거부한다.
- surface별 arbitrary React `Provider` 필드는 최종 계약에 두지 않는다. React-local 표시 상태는 view 내부에,
  공유 가능한 상태는 scoped service/port에 둔다. 현재 `TabKindDef.Provider`는 migration adapter로만 유지한다.
- canonical route는 `/w/$workspaceId/$surfaceId` 하나다. `/intelligence`, `/coding` 같은 기존 URL은 built-in
  alias/redirect다. extension마다 Router source를 수정하지 않는다.
- `WorkspaceTabsStore`는 최종적으로 `{ id, workspaceId, surfaceId, contextHandle?, stateVersion, ...chrome }`를 저장한다.
  현재 persisted `kind`는 versioned migration에서 `surfaceId`로 변환하고 원본 blob은 실패 시 quarantine한다.
- manifest discovery/validation은 화면 코드를 activate하지 않는다. 실제 owner activation은
  `onSurface:<id>`, `onView:<id>`, `onCommand:<id>`, `onContext:<kind>` 중 가장 좁은 event에서 수행하고
  wildcard startup activation은 별도 근거가 없으면 금지한다.
- `defaultLayoutId`는 해당 surface 인스턴스에 유효한 persisted layout이 없을 때만 적용한다. manifest reload나
  앱 시작 때 사용자가 수정한 layout을 default로 덮어쓰지 않는다. preset version migration 실패는 quarantine 후
  최소 safe layout으로 복구한다.

```text
discover metadata → validate batch → commit registries → activation event
  → create surface scope → acquire context lease → mount views
  → inactive budget/keepAlive → close → reverse dispose/deactivate
```

새 built-in 화면 패밀리 추가의 허용 diff는 기본적으로 다음에 한정한다.

```text
src/pages/workspace-<family>/manifest.ts     Surface/View/Command contributions
src/pages/workspace-<family>/activate.ts     lazy native view/command bindings; built-in only
src/pages/workspace-<family>/Surface.tsx    family shell, lazy
src/pages/workspace-<family>/views/*         actual views
src/pages/workspace-<family>/ports.ts        explicitly requested capabilities
src/pages/workspace-<family>/context.ts      accepted/produced context codecs
```

`router.tsx`, `AppShell.tsx`, closed `TabKind` union, 중앙 icon/component/provider switch 수정이 필요하면
Surface vertical slice가 완료된 것이 아니다.

#### 3.7.1 일반 App Page Family는 Surface와 분리

모든 페이지를 Workbench Surface로 만들지 않는다.

| 화면 종류 | 예 | 등록 모델 | 외부 extension 허용 |
|---|---|---|---|
| workspace task surface | analysis, coding, review | `SurfaceContribution` | capability-gated |
| authenticated app page | org/workspace/me settings | build-time `AppPageFamilyManifest` | 금지 |
| chromeless page | auth, onboarding, public, error | build-time `AppPageFamilyManifest` | 금지 |
| transient UI | modal, quick input, menu | UI runtime service | surface/page 등록 금지 |

```ts
// app-layer only; React loader를 포함하므로 shared/workbench contract가 아니다.
interface AppPageFamilyManifest {
  id: string;
  ownerId: string;
  manifestSchemaVersion: number;
  engineRange: string;
  ownerVersion: string;
  routes: readonly {
    id: string;
    path: string;
    chrome: "app" | "chromeless";
    auth: "public" | "signed-in" | "org-admin" | "system-admin";
    load: () => Promise<{ default: ComponentType }>;
  }[];
}
```

built-in page/surface manifest는 Vite의 제한된 build-time glob으로 발견하고 ID 순으로 정렬한 뒤 route/ID 충돌을
검증한다. runtime filesystem scan이나 문자열 convention만으로 로드하지 않는다. manifest module은 eager여도
화면 loader는 dynamic import를 유지한다. 이 방식은 file-based router plugin을 채택한다는 뜻이 아니며,
TanStack route 객체를 생성하는 app-layer adapter는 유지한다.

- `AppPageFamilyManifest`도 page-layer용 독립 registry의 원자 입력이다. route batch는 validate-all 후 한 번에
  materialize하며, 일부 route만 mount된 partial catalog를 허용하지 않는다.
- page catalog도 `manifestSchemaVersion`/`engineRange`/`ownerVersion`을 surface 쪽과 같은 의미로 사용한다.
  app pages만 느슨한 호환 정책을 갖는 예외를 두지 않는다.
- route collision 외에도 duplicate `route.id`, 잘못된 `auth`-`chrome` 조합, owner 불일치, loader 누락,
  materialization 중 예외를 typed `PageCatalogError`로 fail-closed한다.
- page family 추가의 허용 diff도 root router의 import/switch 증가가 아니라 family manifest와 route module 추가로
  제한한다. catalog materialization receipt에는 ownerId, routeIds, commit order를 남긴다.

새 org/settings/public family도 자기 디렉터리의 manifest/routes/tests만 추가한다. root router의 import 수동 나열,
`isChromeless` path list, auth switch를 동시에 수정해야 하는 현재 구조는 `AppPageFamilyManifest`로 수렴한다.
route collision, 잘못된 chrome/auth 조합, lazy-load 실패는 catalog build/owner-local route test에서 fail-closed한다.

### 3.8 교차 패밀리 Context Plane

공유 컨텍스트는 "전역 상태를 같이 읽는 것"이 아니라 "권위가 명시된 immutable snapshot을 전달하는 것"이다.

```ts
interface ContextHandle {
  contextId: string;
  kind: ContextKind;
  schemaVersion: number;
  workspaceId: string;
  snapshots: ContextSnapshotSet;
}

interface ContextSnapshotSet {
  revisionId: string;
  search?: SearchSnapshotRef;
  facts?: FactsSnapshotRef;
  dirtyOverlay?: DirtyOverlayRef;
  digest: string;                     // canonical encoding digest, 개별 ref 대체 아님
}

interface ContextEnvelope<TPayload> {
  handle: ContextHandle;
  sourceScopeInstanceId: string;
  createdAt: number;
  expiresAt?: number;
  sensitivity: "public" | "workspace" | "secret-ref";
  lineage?: readonly string[];
  payload: TPayload;                  // bounded, JSON-safe; bulk graph/blob 금지
}
```

권위는 다음처럼 분리한다.

```text
WorkspaceSession       repo/trust/Search/Facts/dirty snapshot identity
DocumentService        open document + documentVersion authority
ScopeFocusModel        tab/view별 active URI, selection, focused symbol
ContextStore           패밀리 간 전달 가능한 immutable envelope/handle
ContextKeyService      위 권위들의 scalar projection for when/enablement
IntentBus              open/reveal/run처럼 한 번 실행되는 행위
```

- `WorkspaceSession`에서 `activeEditorGroupId/activeUri/selection/focusedSymbol`을 제거한다. 다중 tab/view에서
  하나의 workspace-global active selection은 성립하지 않는다. 이 값은 scope별 `ScopeFocusModel`이 소유한다.
- 대용량 분석 결과는 ContextStore에 복사하지 않고 `{ resultId, factsSnapshot, queryDigest }` 같은 immutable
  reference만 넣는다. 실제 데이터는 Facts/Search owner port에서 snapshot 검증 후 읽는다.
- `snapshot.digest`만 비교해 admission하지 않는다. context kind가 요구하는 Search/Facts/dirty ref를 각각
  현재 WorkspaceSession과 비교하고, digest는 canonical serialization/observability용으로만 사용한다.
- `workbench.openSurface({ surfaceId, contextHandle, reuse })`가 유일한 교차 패밀리 진입점이다.
  `reuse`는 `new | active-compatible | singleton` 중 호출자가 명시한다.
- 수신 surface는 manifest의 accepts/version/capability를 admission하고, 불일치·만료·다른 workspace·stale
  snapshot을 `ContextRejected` reason으로 거부한다. 현재 selection으로 조용히 fallback하지 않는다.
- 기본 전달은 immutable snapshot이다. live-follow가 필요하면 별도 `ChannelRef` capability와 owner lifecycle을
  선언한다. 전역 event bus나 Zustand store 공유를 live context로 부르지 않는다.
- URL에는 secret/raw payload를 넣지 않는다. durable deep link는 allowlist된 context type만 별도 codec으로
  직렬화하고, 나머지는 재시작 후 `ContextExpired`로 명시한다.
- context merge는 자동으로 하지 않는다. `replace | fork | link` 정책과 lineage를 명시하고, 서로 다른
  Search/Facts snapshot의 payload를 한 화면에서 live처럼 합치지 않는다.
- `ContextStore.put`과 `acquire`는 scope-owned lease를 반환한다. source scope dispose는 자기 lease만 해제하며,
  target이 이미 acquire한 envelope는 TTL 또는 마지막 lease 해제까지 유지된다. 최대 envelope bytes, workspace
  total bytes, lease count, lineage depth를 admission 전에 검사한다.
- envelope의 sensitivity/maxBytes/durable 정책은 등록된 `ContextTypeContribution`에서 결정한다. producer가
  envelope 필드로 sensitivity를 낮추거나 durable을 임의 승격할 수 없다. `secret-ref`는 opaque host handle만
  허용하고 URL·layout persistence·logs·extension-to-extension forwarding에서 제외한다.

대표 흐름:

```text
Analysis surface
  └─ analysisFinding context 생성(snapshot pinned)
       ├─▶ Coding surface: file/range reveal + agent prompt context
       └─▶ Review surface: finding evidence + revision-bound diff context

각 수신자는 같은 global store를 읽는 대신 handle을 검증하고 자기 scope에 projection한다.
```

### 3.9 상태·Provider 소유권 매트릭스

Provider를 편의상 위로 올리지 않고 실제 수명과 공유 범위에 맞춘다.

| scope | 소유 가능한 상태/서비스 | 금지 |
|---|---|---|
| app | auth, theme, user prefs, root UIHost, global notification projection | repo selection, analysis result |
| workspace | WorkspaceSession, DocumentService, ContextStore, workspace job/notebook index | unkeyed cross-workspace mutable state |
| surface/tab | view mode, graph overlay, inspect stack, surface draft, runner instance | 다른 surface store 직접 import |
| view | hover, accordion, local form draft, render cache | navigation/reveal event persistence |

React Context에는 변경 빈도가 낮은 scope/service/port reference만 둔다. selection, stream, progress, graph result처럼
고빈도 mutable payload를 큰 Context value로 합치지 않고 selector 기반 external-store subscription
(`useSyncExternalStore` adapter) 또는 owner port를 사용한다. 이 규칙으로 한 family의 selection 변경이 다른
family/provider tree 전체를 재렌더하는 것을 막는다.

app-global에서 여러 workspace의 활동을 보여야 하는 Jobs/Notebook은 데이터를 하나로 섞지 않고 모든 record에
`workspaceId`를 강제하는 keyed aggregate view만 제공한다. mutation owner는 여전히 workspace scope다.
현재 `AppProviders`의 unkeyed `InvestigationNotebookProvider`/`JobsProvider`는 multi-workspace authority가 아니라
demo compatibility seam이며, M1.FAMILY에서 workspace-keyed service 또는 workspace provider로 이동한다.

`FilterProviderRoot`의 mount-time mock repo도 WorkspaceSession의 대체 권위가 아니다. M0.5/M4 전까지는
`DemoWorkspaceAdapter`로 이름과 provenance를 명시하고, family가 이를 직접 import하지 않게 한다.

---

## 4. 패널 시스템 (자체 구현)

- 고정 **Part 4개**(sidebar / editor / inspector / bottom) + Part 내 **Stack**. editor part만 split tree.
- dockview 철회 이유: 도킹 라이브러리가 자기 DOM/CSS 강제(글래스 충돌) + drag transform이 backdrop-filter를 죽임.
- 레이아웃 = 순수 데이터 + 순수 함수(addView/moveView/closeView/resize/serialize/restore) + 버전 마이그레이션.
- 숨은 비용(계획서에 명시): **접근성 포커스 관리**(Part 간 roving tabindex, aria)가 split 수학보다 크다.
- restore 입력은 신뢰하지 않는다. `sizes.length === children.length`, 유일한 stack/view ID,
  `activeViewId ∈ viewIds`, 유효한 Part placement, 유한한 size, 최대 depth/node 수를 검증한다.
- migration은 `vN -> vN+1` 단방향 순수 함수다. 실패한 blob은 quarantine하고 최소 default layout으로
  복구하되 원본을 덮어쓰지 않는다.
- `keepAlive`는 권리가 아니라 resource policy다. background CPU 중지, memory budget, LRU eviction,
  visibility lifecycle을 갖추지 못한 뷰는 keepAlive를 받을 수 없다.
- property/fuzz rail로 임의 layout operation sequence 뒤 invariant와 serialize/restore idempotence를 고정한다.

기존 `WorkspaceTabsStore/Host`는 폐기하거나 LayoutStore와 합치지 않는다. 책임 계층은 다음과 같다.

```text
WorkspaceTabsStore                 app-level 작업 탭·URL·pin/dirty·mounted LRU
└─ workspace:<workspaceScopeInstanceId>
   └─ tab:<tabId> scope
      └─ surface:<surfaceInstanceId>
         └─ Workbench LayoutStore  해당 surface의 sidebar/editor/inspector/bottom 배치
```

기존 tab instance ID와 mounted LRU/visibility lifecycle은 재사용한다. Workbench는 각 tab 아래 child scope를
만들고 dispose에 참여할 뿐 app-level tab authority를 복제하지 않는다. workspace-tab association과 surfaceId는
tab record의 canonical field이며 LayoutStore가 복제하지 않는다. 기존 `panelLayout.ts`의 left/right
width는 새 layout schema의 migration input으로 한 번 읽고, 이후 이중 저장하지 않는다.

`ResizeHandle`도 새로 만들지 않는다. 공통 primitive는 pointer/keyboard delta를 `ResizePartIntent`로 emit하고,
유효 범위·layout mutation·persistence는 LayoutStore가 소유한다. feature-local ResizeHandle 구현은 순차 제거한다.

---

## 5. 뷰 계약 — native / tree / webview 3종 분리 (P0-5)

### 5.1 단일 `load(): Promise<ComponentType>`는 RPC 계약과 양립 불가
함수/React 컴포넌트를 매니페스트에 실으면 확장 대면 RPC 직렬화 경계를 깬다.
기여점 metadata를 **3종으로 분리**하고 built-in 실행 코드는 별도 binding으로 둔다:

```ts
type ViewContribution =
  | NativeViewDescriptor     // 우리 1급 React 뷰의 JSON-safe metadata
  | TreeViewContribution     // TreeDataProvider 데이터. JSON 직렬화 가능만
  | WebviewContribution;     // iframe 호스트. JSON 직렬화 가능만

interface NativeViewDescriptor {
  kind: "native";
  id: string;                 // "ide.inspector.flow"
  title: string;
  defaultLocation: PartId;
  when?: string;              // §7 when 식
  order?: number;
  keepAlive?: boolean;        // 기본 unmount, 터미널류만 true
}

// FeatureManifest 밖, built-in activate.ts에서만 등록한다.
interface NativeViewBinding {
  viewId: string;
  load: () => Promise<{ default: ComponentType<ViewProps> }>;
}
// TreeViewContribution / WebviewContribution 은 함수·컴포넌트 없이 JSON-직렬화 필드만.
```

- `native` binding은 우리만의 슈퍼셋(내부 전용). `tree`/`webview`가 VS Code 확장 대면 표면.
- metadata commit과 runtime binding commit은 owner transaction으로 결합한다. binding의 `viewId`가 없는 metadata를
  가리키거나, activation 뒤 required native view binding이 빠지면 해당 owner activation 전체를 rollback한다.
- 확장 대면 표면(command 인자 포함)은 전부 JSON 직렬화 가능해야 한다.
- `TreeViewContribution`은 provider 함수가 아니라 provider handle/RPC id만 운반한다.
- 모든 외부 payload는 경계에서 schemaVersion·ownerId·messageType별로 validate하고 unknown field 정책을
  명시한다. 내부 타입 assertion으로 외부 입력을 통과시키지 않는다.

### 5.2 shellAdapter는 react 레이어에서 주입 (A2 확정)
`shared/workbench`는 repo 내부 코드 import 금지(추출성). 그런데 ViewHost는 글래스/토큰/아이콘이 필요.
→ **주입 모델**: 호스트가 `WorkbenchRoot`에 `shellAdapter`를 prop으로 넘긴다.

```ts
// workbench/react/shellAdapter.ts. 구현(GlassCard, --intent-* 토큰)은 호스트가 채운다.
interface ShellAdapter {
  Surface: ComponentType<{ children: ReactNode }>;   // GlassCard 구현 주입
  Skeleton: ComponentType;
  Icon: ComponentType<{ ref: IconRef }>;
}
```

- **contract/core에는 `ComponentType`·디자인 토큰·React 타입 금지.** shellAdapter 타입조차
  react 레이어(`workbench/react`)에만 둔다. 이걸로 boundaries 규칙이 자기 설계를 물지 않는다.

### 5.3 UI abstraction-first — 제품 계약과 implementation 분리

UI primitive의 외형과 호출 API를 보존하면서 interaction implementation만 교체 가능하게 만든다.
기존 `@shared/ui`를 canonical facade로 승격한다. feature는 이 facade만 import하고
`react-aria-components`, Radix, Base UI,
`react-dom/createPortal`을 직접 import하지 않는다.

```text
Feature / Widget
  -> Quanta UI contract + facade
       -> Custom adapter       (초기 default; 현재 구현 재사용)
       -> Headless adapter     (필요 시 build-time 교체)
  -> Quanta semantic tokens    (visual SSOT; adapter와 독립)
```

초기 default는 **현재 custom implementation**이다. 특정 headless library 채택은 architecture admission이
아니라 primitive별 implementation 결정이다. nested focus/keyboard/a11y rail 실패 또는 자체 유지비가 adapter
도입비보다 커졌다는 증거가 있을 때만 대표 primitive spike와 bundle/behavior diff를 거쳐 교체한다.

렌더링 contract 예시:

```ts
type DialogCloseReason = "escape" | "backdrop" | "action" | "scope-disposed";

interface DialogProps {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement>;
  onClose(reason: DialogCloseReason): void;
}
```

이 타입은 `src/shared/ui/react`에만 존재한다. Workbench `contract/core`나 extension RPC 경계로 React 타입을
올리지 않는다. 기존 `Modal`, `Popover`, `Drawer`, `Switch`, `SegmentedControl`, `TabBar` public surface는
호환 facade의 첫 구현으로 사용하고 소비자 일괄 rewrite를 금지한다.

금지:

- 하나의 거대한 `UIAdapter`/`ViewProps.api` service locator
- 모든 UI를 `<UI kind="dialog" mode="drawer">` 같은 lowest-common-denominator schema로 표현
- facade contract에 특정 library prop/type 노출
- feature가 직접 `createPortal`, dialog focus hook, global keydown, 숫자형 global z-index를 추가
- adapter 두 개를 같은 production bundle에서 runtime 선택

### 5.4 UI runtime services — transient layer와 persistent panel 분리

공통 owner identity:

```ts
interface UiOwnerRef {
  ownerId: string;
  scopeInstanceId: string;
  workspaceId?: string;
  tabId?: string;
}
```

서비스를 하나로 합치지 않는다.

| 서비스 | 권위 | 비고 |
|---|---|---|
| `CommandService` | 실행 가능한 typed 행위 | keybinding/palette/menu가 동일 registry 소비 |
| `MenuService` | command의 위치·when·group/order | handler 직접 소유 금지 |
| `PanelService` | persistent view open/reveal/focus/close/move | LayoutStore transaction으로만 mutation |
| `LayerManager` | transient layer owner/order/lifetime | focus trap 구현은 primitive adapter 책임 |
| `DialogService` | confirm/prompt/wizard/progress 결과 | Promise + typed result, boolean/silent close 금지 |
| `NotificationService` | toast dedupe/priority/timeout/action | owner/scope dispose와 연동 |
| `QuickInputService` | command palette/quick pick/input | scoped CommandService view |
| `WindowService` | Tauri native/auxiliary window | Phase 1은 main window only |

여기서 command 실행 권위는 하나다. 최종 owner는 Workbench kernel의 scoped `CommandService`이며
`FeatureManifest.commands` transaction, lifecycle admission, typed result를 모두 소유한다. `shared/ui`는
keybinding/palette/menu 입력을 이 command port로 전달하고 결과를 표시할 뿐 별도 command registry를 만들지 않는다.
현재 `src/shared/ui/runtime/CommandService.ts`는 M0 이전 bootstrap 구현이며 M0에서 Workbench command port에
delegate하는 compatibility facade로 바꾼다. 두 registry에 같은 command를 이중 등록하는 bridge는 금지한다.

같은 원칙으로 현재 `UiScopeProvider`는 `ScopeNode` identity projection이 되며, WorkbenchScope와 독립적인
active/dispose 트리를 계속 유지하지 않는다. M1 이후 command/layer/dialog/context cleanup은 단일 scope disposer가
역순으로 수행한다.

`LayerManager`는 DOM interaction engine이 아니다. `{ layerId, kind, owner, openedAt }`와 topmost ordering,
scope dispose cleanup만 소유한다. focus/keyboard/ARIA/anchor positioning을 다시 구현하지 않는다.

```text
tooltip < menu < dropdown < drawer < modal < overlay < toast < devtools
```

Phase 1 popup/modal은 main WebView 내부 layer다. detachable panel/auxiliary native window는 `WindowService`
contract와 serializable state transfer, child scope, crash/reopen rail이 생기기 전까지 지원하지 않는다.
패널마다 별도 process/window를 만들지 않는다.

현재 그래프 시각화 상태인 `features/apply-overlay/OverlayProvider`는 UI layer manager가 아니다. 새 runtime은
명칭을 `LayerManager`로 고정하고, 기존 도메인 provider는 장기적으로 `GraphOverlayProvider`로 명확히 해
두 의미를 섞지 않는다.

behavior contract suite는 implementation에 공통 적용한다.

- nested dialog에서 Escape는 topmost 하나만 close
- focus initial/trap/restore, background inert, scroll-lock reference count
- outside click/trigger detach/viewport collision/resize/scroll
- scope/tab dispose 시 owner layer 0, listener/timer/portal leak 0
- command/menu duplicate·when·order 결정론
- mouse 없이 menu/palette/tab/panel resize 가능
- custom adapter와 대체 adapter가 동일 reason-coded 결과를 생성

### 5.5 webview/extension trust boundary (L2 선행 계약)

Node extension host는 별도 프로세스라는 이유만으로 sandbox가 되지 않는다. workspace 파일·network·
child process에 접근 가능한 잠재적 비신뢰 코드 실행 경계다.

- workspace trust 상태를 커널 context key뿐 아니라 command admission에서 다시 검사
- untrusted/restricted mode에서는 code execution, task, debug, workspace-defined executable setting 차단
- webview는 별도 opaque origin + iframe sandbox; `allow-same-origin`/script는 capability별 최소 허용
- per-webview CSP nonce, local resource roots allowlist, navigation/download/window-open 기본 차단
- message schema, origin/source/owner 검증; webview에는 Tauri capability 직접 부여 금지
- extension별 storage/resource root, CPU/memory/crash-loop budget, activation timeout
- install artifact의 publisher/version/digest/signature provenance와 rollback 기록

L2 구현은 이 threat model과 Restricted Mode rail 없이는 시작하지 않는다. "Node sidecar가 떴다"는 호환이나
격리 완료 증거가 아니다.

---

## 6. WorkspaceSession — base snapshot + dirty overlay (P0-4)

### 6.1 repo 하나로는 결과 동일성이 보장 안 됨
실제 RepoMap 요청은 `repo_id + revision_id + manifest_generation`을 요구한다.
근거: [repomap.rs:2785](../../../../code-new/quanta-index/crates/quanta-index-contract/src/repomap.rs#L2785)
따라서 workspace SSOT는 **리비전 고정된 base identity**를 반드시 포함한다. 다만 SearchPlane generation과
FactsPlane producer snapshot은 동일한 카운터가 아니므로 하나의 `manifestGeneration`으로 합치지 않는다.

```ts
type DecimalU64 = string & { readonly __brand: "DecimalU64" };

interface SearchSnapshotRef {
  repoId: string;
  revisionId: string;
  manifestGeneration: DecimalU64;
}

interface FactsSnapshotRef {
  repoId: string;
  revisionId: string;
  producerSnapshotId: string;
  schemaVersion: number;
}

interface DirtyOverlayRef {
  epoch: DecimalU64;
  documentVersions: Readonly<Record<string, number>>; // uri -> TextDocument.version
}

interface WorkspaceSession {
  workspaceId: string;           // persisted identity
  scopeInstanceId: string;       // runtime identity
  searchSnapshot: SearchSnapshotRef;
  factsSnapshot: FactsSnapshotRef | null;
  dirtyOverlay: DirtyOverlayRef | null;
  trust: "restricted" | "trusted";
}
```

열린 문서·editor group·per-document selection은 `DocumentService`/`EditorGroupModel`이 소유한다.
`WorkspaceSession`에 같은 mutable array를 다시 저장해 이중 권위를 만들지 않는다. 두 editor group이 같은
문서를 열 수 있고 각 group selection은 다를 수 있어야 한다. tab/view의 active URI·selection·focused symbol은
§3.8의 `ScopeFocusModel`이 소유하며, 패밀리 간 전달이 필요할 때만 immutable `ContextHandle`을 만든다.

### 6.2 plane별 consistency token + cancellation
```
Search 요청/응답: { requestId, searchSnapshot, payload }
Facts 요청/응답:  { requestId, factsSnapshot, payload }
Agent stream:     { sessionId, turnId, seq, eventId, payload }
```

- Search/Facts token이 현재 session과 호환되지 않으면 폐기하고 stale reason을 관측한다.
- Agent 이벤트는 repo snapshot equality가 아니라 `(sessionId, turnId, monotonic seq)`로 검증한다.
- 모든 request는 `AbortSignal`/cancel command를 가지며 scope dispose·workspace 전환·새 latest-only 요청에서 취소한다.
- transport가 cancel을 지원하지 않아도 UI commit gate에서 late result를 폐기한다.
- `requestId`만 비교하지 않는다. process restart 뒤 ID 재사용을 막기 위해 broker `processEpoch`도 포함한다.

이게 없으면 리비전 전환, searchd restart, agent reconnect 때 이전 결과가 새 화면에 섞인다.

### 6.3 dirty buffer 정책

IDE는 저장된 revision과 편집 중 document가 동시에 존재한다. 이를 생략하면 "현재 화면의 코드"와 분석 결과가
다른데도 live처럼 보이는 치명적 오류가 생긴다.

- 모든 문서는 VS Code/LSP와 같은 monotonic `TextDocument.version`을 가진다.
- SearchPlane가 dirty ingest를 지원하는 범위는 SDK의 `publish_dirty` 경로를 사용하되, WebView에 ingest
  capability를 주지 않고 Rust broker 내부 정책으로만 호출한다.
- dirty 미지원 surface는 `base-only`로 표시하고 결과 envelope에 `coverage: "base" | "overlay"`를 싣는다.
- save/reindex가 새 generation을 활성화할 때까지 old/new result를 혼합하지 않는다.
- focusedSymbol은 `{ uri, range, documentVersion, symbolId? }`를 포함해 텍스트 변경 뒤 stale 여부를 판별한다.

### 6.4 reveal은 상태가 아니라 **명령**
이전 `reveal { line, nonce }`(상태 저장)는 restore·재구독 시 재실행 문제를 만든다.
→ 커맨드로 발행:

```ts
scope.commands.run("editor.reveal", { uri, range, expectedDocumentVersion, requestId });
```
상태 트리에 이벤트를 저장하지 않는다. 직렬화/복원 대상은 레이아웃·열린 파일 목록이지 "reveal 이벤트"가 아니다.

### 6.5 뷰 포팅 = 셀렉션 배선 교체 (준-기계적)
27패널은 렌더 JSX는 거의 그대로 오지만, 입력(`focusStore` 싱글턴 구독)·출력(`focusStore` 직호출)을
scope-local `SelectionPort` 구독 + 인텐트 emit으로 갈아끼워야 한다. CM6 extension event-out도 같은
port/intent 경계를 따른다. → **`useViewSelection(selectionPort)` 어댑터 훅**을 M3에서 확정하고 M6에서
27개에 일괄 적용해 준-기계적으로 만든다. 범용 `props.api` service locator를 포팅 편의 명목으로 만들지 않는다.

패널을 다른 패밀리로 이동할 때는 feature store를 함께 끌고 가지 않는다. 입력은 declared port/context contract,
출력은 typed intent/context producer, 자체 UI 상태는 view-local로 분류한다. 이 세 분류가 안 되는 패널은 포팅 전에
owner를 먼저 분해한다.

---

## 7. when 파서 — full VS Code 정합 (P0-6)

`== / != / =~ / in`만으로는 정합 아님. 최소 지원 범위(참고: VS Code when-clause 공식 문법):

- 동등: `==`, `!=`, **`===`, `!==`**
- 비교: **`>`, `>=`, `<`, `<=`**
- 집합: `in`, **`not in`**
- 정규식: `=~` (**regex flags 및 escaping 처리**)
- 논리/그룹: `&&`, `||`, `!`, **괄호 `( )`**
- **정확한 precedence**, **quoted RHS + whitespace 규칙**

→ when 파서는 M0의 독립 서브태스크로 취급하고 **헬게이트급 테스트 매트릭스**(연산자별 positive/negative,
precedence, quoted/escaped RHS, regex flags)를 붙인다.

자체 테스트만으로 "VS Code 정합"을 선언하지 않는다. 호환 권위는 특정 Code-OSS commit의 context-key
parser/evaluator와 공식 예제 corpus로 고정한다.

- 선택 A: MIT 원문에서 최소 parser/evaluator를 provenance와 함께 추출
- 선택 B: 독립 구현 + pinned Code-OSS evaluator와 differential test
- corpus에는 unknown key, non-boolean truthiness, numeric comparison, object/array `in`, regex flag/escape,
  malformed expression fail-closed를 포함
- 지원하지 않는 upstream 문법은 parse error로 노출하고 false로 조용히 강등하지 않음

어느 선택이든 upstream commit SHA와 차이 목록을 `contract/when/COMPATIBILITY.md`에 기록한다.

---

## 8. 데이터 3플레인 · 결정 · 제약

### 8.1 3플레인
| 플레인 | 소스 | 상태 |
|---|---|---|
| SearchPlane | quanta-index searchd (repomap, symbol) | 실재. pinned SDK via Rust SearchBroker |
| FactsPlane | taint/blast/risk facts | **오늘 fixture, 내일 producer** |
| AgentPlane | quanta-codeagent session.v1 | 현재 repo에는 축약 chat client만 존재; production broker/codec 미구현 |

- **정정:** SearchPlane structural route는 **truthful subset이 live**다. SDK의 `StructuralQueryBuilder`,
  runtime structural E2E, Sourcegraph/native subset proof가 존재한다. 다만 searchd가 source를 tree-sitter로
  파싱하는 구조는 아니다. producer가 publish한 parse tree를 소비하며 unsupported syntax는 typed fail한다.
  M4 기본 UI 범위는 repomap·symbol이고, structural UI는 아래 M4.1 capability gate 뒤에만 연다.
- **정정(P2):** `OwnerDocKind`는 12종 전부 이미 정의됨(7 예약이 아님). 단 `Risk`는 **wire-only 플레이스홀더** —
  producer 데이터 없음. FactsPlane 실데이터는 외부 producer(semantica-codegraph-v2) 로드맵에 인질.

### 8.2 Facts provenance — 무기한 fixture fallback 금지
fixture로 조용히 떨어지지 않는다. 데이터 출처를 **UI에 노출**한다:

```ts
interface FactsResult<T> {
  source: "fixture" | "live";
  snapshot: FactsSnapshotRef;
  producer: { id: string; version: string; inputDigest: string };
  completeness: "complete" | "partial" | "unknown";
  coverage: "base" | "overlay";
  schemaVersion: number;
  data: T;
}
```
뷰는 `source: "fixture"`를 배지/톤으로 표시(사용자가 데모 데이터임을 인지). live 전환은 명시적이다.
`OwnerDocKind` 일치만으로 payload 호환을 주장하지 않는다. 각 facts family는 versioned DTO와 fixture/live
contract parity test를 소유한다. producer unavailable, snapshot mismatch, partial coverage는 서로 다른 typed
상태이며 fixture로 자동 대체하지 않는다.

### 8.3 A1 확정 — React 18 유지 (미결 아님)
> 이전 문서 마지막에 A1/A2가 "미결"로 남아 있던 것은 오기. **둘 다 본문에서 결정됨.**

- 호스트는 **React 18 고정**. 근거: [package.json](../../../package.json) `react ^18.3.1`.
- canvas-pixi는 peer가 React 19인 게 사실.
  근거: [canvas-pixi/package.json:21](../../../../code-new/quanta-ide/libs/canvas-pixi/package.json#L21)
  → **M1과 병렬로 React 18 호환 스파이크**를 수행한다. 먼저 peer range 완화 + typecheck + 실제 WebGL
  mount/unmount/context-loss rail을 시도하고, 실패 근거가 있을 때만 React host binding을 얇게 분리한다.
  iframe/webview 격리는 input/accessibility/texture memory 비용이 크므로 기본 해법이 아니다. 전 트리 19 승격 안 함.
- A2는 §5.2로 확정(shellAdapter 주입).

### 8.4 횡단 제약 (착수 전 인지)
1. **CSP가 ws:/wss:를 허용하지 않음.** 현재 `connect-src 'self' ipc: http://ipc.localhost`.
   근거: [tauri.conf.json:28](../../../src-tauri/tauri.conf.json#L28)
   → AgentPlane를 WebView에서 직접 WebSocket으로 유지하면 **제품 빌드에서 막힘**. §2대로
   **AgentBroker(Tauri 호스트)가 WS를 잡고** WebView는 Tauri channel로 받는 게 정답. (dev는 DevGateway/CSP 완화)
2. **Windows + searchd UDS 충돌.** searchd는 현재 `std::os::unix` 구현.
   → §2.4대로 Phase 1 release는 macOS Apple Silicon만 claim한다.
3. **번들 아이덴티티 리네이밍 누락.** [tauri.conf.json:5](../../../src-tauri/tauri.conf.json#L5) `identifier`가 아직
   `com.sedotfield.demo`, homepage도 sedotfield. → 리네이밍 커밋에 포함해 정리.
4. **WebView secret 금지.** auth token을 query string, injected global, localStorage로 넘기지 않는다.
   broker가 secret을 소유하고 WebView에는 opaque connection/session handle만 노출한다.
5. **Tauri event 남용 금지.** 고빈도 agent/search stream은 ordered channel을 사용한다. global event는
   typed capability·backpressure가 약하므로 상태 broadcast 외에는 사용하지 않는다.

### 8.5 2026-07-22 live 구현 대조 — 의도된 migration seam

아래는 최종 계약과 현재 구현 사이의 실제 차이다. 문서가 구현 완료로 오인하지 않도록 owner milestone을 고정한다.

| 현재 live owner | 현재 상태 | 최종 권위 | 닫는 milestone |
|---|---|---|---|
| `shared/config/workspaceTabs.ts` | closed `TabKind` + metadata/path/order 중복 | `SurfaceRegistry` | M1.FAMILY |
| `app/router/workspaceTabsRegistry.tsx` | icon/component/Provider 중앙 switch | surface/view contributions | M1.FAMILY |
| `app/router/router.tsx` | tab route 수동 나열 + root mock `FilterProvider` | generic surface route + WorkspaceSession port | M1.FAMILY/M4 |
| `shared/ui/runtime/CommandService.ts` | UI-local command registry | Workbench scoped command authority | M0/M1 |
| `UIRuntimeProvider.UiScopeProvider` | Workbench와 별개인 bootstrap active/dispose scope | `ScopeNode` identity projection | M1 |
| `AppProviders` | Notebook/Jobs가 workspace key 없는 app-global provider | workspace owner + keyed aggregate | M1.FAMILY |
| `IntelligenceTabProviders` | mode/overlay/stack/runner를 tab-local로 격리 | surface scope service/legacy adapter | M1.FAMILY/M3 |

이는 두 권위를 영구 유지한다는 결정이 아니다. 각 행은 해당 milestone에서 compatibility adapter를 통해 한 방향으로
수렴한다. adapter가 양쪽 상태를 write하는 dual-write 방식은 금지한다.

---

## 9. 배치 (FSD)

```
src/app/                  루트 스코프 생성 + shellAdapter 주입 + 기존 크롬 어댑터 등록
src/shared/workbench/
  ├─ contract/            Scope·FeatureManifest·Surface/View·ContextHandle·Command·WhenExpr
  │                       (React 타입/토큰/ComponentType 금지, JSON 경계만)
  ├─ core/                ScopedRegistry·WhenExpr(pure) + ScopeNode·ContextKeyService·
  │                       IntentBus·LayoutStore·ContextStore(React-free stateful). 테스트 우선
  └─ react/               WorkbenchRoot·SurfaceHost·PartGrid·ViewStack·ViewHost + shellAdapter 소비
src/shared/ui/
  ├─ contract/            owner/layer/dialog/notification/quick-input typed contract
  ├─ core/                keybinding/menu projection + LayerManager (독립 command registry 금지)
  ├─ react/               UIHost + Dialog/Notification/QuickInput service providers
  ├─ adapters/custom/     현재 interaction implementation 수용
  ├─ primitives/          기존 visual public surface를 source-compatible wrapper로 유지
  └─ testing/             adapter 공통 behavior contract suite
src-tauri/src/workbench/
  ├─ process/             supervisor primitive + owner별 policy
  ├─ search/              pinned quanta-index-sdk를 쓰는 query-only SearchBroker
  └─ agent/               generated/canonical session.v1 codec를 쓰는 AgentBroker
src/pages/workspace-ide/  built-in IDE family manifest + Surface shell/context codecs
src/features/ide-*/       에디터 확장·인스펙터 패널 (View 매니페스트로 기여)
src/pages/workspace-*/    top-level family manifest + Surface shell + context codec/ports
```
규칙: ① workbench는 repo 내부 import 금지(shellAdapter 주입으로 우회)
② feature/widget은 `@shared/ui` facade만 import하고 adapter/library/direct portal 금지
③ IDE 스테이지는 lazy chunk + bundle-budget 별도 예산.
SearchPlane 접점은 Tauri 호스트 어댑터이므로 **별도 `shared/gateway` 프로세스 클라이언트는 두지 않는다**(§2).

현재 `eslint-plugin-boundaries` 설정은 `shared -> shared`를 모두 허용하므로 ①을 자동으로 증명하지 못한다.
`src/shared/workbench/**` 전용 `no-restricted-imports`/boundary rule과 forbidden-import fixture test를 M0에
추가한다. `scripts/audit-cross-slice.mjs`는 report-only라 completion rail로 사용할 수 없다.

②도 별도 lint/Semgrep failing fixture로 증명한다. migration allowlist 밖의 `createPortal`,
`react-aria-components`/Radix/Base UI direct import, feature-local `window.keydown`, 숫자형 global z-index는
신규 diff에서 fail한다. 기존 위반은 파일 단위 ledger로 동결하고 줄어드는 방향만 허용한다.

`ViewProps.api`를 무제한 service locator로 키우지 않는다. 공통 workbench capability와 feature별 port를
분리하고 view manifest가 필요한 capability 목록을 선언한다. 테스트는 최소 권한 fake port만 주입한다.
새 workspace family가 중앙 Router/AppShell/tab union/component switch를 수정하면 CI에서 실패시키는
`surface-no-shell-edit` fixture와 manifest-only reference family를 M1.FAMILY에 둔다.

### 9.1 패밀리 포팅 체크리스트와 생성기

`pnpm create:surface <family>`는 workspace task family를, `pnpm create:page-family <family>`는
org/settings/public/auth family를 생성한다. surface scaffold는 최소 다음을 만든다.

```text
manifest.ts          namespaced ids, layout preset, accepted/produced contexts
activate.ts          NativeViewBinding/command handler lazy activation
Surface.tsx          lazy shell + error/loading/empty/degraded boundaries
views/Overview.tsx   representative view
ports.ts             typed required capabilities
context.ts           versioned codecs and guards
__tests__/            manifest, context admission, dispose, restore tests
Surface.stories.tsx  loading/empty/partial/stale/error/a11y states
```

포팅 PR은 상태를 반드시 네 분류로 제출한다.

| 상태 종류 | owner | 예 |
|---|---|---|
| authoritative shared | workspace/service | snapshot identity, documents, facts result |
| scope shared | ScopeFocusModel/scoped service | active resource, selection, local analysis lens |
| view local | component/store inside view | accordion, hover, draft form |
| transferable | ContextStore envelope | finding→coding/review handoff |

그리고 다음을 증명한다.

1. 입력은 declared context/port만 사용하고 다른 family store import가 0이다.
2. 출력은 command/intent/context producer 중 하나이며 callback tunnel을 만들지 않는다.
3. loading/empty/partial/stale/error/permission-denied가 서로 다른 상태다.
4. hidden/inactive/disposed에서 poll/rAF/listener/process lease가 budget대로 중지·해제된다.
5. duplicate tab은 scope state가 격리되고 transferable context만 명시적으로 공유된다.
6. 추가/삭제가 manifest transaction 하나로 원자적이며 shell/router 수동 정리 항목이 없다.

DX 도구는 manifest JSON Schema/TypeScript validator, registry/context inspector, contribution collision viewer,
scope/resource leak panel, context lineage viewer를 제공한다. hot reload는 기존 contribution을 먼저 dispose한 뒤
새 manifest를 원자 등록하며, 실패하면 마지막 green manifest를 유지한다.

`create:page-family`는 route/chrome/auth matrix와 lazy error boundary test를 생성한다. 두 생성기 모두 중앙
Router/AppShell switch를 수정하지 않으며, generated manifest가 catalog discovery에 실제 materialize되는 테스트를
포함한다.

---

## 10. 실행 계획 — milestone은 기능 목록이 아니라 proof gate

### M0 — contract/kernel admission

**구현:** FeatureManifest transaction, SurfaceContribution/ContextHandle contract, immutable scope tree/lifecycle,
single command authority, typed command result, bounded defer queue, WorkspaceSession refs, ContextStore admission,
layout validator/migration, when compatibility owner, workbench import boundary.

**종료 증거:**

- duplicate/partial contribution, disposed scope dispatch, queue TTL/budget, snapshot cancellation exact RED→GREEN
- context wrong-workspace/stale/expired/schema-skew reject와 handle TTL/byte/ref-count budget RED→GREEN
- registry ordering property test와 layout operation fuzz/serialize round-trip
- pinned Code-OSS corpus differential when test 100% 또는 문서화된 explicit deviation
- `contract/core` React import 0, repo-internal import violation fixture가 lint RED를 실제 생성

### M0.UI — abstraction-first UI platform

**구현:** 현재 `@shared/ui` consumer compatibility inventory/freeze, canonical facade, `UiOwnerRef`, `UIHost`,
React-free `LayerManager`, Workbench command/menu를 소비하는 UI projection, typed Dialog/Notification/QuickInput services,
custom adapter와 공통 behavior contract suite. UI proof toolchain은 Storybook+axe component matrix,
Playwright renderer interaction rail을 기본으로 하고 Tauri native window/menu rail은 WebdriverIO로 분리한다.

현재 audit baseline은 direct dialog 24파일, facade 외 `createPortal` 1파일, global keydown 18파일,
숫자형 global z-index 91건이다. 이는 버그 수가 아니라 migration ledger다. 기존 항목을 한 번에 고치지 않고 신규 증가를
차단한 뒤 facade 내부로 순차 수렴한다.

**migration order:**

1. 기존 `Modal/Popover/Drawer/RowMenu` API를 custom adapter로 감싸 behavior 변경 없이 green
2. AppShell에 `UIHost` 하나를 두고 owner/scope disposal 연동
3. palette가 hardcoded callback이 아니라 scoped CommandService를 소비; 기존 matcher/recents 재사용
4. feature-local direct portal/dialog hook/global shortcut을 ledger에서 순차 제거
5. 필요할 때만 대표 Dialog/Popover/Menu에 headless adapter spike; full migration은 별도 승인

**현재 선행 구현(2026-07-22):**

- `shared/ui/runtime`에 React-free `CommandService`, `LayerManager`, `DialogService`와 React adapter `UIRuntimeProvider` 추가
- app/tab Provider scope를 분리하고 Intelligence duplicate tab의 mode/overlay/inspect/runner 상태 격리
- AppShell settings/help/tokens를 `DialogService`로 이동하고 DOM `querySelector().click()` bridge 제거
- workspace tab mounted LRU를 순수 reconcile 함수 + store subscription으로 변경하고 Router search를 URL 단일 권위로 고정
- direct dialog/portal/global keydown/magic z/headless import를 `tools/ui-infra-ledger.json` fail-new gate로 고정
- Storybook+a11y, Playwright renderer, WebdriverIO Tauri external-driver rail과 CI 위치 추가
- main WebView의 미사용 shell/dialog/os capability 제거; 상세 위협 모델은 `docs/security/ui-runtime-threat-model.md`

이 항목은 M0.UI 전체 완료 선언이 아니다. 현재 scope 분리는 app/tab까지이며 workspace scope는 아직 미구현이다.
기존 ledger 수렴, Menu/Notification/QuickInput의 실제 제품 consumer
이관, workbench scope/PanelService 결합은 각 milestone 종료 증거를 그대로 따른다.

**종료 증거:**

- feature consumer 수정 없이 custom adapter가 기존 component tests 통과
- representative primitive state matrix가 Storybook/Vitest a11y rail에서 green
- nested layer/keyboard/focus/route·scope disposal이 Playwright renderer rail에서 green
- topmost Escape/focus restore/nested scroll-lock/scope-dispose exact RED→GREEN
- duplicate command/menu, when/order, owner disposer의 결정론 property test
- 신규 direct portal/headless-library import/global keydown/magic z-index 위반 fixture가 lint/Semgrep RED
- AppShell에 feature별 `xxxOpen` state·DOM `querySelector().click()` bridge 추가 없이 dialog/quick input 실행
- alternative adapter spike를 했다면 동일 behavior suite와 bundle/interaction budget 통과; 안 했으면 custom 유지

### M0.5 — hermetic process walking skeleton

**구현:** Tauri `ProcessSupervisor` + query-only `SearchBroker` + pinned `quanta-index-sdk` +
`DaemonHelloV1`/capability admission + ordered Tauri channel.

**고정 fixture:** 작은 repo, revision, manifest generation, repomap query, expected response digest를 repo에 둔다.
개발자의 외부 인덱스 상태나 이미 떠 있는 daemon에 의존하지 않는다.

**종료 증거:**

- Tauri -> SDK -> query UDS -> searchd 실제 binary 왕복
- 동기식 SDK 호출은 bounded blocking pool에서만 실행되고, queue 포화 시 `Busy`; WebView/main thread stall 0
- wrong binary/protocol/capability/checksum은 `Incompatible`로 fail-closed
- crash/restart/backoff, startup timeout, request timeout, oversized frame, app shutdown orphan=0
- runtime dir `0700`, socket `0600`, expected owner를 실제 filesystem stat으로 검증
- WebView가 control/ingest capability와 secret을 얻지 못한다는 negative test
- binary source digest와 exact command/fixture receipt 보존

### M1 — React workbench vertical slice

**선행:** M0.UI facade/runtime contract green. 특정 headless library 채택은 선행 조건이 아니다.

**구현:** WorkbenchRoot/PartGrid/ViewStack/ViewHost, native dummy view 3개, shellAdapter, error isolation,
PanelService 연결, keyboard/focus lifecycle. canvas React 18 compatibility spike는 이 단계와 병렬 수행한다.

**종료 증거:** register -> activate -> move -> persist -> restore -> dispose 시나리오, corrupted layout fallback,
view crash isolation/retry, keyboard-only navigation/a11y test, lazy chunk와 별도 IDE bundle budget.

### M1.FAMILY — generic surface와 분석 패밀리 reference slice

**구현:** `SurfaceRegistry`, generic `/w/$workspaceId/$surfaceId` host, legacy route aliases, WorkspaceTabs
`kind -> surfaceId` persistence migration, build-time `AppPageFamilyManifest` catalog, manifest-only reference family,
`create:surface`/`create:page-family` scaffold를 만든다.
현재 Intelligence 화면은 `quanta.analysis.overview` family로 감싸되 기존 JSX와 시각 상태를 바꾸지 않고,
`TabKindDef.Provider`는 `LegacySurfaceAdapter` 안에만 격리한다.

**종료 증거:**

- 새 test family 추가 diff가 family 디렉터리만 변경하고 Router/AppShell/tab union 변경 0
- 새 org/settings test page family가 root Router import/chrome/auth switch 수정 없이 materialize
- `register → open two instances → context handoff → persist → restore → unregister` exact RED→GREEN
- unknown/disabled/untrusted surface deep link가 typed NotAvailable/PermissionDenied로 fail-closed
- legacy `/intelligence`와 canonical surface URL이 같은 surface identity로 수렴하고 history loop 0
- analysis→coding→review context에서 workspace/snapshot/schema mismatch negative cases가 모두 거부
- family 삭제·hot reload 실패 뒤 view/command/context/resource 잔존 0

### M2 — editor consistency slice

**구현:** CM6, DocumentService, EditorGroupModel, monotonic document version, base snapshot + dirty overlay,
file switch/save/reindex/reveal. gutter는 StateField로 재작성한다.

**종료 증거:** 두 editor group의 독립 selection, wrong documentVersion reveal 거부, dirty/base 표시,
save 중 generation 전환의 stale result 폐기, unmount/remount state restore, CM6 extension leak test.

### M3 — inspector contract slice

**구현:** flow/blast/token-radar, `ScopeFocusModel`, `SelectionPort`, context producer/consumer codec,
feature별 최소 capability port, fixture Facts DTO.

**종료 증거:** 세 패널 모두 global store/다른 family Context import 0, fixture provenance visible,
unsupported/partial/stale 상태 분리, selection 왕복·context handoff와 view disposal 뒤 listener/resource 0.

### M4 — real SearchPlane slice

**구현:** repomap sidebar + symbol hover, request coalescing/cancellation, snapshot pin, broker observability.

**종료 증거:** hermetic indexed fixture에서 exact rows, rapid typing latest-only, revision/generation switch,
searchd restart/processEpoch stale discard, timeout/degraded/recovery UI. owner-local mock만으로 종료 금지.

### M4.1 — structural truthful-subset opt-in

제품 UX가 구조검색을 요구할 때만 착수한다. 현재 SDK/runtime의 실제 지원 문법과 producer parse-tree readiness를
capability manifest로 읽고, 지원 행만 UI에 노출한다. searchd가 source를 직접 파싱한다고 표현하지 않는다.

**종료 증거:** SDK structural request 실제 왕복, native/Sourcegraph 지원 subset positive rows, unsupported
typed-error rows, missing/degraded producer capability, revision/generation pin. 기존 runtime rail 이름만 인용하고
현재 bundled binary 왕복 없이 완료 처리하지 않는다.

### M5 — canonical AgentPlane slice

**선행:** canonical schema/generated codec 또는 canonical package + golden corpus. 없으면 BLOCKED.

**구현:** Rust AgentBroker, opaque session handle, ordered channel/backpressure, resume/heartbeat,
tool/diff/approval, timeline. 현재 WebView direct-WS client는 demo adapter로 강등한다.

**종료 증거:** protocol golden parity, seq gap/duplicate/out-of-order/reconnect, resume replay와 snapshot fallback 구분,
approval wrong-id/expired/duplicate fail-closed, large diff flow control, token/credential WebView 노출 0.

### M6 — bulk port + canvas

**구현:** 나머지 패널과 canvas-engine/worker/pixi, GraphSource를 Search/Facts port에 연결.

**종료 증거:** 27패널 inventory 전 행이 `ported | intentionally-dropped | blocked` 중 하나이며 근거 보유,
fixture 직수입 0, React 18 canvas mount/unmount/context-loss, inactive view CPU/memory budget,
bundle/startup/interaction regression budget.

### L2 — extension platform 별도 캠페인

Node/web extension host, activation events, TreeView/webview/commands를 다룬다. 숫자형 "호환 80%" 주장은
근거가 없으므로 삭제한다. workspace trust, webview sandbox/CSP/resource roots, install provenance,
extension resource/crash budgets가 먼저다.

### 10.1 의존 DAG

```text
G0 -> M0 --+--> M0.UI --> M1 -> M1.FAMILY -> M2 -> M3 -> M6
           +--> M0.5 ---+--> M4 -> M4.1 (optional)
           |            +--> M5 (canonical session contract 선행)
           +--> L2 contract campaign
```

M0.UI와 M0.5는 M0 뒤 병렬 가능하다. M1은 M0.UI를 기다리지만 M0.5를 기다리지 않는다. 새 화면 패밀리
대량 추가는 M1.FAMILY를 통과한 뒤에만 시작한다. canvas compatibility spike는 M1과 병렬 가능하다.
M5는 M4 완료를 기다릴 이유가 없고 broker foundation만 공유한다. 기존 27패널 대량 포팅은 M3 contract가
고정되기 전에 시작하지 않는다.

### 10.2 구현 패킷 — 파일·순서·증거

아래 패킷은 구현 티켓과 PR의 최소 단위다. 한 PR이 여러 패킷을 묶어 새 권위와 legacy 권위를 동시에 확장하지
않는다. compatibility adapter는 **legacy read → canonical command/port 호출**만 허용하고 dual-write는 금지한다.
각 패킷은 자기 RED rail을 먼저 추가한 뒤 같은 PR에서 GREEN으로 닫는다.

#### P0 — 현재 권위 동결과 회귀 차단

**수정:**

- `tools/ui-infra-ledger.json`: 현재 direct portal/global keydown/magic z-index baseline만 유지
- `scripts/ui-infra-audit.mjs`: 신규 중앙 tab switch, family 간 store import, 새 arbitrary `Provider` 필드 탐지 추가
- `eslint.config.js`: `src/pages/workspace-*` 사이 직접 import와 `shared/workbench`의 React 역의존 차단
- `.github/workflows/ci.yml`: 아래 owner-local rail을 full build보다 앞에 배치

**추가 fixture:**

- `tools/ui-infra-fixtures/invalid-cross-family-import.fixture`
- `tools/ui-infra-fixtures/invalid-workbench-react-import.fixture`
- `tools/ui-infra-fixtures/invalid-central-surface-switch.fixture`

**종료:** audit fixture harness가 각 fixture를 해당 가상 경로에 주입했을 때 담당 rule이 실패하고, 정상 fixture와
실제 tree에서는 `pnpm ui-infra:audit && pnpm lint:strict`가 통과한다. 기존 ledger 감소는 허용하지만 baseline
갱신으로 신규 위반을 흡수하면 실패다.

#### P1 — React-free contract 패키지

**신규 owner:**

```text
src/shared/workbench/
  contract/
    featureManifest.ts    manifest와 contribution DTO
    surface.ts            Surface/Group/LayoutPreset 계약
    context.ts            ContextKind/Handle/Envelope/compatibility
    command.ts            CommandMap/Result/Error/WhenExpr 입력
    scope.ts              ScopeIdentity/Lifecycle/OwnerRef
    errors.ts             reason-coded admission errors
    index.ts
  index.ts                contract/core/react의 명시적 public export만 제공
```

`contract`는 React, DOM, Zustand, TanStack Router, Tauri를 import하지 않는다. 모든 외부 extension 경계 DTO는
JSON-safe이며 `unknown` 입력에서 schema validation을 통과해야 typed object가 된다. native React loader와
command handler는 이 패키지가 아니라 P3/P4 activation adapter가 소유한다.

**RED→GREEN rail:**

- `src/shared/workbench/contract/__tests__/manifest.test.ts`: duplicate/referential-integrity/namespace 오류
- `src/shared/workbench/contract/__tests__/contextCompatibility.test.ts`: version range, unknown kind, sensitivity 승격
- `src/shared/workbench/contract/__tests__/serialization.test.ts`: JSON round-trip과 함수/React value 거부

**종료 명령:**

```bash
pnpm exec vitest run src/shared/workbench/contract
pnpm typecheck
pnpm lint:strict
```

#### P2 — kernel authority: registry, scope, command, context

**신규 owner:**

```text
src/shared/workbench/core/
  ContributionRegistry.ts
  ScopeNode.ts
  CommandService.ts
  ContextKeyService.ts
  IntentBus.ts
  ContextStore.ts
  SurfaceService.ts
  LayoutStore.ts
  WorkspaceSession.ts
  index.ts
```

구현 순서는 `ScopeNode → ContributionRegistry → CommandService/ContextKeyService → ContextStore → LayoutStore`다.
각 객체는 `dispose()`가 idempotent여야 하고 scope parent는 생성 후 불변이다. `ContextStore`는 payload owner가
아니며 bounded envelope와 lease만 소유한다. Search/Facts/blob은 immutable ref로만 저장한다.

**RED→GREEN rail:**

- `core/__tests__/scopeLifecycle.test.ts`: child-first dispose, disposed dispatch, re-parent API 부재
- `core/__tests__/contributionTransaction.test.ts`: validate-all/atomic commit/deterministic order/rollback
- `core/__tests__/commandAdmission.test.ts`: inactive scope, defer TTL/bytes/coalesce/AbortSignal
- `core/__tests__/contextStore.test.ts`: wrong workspace, stale snapshot, schema skew, TTL/refcount/byte budget
- `core/__tests__/layoutStore.test.ts`: corrupt v2 migration quarantine와 v3 round-trip

**종료 명령:**

```bash
pnpm exec vitest run src/shared/workbench/core
pnpm typecheck
pnpm audit:cross-slice
```

property/fuzz rail은 seed를 출력하고 실패 corpus를 fixture로 승격한다. 랜덤 성공 한 번으로 종료하지 않는다.

#### P3 — React host와 기존 UI runtime 단일화

**신규 owner:**

```text
src/shared/workbench/react/
  WorkbenchRoot.tsx
  ScopeProvider.tsx
  SurfaceHost.tsx
  NativeViewBinding.ts
  PartGrid.tsx
  ViewStack.tsx
  ViewHost.tsx
  hooks.ts
  index.ts
```

**수정 허용:**

- `src/app/providers/AppProviders.tsx`: WorkbenchRoot composition
- `src/widgets/app-shell/AppShell.tsx`: persistent workbench host와 UIHost mount
- `src/shared/ui/runtime/UIRuntimeProvider.tsx`: `ScopeNode` identity를 받는 projection으로 변경
- `src/shared/ui/runtime/CommandService.ts`: P2 command port delegate facade로 변경

`UIRuntimeProvider`가 새 command/scope registry를 생성하면 실패다. Dialog/Layer 같은 transient service는 유지할 수
있지만 owner identity와 dispose는 Workbench scope에서 받아야 한다.

**종료:** `register → activate → mount → hide → show → dispose` 순서, view crash 격리, topmost Escape/focus restore,
listener/layer/command 잔존 0을 Vitest와 `pnpm test:renderer`로 증명한다. 기존 shared UI component test도 그대로
통과해야 한다.

#### P4 — Surface catalog, generic route, tab persistence migration

**신규 owner:**

```text
src/app/workbench/builtInSurfaceCatalog.ts
src/app/workbench/SurfaceRuntimeAdapter.tsx
src/app/workbench/__tests__/surfaceCatalog.test.ts
src/app/router/workspaceSurfaceRoute.tsx
```

`builtInSurfaceCatalog.ts`만 제한된 두 glob을 사용한다. `manifest.ts`는 eager metadata discovery 대상으로
React/runtime module을 import할 수 없고, `activate.ts`는 기본 lazy glob 함수로만 수집한다.

```ts
const metadata = import.meta.glob('/src/pages/workspace-*/manifest.ts', { eager: true });
const activators = import.meta.glob('/src/pages/workspace-*/activate.ts');
```

catalog는 owner metadata와 activator module의 one-to-one 관계를 검증하지만 activation event 전에는
`activators[path]()`를 호출하지 않는다. 결과는 ID 순으로 정렬하고 한 transaction으로 commit한다.

**migration 대상:**

- `src/shared/config/workspaceTabs.ts`: `TabKind`를 새 API에서 제거하고 legacy migration map으로만 유지
- `src/app/router/workspaceTabsRegistry.tsx`: icon/component/provider switch를 `LegacySurfaceAdapter` 내부로 축소
- `src/app/router/router.tsx`: workspace task route를 `/w/$workspaceId/$surfaceId` 하나로 수렴
- `src/features/workspace-tabs/model/store.ts`: persisted `{ kind }`를 `{ surfaceId, stateVersion }`으로 migration
- `src/features/workspace-tabs/ui/WorkspaceTabsHost.tsx`: catalog에서 surface를 resolve

기존 `/intelligence`, `/coding`, `/reviews`는 redirect/alias만 소유하며 새 surface가 늘어날 때 route source를
수정하지 않는다. 알 수 없는 surface, capability 부족, untrusted owner는 빈 화면 fallback이 아니라 typed error
surface로 닫는다.

**종료:**

```bash
pnpm exec vitest run src/app/workbench src/features/workspace-tabs
pnpm test:renderer
pnpm build
```

test surface 하나를 `src/pages/workspace-test-*` 아래에 추가·삭제하는 diff에서 `router.tsx`, `AppShell.tsx`,
`workspaceTabs.ts`, 중앙 registry 변경이 0이어야 한다.

#### P5 — 분석 패밀리 reference slice와 컨텍스트 전달

**신규 owner:**

```text
src/pages/workspace-analysis/
  manifest.ts
  activate.ts
  Surface.tsx
  ports.ts
  context.ts
  views/Overview.tsx
  __tests__/manifest.test.ts
  __tests__/contextHandoff.test.tsx
  Surface.stories.tsx
```

첫 단계에서는 기존 `IntelligenceLayout`과 시각 상태를 재작성하지 않는다. `Surface.tsx`가
`LegacySurfaceAdapter`를 통해 기존 화면을 감싸고, `IntelligenceTabProviders`는 surface scope service로 옮길
대상을 기록하는 migration adapter가 된다. 이 PR에서 graph renderer, filter UX, 디자인을 동시에 바꾸지 않는다.

컨텍스트 producer는 최소 `core.resource`, `core.range`, `quanta.analysis.finding`만 등록한다. Coding/Review는
reference receiver adapter만 추가해 `workbench.openSurface({ surfaceId, contextHandle, reuse })` 경로를 검증한다.
다른 family Context/store를 직접 import하거나 현재 global selection으로 fallback하면 실패다.

**종료 시나리오:**

```text
analysis finding 생성
  → coding 새 인스턴스에서 동일 revision/range reveal
  → review에서 evidence context 수신
  → wrong workspace / stale Facts / unknown schema 각각 ContextRejected
  → source tab close 후 target lease 유지
  → target close 후 context/resource/listener 잔존 0
```

duplicate analysis tab 두 개의 view mode/overlay/stack/runner가 격리되고 transferable handle만 공유돼야 한다.

#### P6 — 일반 App Page catalog와 생성 DX

**신규/수정:**

```text
src/app/router/appPageCatalog.ts
src/app/router/__tests__/appPageCatalog.test.ts
scripts/create-surface.mjs
scripts/create-page-family.mjs
scripts/verify-workbench-scaffolds.mjs
package.json                         create:surface/create:page-family/verify:workbench 추가
```

첫 migration은 기존 `widgets/org-stage`, `widgets/me-stage`, `widgets/public-stage`, `widgets/auth-stage` loader를
manifest에서 참조한다. 페이지 전체를 한 번에 `src/pages`로 이동하지 않는다. catalog가 안정된 뒤 family별 별도
PR에서 이동한다.

생성기는 이름 충돌·reserved namespace·잘못된 route/auth/chrome 조합을 생성 전에 거부하고 임시 디렉터리에
출력한 뒤 validation 성공 시에만 rename한다. `verify-workbench-scaffolds`는 임시 test family를 생성해 catalog
materialization과 typecheck를 확인하고 항상 정리한다.

**종료:** 새 org/settings/public/auth page가 자기 family manifest만 추가해 route에 materialize되고 root router의
lazy import/chrome/auth switch 수정은 0이다.

#### P7 — 플러그인 준비 경계

P1~P6 완료 전에는 Node/web extension host를 시작하지 않는다. 먼저 아래 **host-neutral** 산출물만 고정한다.

- `FeatureManifest`와 context/command envelope JSON Schema export
- contribution capability/trust admission과 owner resource budget
- activation metadata와 runtime code loading의 분리
- unregister/crash/hot-reload 시 owner contribution·scope·context lease 일괄 회수

이 단계에서도 built-in native loader와 외부 extension loader를 같은 타입으로 속이지 않는다. 실제 extension host,
VSIX/Open VSX, webview sandbox는 L2 별도 위협 모델·프로세스 격리·서명 정책이 승인된 뒤 구현한다.

### 10.3 PR 순서와 병렬화 제한

```text
PR-0  P0 architecture RED rails
  └─ PR-1  P1 contract
       └─ PR-2A P2 scope/registry/command
       └─ PR-2B P2 context/layout                 (PR-2A의 ScopeNode 계약 사용)
            ├─ PR-3 P3 React host + UI facade 수렴
            └─ PR-4 P4 catalog/route/tab migration (P3 SurfaceHost 필요)
                 ├─ PR-5 P5 analysis reference slice
                 └─ PR-6 P6 app-page catalog + generators
                      └─ L2/P7 extension campaign admission
```

- PR-2A와 P2B의 inventory/RED test 작성은 병렬 가능하지만 `ScopeNode`, error taxonomy, public exports는 PR-2A가
  소유한다. 같은 파일을 양쪽에서 수정하지 않는다.
- P3와 P4 설계/test fixture는 병렬 가능하지만 P4 GREEN은 P3 `SurfaceHost` merge 뒤에만 선언한다.
- P5 이전에는 새 분석 화면을 대량 포팅하지 않는다. P5가 zero-shell-change와 context negative rail의 reference다.
- PR마다 `pnpm typecheck`, owner-local Vitest, `pnpm lint:strict`, `pnpm ui-infra:audit`를 실행한다.
- router/AppShell/persistence/Tauri capability를 건드린 PR만 각각 renderer/build/Tauri rail을 추가한다.
- milestone 마지막 PR은 `pnpm verify && pnpm verify:ui`를 실행한다. Tauri owner 변경이 있으면
  `pnpm test:tauri`도 별도 증거로 남긴다.

### 10.4 즉시 착수 순서

1. P0에서 `surface-no-shell-edit`, cross-family import, React-free contract 실패 fixture를 먼저 고정한다.
2. P1에서 contract 타입과 schema만 구현하고 Router/React/store는 건드리지 않는다.
3. P2A에서 scope/registry/command transaction을 닫고 기존 UI runtime 연결은 아직 하지 않는다.
4. P2B에서 ContextStore와 layout v3 migration을 닫는다.
5. P3에서 기존 UI command/scope를 새 권위로 단방향 수렴시킨다.
6. P4에서 generic surface route와 persisted tab migration을 적용한다.
7. P5에서 기존 Intelligence 화면을 reference family로 감싸 context handoff를 실제 증명한다.
8. P6 이후에만 신규 분석 화면 family와 일반 page family를 병렬 포팅한다.

각 단계의 owner-local rail이 실패하면 다음 단계로 넘어가지 않는다. 문서 계약만 존재하거나 mock receiver만 green인
상태를 해당 milestone 완료로 처리하지 않는다.

### 10.5 2026-07-22 착수 상태

| packet | live 상태 | 착수 판정 | 다음 authoritative action |
|---|---|---|---|
| P0 | UI ledger/audit와 일부 UI runtime rail 존재; family/context fixture 없음 | `IN_PROGRESS` | 세 architecture fixture와 fail-new rule 추가 |
| P1 | 문서 타입 초안만 존재; `src/shared/workbench` 없음 | `READY` | contract RED tests와 JSON-safe DTO부터 생성 |
| P2 | 기존 UI-local command만 존재 | `BLOCKED_BY_P1` | P1 public contract green 후 ScopeNode RED rail |
| P3 | `shared/ui/runtime` bootstrap 구현 존재; Workbench owner 없음 | `BLOCKED_BY_P2` | 새 command/scope 생성 금지 후 delegate facade 전환 |
| P4 | closed TabKind/중앙 registry/수동 route가 live owner | `BLOCKED_BY_P3` | catalog RED rail과 persisted migration fixture 준비 |
| P5 | 기존 Intelligence UI와 tab-local providers 존재 | `BLOCKED_BY_P4` | 시각 변경 없이 analysis manifest/activator wrapper 추가 |
| P6 | 일반 페이지가 root router lazy import에 수동 나열 | `BLOCKED_BY_P4` | app-page catalog collision RED rail 준비 |
| P7/L2 | extension host/trust/signing authority 없음 | `DEFERRED` | P1~P6 proof 후 별도 admission |

따라서 즉시 구현 시작점은 P0의 누락 rail과 P1 contract다. 현재 `shared/ui/runtime` 구현이 있다는 이유로 P3부터
시작하거나, 새 분석 페이지를 기존 Router/TabKind에 더 추가하는 방식은 이 계획의 선행 조건을 위반한다.

### 10.6 실행 액션리스트 — remaining work SSOT

이 표가 워크벤치 구조 변경의 남은 작업 SSOT다. `[x]`는 owner 파일이 존재하고 표의 evidence가 현재 head에서
통과한 경우에만 표시한다. 타입/문서만 추가됐거나 downstream rail이 blocked면 완료가 아니다. PR 본문에는 완료한
ID, 실행 명령, 결과, 미완료 ID를 그대로 기록한다.

#### P0 — guardrail

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-001` | `tools/ui-infra-fixtures/*`와 fixture harness 추가 | 없음 | 세 invalid fixture가 담당 rule을 각각 RED로 만듦 |
| [ ] | `WB-002` | `eslint.config.js`에 cross-family import와 contract/core React import 금지 | WB-001 | invalid/valid fixture 쌍으로 rule 오탐·미탐 0 |
| [ ] | `WB-003` | `scripts/ui-infra-audit.mjs`에 중앙 surface switch와 arbitrary Provider fail-new rule 추가 | WB-001 | `pnpm ui-infra:audit` + baseline 증가 거부 test |
| [ ] | `WB-004` | `.github/workflows/ci.yml`에서 architecture audit를 typecheck/build보다 앞에 실행 | WB-002, WB-003 | 깨진 fixture PR이 빠른 job에서 실패 |

#### P1 — contract

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-101` | `shared/workbench/contract`에 manifest/surface/context/command/scope/error 타입 추가 | WB-002 | contract/core React·DOM·Router·Tauri import 0 |
| [ ] | `WB-102` | manifest/context/command envelope JSON Schema와 `unknown → typed` validator 추가 | WB-101 | malformed/unknown/version-skew corpus가 reason-coded reject |
| [ ] | `WB-103` | namespaced ID, referential integrity, sensitivity/durable 정책 고정 | WB-102 | duplicate/core namespace/권한 하향 negative test green |
| [ ] | `WB-104` | `shared/workbench/index.ts` public export와 package boundary 고정 | WB-103 | deep import fixture RED, public import typecheck GREEN |
| [ ] | `WB-106` | `FeatureManifest`/`AppPageFamilyManifest`의 `manifestSchemaVersion`·`engineRange`·`ownerVersion`과 host compatibility policy 고정 | WB-104 | engine skew/schema skew/incompatible owner manifest가 typed reject |
| [ ] | `WB-107` | `SettingContribution`/`ConfigurationRegistry`/`SecretStoragePort` contract와 precedence/scope/trust 정책 고정 | WB-106 | default/user/workspace/folder precedence, secret persistence reject, trust-gated setting test |
| [ ] | `WB-105` | P1 owner-local suite를 CI에 연결 | WB-107 | `pnpm exec vitest run src/shared/workbench/contract` green |

#### P2A — scope, registry, command

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-201` | `ScopeNode`와 lifecycle/error taxonomy 구현 | WB-105 | child-first/idempotent dispose, re-parent API 부재 test |
| [ ] | `WB-202` | `ContributionRegistry` validate-all/atomic commit/rollback 구현 | WB-201 | partial commit 0, activation order permutation 결과 동일 |
| [ ] | `WB-203` | scoped `CommandService`와 typed result/admission 구현 | WB-202 | inactive/disposed/defer TTL/byte/AbortSignal negative test |
| [ ] | `WB-204` | `ContextKeyService` when projection과 shadowing 구현 | WB-201 | parent merge/local shadow/dispose restore test |
| [ ] | `WB-205` | bounded `IntentBus` bubble/address/coalesce 구현 | WB-201, WB-203 | wrong scope와 queue overflow가 silent drop 없이 reject |

#### P2B — context, workspace, layout

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-211` | `WorkspaceSession`에 workspace/revision/Search/Facts/dirty identity 구현 | WB-201 | generation 전환 시 이전 request/handle stale 처리 |
| [ ] | `WB-212` | `ContextStore` envelope/lease/TTL/refcount/byte budget 구현 | WB-201, WB-103 | wrong workspace/stale/expired/schema/secret persistence reject |
| [ ] | `WB-213` | `workbench.openSurface` context admission port 구현 | WB-203, WB-212 | `new/active-compatible/singleton` 재사용 정책 test |
| [ ] | `WB-214` | `LayoutStore` v3 validator/transaction/persistence 구현 | WB-201 | operation round-trip과 corrupt blob safe-layout recovery |
| [ ] | `WB-215` | 기존 `panelLayout`/layout v2 일회성 migration과 quarantine 구현 | WB-214 | v2→v3 재실행 시 중복 migration/dual-write 0 |

#### P3 — React host와 UI runtime 수렴

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-301` | `WorkbenchRoot/ScopeProvider/SurfaceHost/ViewHost` vertical slice 구현 | WB-205, WB-214 | register→mount→hide→show→dispose lifecycle green |
| [ ] | `WB-302` | `shared/ui/runtime/CommandService`를 WB-203 port delegate로 전환 | WB-203 | runtime에서 `new CommandService()` canonical instance 추가 생성 0 |
| [ ] | `WB-303` | `UiScopeProvider`를 `ScopeNode` identity projection으로 전환 | WB-201, WB-301 | 별도 active/dispose tree 0, owner cleanup 역순 확인 |
| [ ] | `WB-304` | AppShell에 Workbench host/UIHost 단일 mount 적용 | WB-301, WB-303 | route 전환·scope close 뒤 layer/listener/command 잔존 0 |
| [ ] | `WB-305` | crash/loading/empty/permission boundary와 keyboard/focus rail 추가 | WB-304 | `pnpm test:renderer && pnpm verify:ui` green |

#### P4 — surface catalog와 route/tab migration

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-401` | `builtInSurfaceCatalog`의 eager metadata/lazy activator discovery 구현 | WB-202, WB-301 | discovery 시 surface chunk load 0, ID/owner collision reject |
| [ ] | `WB-402` | generic `/w/$workspaceId/$surfaceId` route와 typed error surface 구현 | WB-401 | unknown/disabled/untrusted deep link fail-closed |
| [ ] | `WB-403` | tab record를 `{workspaceId,surfaceId,stateVersion}` 권위로 migration | WB-402, WB-215 | legacy kind 복원, quarantine, reload identity test |
| [ ] | `WB-404` | WorkspaceTabsHost를 SurfaceRegistry resolve로 전환 | WB-403 | singleton/multi tab, pin/reorder/LRU 회귀 0 |
| [ ] | `WB-405` | legacy URL alias와 `LegacySurfaceAdapter` 격리 | WB-404 | history loop 0, canonical/legacy가 같은 surface identity 사용 |
| [ ] | `WB-406` | 중앙 TabKind/icon/component/provider switch 제거 또는 migration-only 축소 | WB-405 | test family 추가 diff의 shell/router/tab union 변경 0 |

#### P5 — analysis reference family와 context handoff

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-501` | `pages/workspace-analysis/manifest.ts` JSON metadata 추가 | WB-406 | manifest validation과 layout/view reference green |
| [ ] | `WB-502` | `activate.ts`와 `Surface.tsx`로 기존 IntelligenceLayout lazy binding | WB-501 | discovery 때 미로딩, activation 때 한 번만 loading |
| [ ] | `WB-503` | Intelligence tab-local Provider를 surface scope migration adapter로 격리 | WB-502, WB-303 | duplicate tab mode/overlay/stack/runner state 격리 |
| [ ] | `WB-504` | resource/range/analysis-finding context codec과 producer 구현 | WB-212, WB-503 | payload budget, snapshot refs, sensitivity policy test |
| [ ] | `WB-505` | Coding/Review reference receiver와 reveal command 연결 | WB-213, WB-504 | 다른 family store/Context direct import 0 |
| [ ] | `WB-506` | analysis→coding→review handoff와 lifecycle e2e 추가 | WB-505 | mismatch 3종 reject, source close/target lease/최종 cleanup green |
| [ ] | `WB-507` | `surface-no-shell-edit` reference rail 고정 | WB-506 | analysis family 삭제·재등록·hot reload 실패 뒤 잔존 0 |

#### P6 — 일반 App Page와 생성 DX

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-601` | `appPageCatalog` route/chrome/auth validation 구현 | WB-401 | collision/invalid auth-chrome/lazy failure typed reject |
| [ ] | `WB-606` | `AppPageFamilyManifest` owner/provenance/materialization receipt와 atomic mount policy 구현 | WB-601 | partial page catalog 0, owner/route receipt logged, materialization rollback green |
| [ ] | `WB-602` | 기존 org/me/public/auth loader를 compatibility manifest로 등록 | WB-606 | 화면 동작 변경 없이 root router 수동 import 감소 |
| [ ] | `WB-603` | `create:surface` 원자적 scaffold 생성기 구현 | WB-507 | 생성→validate→materialize→삭제 fixture green |
| [ ] | `WB-604` | `create:page-family` 원자적 scaffold 생성기 구현 | WB-602 | org/settings/public/auth matrix fixture green |
| [ ] | `WB-605` | `verify:workbench`에 두 scaffold와 zero-shell-change 검증 연결 | WB-603, WB-604 | `pnpm verify:workbench`가 CI와 로컬에서 동일 결과 |

#### P7/L2 admission — P1~P6 이후

| done | ID | action / owner | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-701` | manifest/page/context/command schema artifact와 compatibility policy export | WB-605 | golden corpus가 host-neutral validator에서 동일 결과 |
| [ ] | `WB-702` | trust/capability/resource budget admission 계약 고정 | WB-701 | untrusted top-level surface와 budget overflow reject |
| [ ] | `WB-703` | activation/unregister/crash/hot-reload owner cleanup rail 고정 | WB-702 | contribution/scope/context/resource leak 0 |
| [ ] | `WB-704` | extension-host/VSIX/webview 별도 RFC admission | WB-703 | threat model·process isolation·signing owner 승인 전 구현 0 |

#### 공통 closeout

| done | ID | action | depends | completion evidence |
|---|---|---|---|---|
| [ ] | `WB-901` | 각 packet owner-local proof receipt 기록 | 해당 packet | command/head/result/fixture가 PR에 남음 |
| [ ] | `WB-902` | milestone full verification | milestone 전체 | `pnpm verify && pnpm verify:ui` green |
| [ ] | `WB-903` | Tauri owner 변경분 native verification | Tauri 변경 PR만 | `pnpm test:tauri` 별도 green |
| [ ] | `WB-904` | migration adapter/legacy owner 제거 ledger 갱신 | P4~P6 | adapter마다 owner·삭제 milestone·잔여 consumer 명시 |

우선 실행 큐는 `WB-001 → 002/003 → 004 → 101 → 102 → 103 → 104 → 106 → 107 → 105`다. P0/P1이 닫히기 전에는
`WB-301` 이후 작업을 구현하지 않는다. P2A/P2B는 WB-201 계약을 공유하므로 같은 worktree에서 병렬 수정하지 않는다.

---

### 10.7 티켓 보드 — issue/worker 입력용

아래는 package-level 요약이다. 실제 실행/상태/DoD 권위는 별도 패킷으로 분리한다.

- 실행 시작점: [`execution/README.md`](execution/README.md)
- 전체 leaf inventory: [`execution/TICKETS.md`](execution/TICKETS.md)
- 현재 상태 SSOT: [`execution/tickets/00-ticket-status-board.md`](execution/tickets/00-ticket-status-board.md)
- dependency DAG: [`execution/tickets/TICKET_DEPENDENCY_DAG.md`](execution/tickets/TICKET_DEPENDENCY_DAG.md)
- worker 절차: [`execution/tickets/WORKER_START_HERE.md`](execution/tickets/WORKER_START_HERE.md)
- 상세 티켓: `execution/tickets/WBT-00.md` ... `WBT-09.md`

`WBT-xx`는 owner-seam aggregate package이고 `WB-xxx`는 실제 PR-sized leaf ticket이다. acceptance는 반드시
**code scope + non-goals + owner-local RED/GREEN rail + DoD + receipt + stop rule**을 포함한다. 이 절의 요약과
실행 패킷이 충돌하면 status는 status board, 범위/DoD는 상세 WBT 파일이 우선한다.

#### WBT-00 — Architecture guardrail 고정

- covers: `WB-001`, `WB-002`, `WB-003`, `WB-004`
- goal: 새 workbench 권위를 만들기 전에 기존 shell/router/tab/provider 구조에 신규 위반이 더 쌓이지 않게 동결
- owner files:
  - `tools/ui-infra-fixtures/*`
  - `scripts/ui-infra-audit.mjs`
  - `eslint.config.js`
  - `.github/workflows/ci.yml`
- proof:
  - invalid fixture 3종이 각각 담당 rule을 RED로 만듦
  - `pnpm ui-infra:audit`
  - `pnpm lint:strict`
- stop rule:
  - 새 canonical contract/package 추가 금지
  - 기존 위반 baseline을 숫자만 갱신해 흡수하면 실패

#### WBT-01 — React-free contract + compatibility + config 계약

- covers: `WB-101`, `WB-102`, `WB-103`, `WB-104`, `WB-106`, `WB-107`, `WB-105`
- goal: manifest/context/command/settings를 JSON-safe host-neutral contract로 고정
- owner files:
  - `src/shared/workbench/contract/*`
  - `src/shared/workbench/index.ts`
- proof:
  - `pnpm exec vitest run src/shared/workbench/contract`
  - `pnpm typecheck`
  - `pnpm lint:strict`
- must prove:
  - `manifestSchemaVersion`/`engineRange`/`ownerVersion` skew reject
  - duplicate ID / namespace / sensitivity downgrade reject
  - config precedence와 secret persistence reject
- stop rule:
  - React loader, DOM type, Router/Tauri import 추가 금지
  - runtime behavior 구현으로 scope/registry 우회 금지

#### WBT-02 — Scope/Registry/Command kernel

- covers: `WB-201`, `WB-202`, `WB-203`, `WB-204`, `WB-205`
- goal: 단일 scope tree와 atomic contribution/command authority 수립
- owner files:
  - `src/shared/workbench/core/ScopeNode.ts`
  - `src/shared/workbench/core/ContributionRegistry.ts`
  - `src/shared/workbench/core/CommandService.ts`
  - `src/shared/workbench/core/ContextKeyService.ts`
  - `src/shared/workbench/core/IntentBus.ts`
- proof:
  - `pnpm exec vitest run src/shared/workbench/core`
  - `pnpm typecheck`
- must prove:
  - child-first/idempotent dispose
  - partial contribution commit 0
  - inactive/disposed scope command reject
  - queue TTL/bytes/coalesce/AbortSignal rails
- stop rule:
  - UI runtime delegate 변경 금지
  - layout/context persistence 변경 금지

#### WBT-03 — Workspace/Context/Layout kernel

- covers: `WB-211`, `WB-212`, `WB-213`, `WB-214`, `WB-215`
- goal: snapshot identity, context admission, layout persistence를 canonical kernel로 고정
- owner files:
  - `src/shared/workbench/core/WorkspaceSession.ts`
  - `src/shared/workbench/core/ContextStore.ts`
  - `src/shared/workbench/core/LayoutStore.ts`
- proof:
  - `pnpm exec vitest run src/shared/workbench/core`
  - corrupt layout quarantine fixture
- must prove:
  - wrong workspace / stale / expired / schema skew reject
  - `openSurface(new|active-compatible|singleton)` reuse policy
  - v2->v3 migration 재실행 시 dual-write 0
- stop rule:
  - router/tab persistence migration 착수 금지
  - global selection fallback 허용 금지

#### WBT-04 — React host / UI runtime convergence

- covers: `WB-301`, `WB-302`, `WB-303`, `WB-304`, `WB-305`
- goal: 기존 `shared/ui/runtime`을 Workbench kernel의 projection/delegate로 수렴
- owner files:
  - `src/shared/workbench/react/*`
  - `src/shared/ui/runtime/*`
  - `src/app/providers/AppProviders.tsx`
  - `src/widgets/app-shell/AppShell.tsx`
- proof:
  - `pnpm test:renderer`
  - `pnpm verify:ui`
  - owner-local Vitest lifecycle rail
- must prove:
  - `new CommandService()` canonical authority 추가 생성 0
  - topmost Escape / focus restore / dispose cleanup
  - route 전환 후 listener/layer/command 잔존 0
- stop rule:
  - surface catalog/tab migration 동시 진행 금지
  - 새 dialog/menu system 추가 금지

#### WBT-05 — Surface catalog + generic route + tab migration

- covers: `WB-401`, `WB-402`, `WB-403`, `WB-404`, `WB-405`, `WB-406`
- goal: closed `TabKind`/중앙 registry/수동 route를 manifest-driven surface runtime으로 교체
- owner files:
  - `src/app/workbench/*`
  - `src/app/router/workspaceSurfaceRoute.tsx`
  - `src/app/router/workspaceTabsRegistry.tsx`
  - `src/shared/config/workspaceTabs.ts`
  - `src/features/workspace-tabs/*`
- proof:
  - `pnpm exec vitest run src/app/workbench src/features/workspace-tabs`
  - `pnpm test:renderer`
  - `pnpm build`
- must prove:
  - discovery 시 surface chunk eager load 0
  - unknown/disabled/untrusted surface typed error
  - legacy URL alias가 canonical surface identity와 합류
  - test family 추가 diff에서 router/AppShell/tab union 변경 0
- stop rule:
  - 새 분석 family 포팅 금지
  - 기존 provider/state를 canonical runtime으로 오인해 존치 금지

#### WBT-06 — Analysis reference family + cross-family handoff

- covers: `WB-501`, `WB-502`, `WB-503`, `WB-504`, `WB-505`, `WB-506`, `WB-507`
- goal: 기존 Intelligence를 reference family로 감싸고 analysis->coding->review handoff를 실제 rail로 증명
- owner files:
  - `src/pages/workspace-analysis/*`
  - coding/review receiver adapter owner files
  - `src/app/providers/IntelligenceTabProviders.tsx`
- proof:
  - owner-local manifest/context tests
  - `pnpm test:renderer`
  - lifecycle e2e rail
- must prove:
  - discovery 때 미로딩, activation 때 1회 로드
  - duplicate analysis tab state 격리
  - wrong workspace / stale facts / unknown schema reject
  - source close 후 target lease 유지, 최종 cleanup 0
- stop rule:
  - graph/filter/design 전면 수정 금지
  - 다른 family store/Context direct import 금지

#### WBT-07 — App page catalog + scaffold DX

- covers: `WB-601`, `WB-606`, `WB-602`, `WB-603`, `WB-604`, `WB-605`
- goal: org/me/public/auth/settings 계열을 root router 수동 수정 없이 materialize하는 page catalog와 generator 고정
- owner files:
  - `src/app/router/appPageCatalog.ts`
  - `src/app/router/__tests__/appPageCatalog.test.ts`
  - `scripts/create-surface.mjs`
  - `scripts/create-page-family.mjs`
  - `scripts/verify-workbench-scaffolds.mjs`
  - `package.json`
- proof:
  - page catalog collision/materialization tests
  - `pnpm verify:workbench`
  - scaffold create->validate->materialize->cleanup fixture
- must prove:
  - partial page catalog mount 0
  - owner/provenance/materialization receipt 기록
  - root router lazy import/chrome/auth switch 수정 0
- stop rule:
  - 대량 `src/pages` 이동 금지
  - page family와 surface family contract 혼합 금지

#### WBT-08 — Host-neutral plugin admission boundary

- covers: `WB-701`, `WB-702`, `WB-703`, `WB-704`
- goal: extension host 구현 전에 schema/trust/budget/unregister cleanup 경계를 먼저 고정
- owner files:
  - manifest/context/command schema export owner
  - trust/capability/budget policy owner
  - L2 RFC / threat model owner docs
- proof:
  - golden corpus parity
  - unregister/crash/hot-reload cleanup rail
- must prove:
  - host-neutral validator 동일 결과
  - untrusted top-level surface reject
  - contribution/scope/context/resource leak 0
- stop rule:
  - Node extension host spawn 금지
  - VSIX/Open VSX/webview 구현 선행 금지

#### WBT-09 — Common closeout / receipts

- covers: `WB-901`, `WB-902`, `WB-903`, `WB-904`
- goal: 모든 leaf와 병렬로 proof receipt를 남기고, 마지막에 legacy removal ledger와 campaign closure를 검증
- proof:
  - packet별 owner-local receipt
  - milestone `pnpm verify && pnpm verify:ui`
  - Tauri 변경분 `pnpm test:tauri`
- stop rule:
  - 문서 체크박스만으로 완료 선언 금지
  - legacy adapter 잔존 consumer 미기록 상태로 close 금지

#### 티켓 순서 / 병렬화 규칙

```text
WBT-00
  -> WBT-01
      -> WBT-02
          -> WBT-03
              -> WBT-04
                  -> WBT-05
                      -> WBT-06
                      -> WBT-07
                          WBT-06 + WBT-07 -> WBT-08

WBT-09는 모든 leaf에 cross-cutting으로 적용하고 final closeout만 WBT-08 뒤에 수행
```

- 병렬 허용:
  - `WBT-02` RED test 작성과 `WBT-03` fixture 설계
  - `WBT-06` receiver inventory와 `WBT-07` scaffold fixture 설계
- 병렬 금지:
  - `WBT-02`와 `WBT-03`의 `ScopeNode`/public export 동시 수정
  - `WBT-04`와 `WBT-05`의 runtime authority 동시 변경
  - `WBT-05` 이전 신규 family 대량 포팅
  - `WBT-08` 이전 extension host/runtime 구현

#### 티켓 상태값

- `READY`: 선행 티켓이 닫혔고 owner-local RED rail을 바로 추가할 수 있음
- `BLOCKED_BY_<ticket>`: 선행 authority 미완료
- `IN_PROGRESS`: owner 파일과 RED rail 작업 시작
- `PROOF_PENDING`: 구현은 있으나 필수 rail 또는 receipt 미완료
- `DEFERRED_BY_<ticket>`: 승인 milestone 전에는 구현 자체가 금지됨
- `ACTIVE_CROSS_CUTTING`: 모든 leaf에 계속 적용되는 receipt/closeout ticket
- `DONE`: 문서가 아니라 proof receipt까지 현재 head에서 확인됨

실제 issue/PR 제목은 `WB-xxx: <one-line goal>` 형식으로 고정한다. issue 본문에는 최소 `write set`,
`non-goals`, `depends on`, `RED`, `DoD`, `proof`, `receipt`, `stop rule`을 넣는다.

---

## 11. Deferred decisions — owner와 차단 milestone

| 결정 | owner | 차단 지점 | 기본값 |
|---|---|---|---|
| searchd `DaemonHelloV1`/SDK 배포 방식 | quanta-index | M0.5 | 수동 DTO mirror 금지 |
| Agent canonical schema/package | quanta-codeagent-v3 | M5 | 기존 축약 client는 demo-only |
| Agent channel backpressure/chunk policy | 이 repo + CodeAgent | M5 | bounded queue, overflow fail-closed |
| Facts producer live 일정/DTO | semantica-codegraph-v2 | live Facts 전환 | fixture를 live로 가장하지 않음 |
| CM6 vscode API subset | 이 repo | M2 | diagnostics/decorations/hover/completion/definition만 후보, 별도 승인 |
| UI primitive implementation | 이 repo | primitive별 | 현재 custom adapter; rail 실패/유지비 증거 전에는 교체 안 함 |
| detachable panel/native auxiliary window | 이 repo + Tauri | 별도 milestone | Phase 1 main window internal layer only |
| extension signing/update/trust | L2 캠페인 | L2 | unsigned/untrusted code 자동 활성화 금지 |
| durable context kind/codec allowlist | 이 repo | M1.FAMILY | resource/symbol/range만 후보, secret/raw payload 금지 |
| external extension top-level surface capability | 이 repo + L2 | L2 | 기본 거부; trusted extension만 별도 admission |
| Linux/Windows release | 각 transport/binary owner | release | macOS Apple Silicon only |

"착수 차단 아님"으로 뭉개지 않는다. 해당 milestone admission 시 결정이 없으면 명시적으로 BLOCKED 처리한다.

## 12. G0 admission checklist

광범위한 제품 구현/포팅 전에 다음을 문서와 failing rail로 고정한다.

- [x] 이 RFC의 status/claim boundary와 superseded 문서 링크 정리
- [ ] macOS Phase 1 support matrix와 unsupported platform release 차단
- [ ] `quanta-index-sdk` version/source digest/배포 경로 및 `DaemonHelloV1` owner ticket
- [ ] searchd runtime dir/socket ownership·mode 보장 owner ticket (`0700`/`0600`)
- [ ] canonical `session.v1` schema/package owner ticket
- [ ] FeatureManifest collision/transaction, scope lifecycle, queue budget의 owner-local RED tests
- [ ] FeatureManifest/AppPageFamilyManifest compatibility tuple(`manifestSchemaVersion`/`engineRange`/`ownerVersion`)와 engine skew fail-closed rail
- [ ] SurfaceContribution/ContextEnvelope JSON Schema와 compatibility policy
- [ ] AppPageFamily route/chrome/auth catalog collision, owner/provenance receipt, atomic materialization rail
- [ ] 새 reference family가 Router/AppShell/tab union 수정 없이 등록되는 RED→GREEN rail
- [ ] ContextStore wrong-workspace/stale/expired/schema-skew/secret-persistence negative tests
- [ ] app/workspace/surface/view 상태 ownership inventory와 legacy Provider migration ledger
- [ ] SettingContribution/ConfigurationRegistry precedence, scope, trust, secret-storage policy와 owner-local RED tests
- [x] `@shared/ui` public API inventory와 custom adapter behavior contract baseline
- [x] UI owner/scope/layer lifecycle, topmost Escape, focus restore, scroll-lock RED tests
- [x] direct portal/headless import/global keydown/magic z-index 신규 위반 차단 rail + 기존 ledger
- [x] Storybook+axe, Playwright renderer, WebdriverIO Tauri의 proof scope·owner·CI 위치
- [ ] WorkspaceSession base/search/facts/dirty identity와 stale/cancel policy
- [ ] workspace trust + WebView secret/CSP/capability threat model
- [ ] hermetic M0.5 fixture와 expected digest
- [ ] bundle/runtime/queue/log budget 파일의 형식과 측정 환경
- [ ] `shared/workbench` 추출성 lint가 실제 위반 fixture를 잡는 RED rail

G0 완료는 문서 체크박스만으로 선언하지 않는다. 각 항목은 owner file 또는 failing test 경로를 가져야 한다.

## 13. observability와 budget 계약

모든 broker/command/contribution 이벤트의 공통 필드:

```text
traceId, requestId, processEpoch, ownerId, scopeInstanceId, workspaceId,
familyId, surfaceId, contextId, contextKind, plane, operation, snapshotRefDigest,
layerId, viewId, outcome, reasonCode, durationMs
```

- source text, prompt, auth token, raw diff는 기본 로그 금지; 필요 시 크기/해시/분류만 기록
- queue depth/bytes, dropped/coalesced/cancelled count, sidecar restart count, stale discard count를 계측
- active layer/view count, scope-dispose forced close, focus restore failure, keepAlive eviction을 계측
- surface activation/restore latency, context admission reject reason, context TTL/bytes/ref-count와 lineage depth를 계측
- context payload 원문은 로그하지 않고 kind/schema/snapshot digest/size/sensitivity만 기록
- M0.5의 고정 fixture/machine profile로 startup/query baseline을 만들고 M1 전에 regression threshold를 동결
- 현재 `bundle-budget.mjs`의 initial/vendor/largest-chunk rail과 별도로 IDE lazy graph 총량 budget 추가
- budget 초과는 warning이 아니라 CI failure. threshold 변경은 근거 있는 별도 diff로만 허용

## 14. 외부 규범 기준

- Tauri v2 channels: 고빈도 ordered stream은 event broadcast가 아니라 channel 사용
  - <https://v2.tauri.app/develop/calling-frontend/#channels>
- Tauri CSP/capabilities: WebView에는 최소 command surface만 부여
  - <https://v2.tauri.app/security/csp/>
  - <https://v2.tauri.app/security/permissions/>
- VS Code workspace trust: UI 숨김만으로 command 실행을 막았다고 간주하지 않음
  - <https://code.visualstudio.com/api/extension-guides/workspace-trust>
- VS Code extension host/webview security:
  - <https://code.visualstudio.com/api/advanced-topics/extension-host>
  - <https://code.visualstudio.com/api/extension-guides/webview#security>
- VS Code contribution/activation/context semantics:
  - <https://code.visualstudio.com/api/references/contribution-points>
  - <https://code.visualstudio.com/api/references/activation-events>
  - <https://code.visualstudio.com/api/references/when-clause-contexts>
- Theia의 service/contribution 및 initial-layout 분리 사례(그대로 채택하지 않고 검증 기준으로만 사용):
  - <https://theia-ide.org/docs/services_and_contributions/>
  - <https://theia-ide.org/docs/frontend_application_contribution/>
- UI adapter 후보 기준(채택 의무 아님): unstyled composition, WAI-ARIA interaction, React 18 peer 호환,
  common behavior suite 통과
  - <https://react-spectrum.adobe.com/react-aria/getting-started.html>
- UI proof 도구:
  - <https://storybook.js.org/docs/writing-tests/accessibility-testing>
  - <https://playwright.dev/docs/accessibility-testing>
  - <https://v2.tauri.app/develop/tests/webdriver/>

---

## 부록 A. 근거 (file:line)

| 주장 | 근거 |
|---|---|
| searchd = AF_UNIX + length-prefixed CBOR, 16MiB | [codec.rs:17](../../../../code-new/quanta-index/crates/quanta-index-ipc/src/codec.rs#L17), [server.rs:13](../../../../code-new/quanta-index/crates/quanta-index-ipc/src/server.rs#L13) |
| typed SDK가 repomap query/dirty ingest 제공 | [client.rs:445](../../../../code-new/quanta-index/crates/quanta-index-sdk/src/client.rs#L445), [client.rs:493](../../../../code-new/quanta-index/crates/quanta-index-sdk/src/client.rs#L493) |
| SDK transport는 동기식 one-shot UDS + deadline | [transport.rs:130](../../../../code-new/quanta-index/crates/quanta-index-sdk/src/transport.rs#L130), [server.rs:417](../../../../code-new/quanta-index/crates/quanta-index-ipc/src/server.rs#L417) |
| structural truthful subset이 SDK/runtime에 live | [structural.rs:268](../../../../code-new/quanta-index/crates/quanta-index-sdk/src/structural.rs#L268), [e2e_structural_hellgate.rs:1](../../../../code-new/quanta-index/crates/quanta-index-searchd-runtime/tests/e2e_structural_hellgate.rs#L1) |
| Tauri 호스트는 ping/app_version만 (브로커 미구현) | [lib.rs:23-26](../../../src-tauri/src/lib.rs#L23-L26) |
| 같은 kind 탭 다중 인스턴스 | [store.ts:107-119](../../../src/features/workspace-tabs/model/store.ts#L107-L119) |
| RepoMap 요청 = repo_id + revision_id + manifest_generation | [repomap.rs:2785](../../../../code-new/quanta-index/crates/quanta-index-contract/src/repomap.rs#L2785) |
| CSP에 ws:/wss: 없음 | [tauri.conf.json:28](../../../src-tauri/tauri.conf.json#L28) |
| 번들 identifier 아직 sedotfield | [tauri.conf.json:5](../../../src-tauri/tauri.conf.json#L5) |
| canvas-pixi peer React 19 | [canvas-pixi/package.json:21](../../../../code-new/quanta-ide/libs/canvas-pixi/package.json#L21) |
| agent-bridge = session.v1 최소 클라이언트 | [client.ts:1](../../../src/shared/agent-bridge/client.ts#L1) |
| workspace tabs가 instance/pin/reorder authority 보유 | [store.ts:107](../../../src/features/workspace-tabs/model/store.ts#L107) |
| tab host가 mounted LRU/visibility lifecycle 보유 | [WorkspaceTabsHost.tsx:10](../../../src/features/workspace-tabs/ui/WorkspaceTabsHost.tsx#L10) |
| workspace tab 종류가 closed union과 정적 맵에 묶임 | [workspaceTabs.ts:6](../../../src/shared/config/workspaceTabs.ts#L6), [workspaceTabsRegistry.tsx:69](../../../src/app/router/workspaceTabsRegistry.tsx#L69) |
| tab registry가 arbitrary React Provider를 허용 | [RegistryContext.tsx:5](../../../src/features/workspace-tabs/model/RegistryContext.tsx#L5) |
| current UI runtime이 자체 command/scope authority를 생성 | [UIRuntimeProvider.tsx:17](../../../src/shared/ui/runtime/UIRuntimeProvider.tsx#L17) |
| current app providers에 unkeyed Notebook/Jobs가 존재 | [AppProviders.tsx:10](../../../src/app/providers/AppProviders.tsx#L10) |
| 현재 Modal은 portal/focus/scroll-lock custom 구현 | [Modal.tsx:28](../../../src/shared/ui/Modal.tsx#L28) |
| semantic z-index tier가 이미 존재 | [primitives.ts:161](../../../src/shared/tokens/primitives.ts#L161) |
| palette matcher는 deterministic pure function | [match.ts:25](../../../src/features/control-palette/lib/match.ts#L25) |
| 기존 panel width persistence는 migration input | [panelLayout.ts:47](../../../src/shared/lib/panelLayout.ts#L47) |

## 부록 B. 이전 문서 대비 변경점 (교정 요약)

1. 별도 UDS↔WS 게이트웨이 프로세스 **제거** → Tauri 호스트 어댑터 브로커(§2).
2. 프로세스 수 표현 **통일**(M4=Tauri+searchd, L2=+Node ext-host; agent-bridge는 코드)(§2.5).
3. 단일 `ide` 스코프 → **인스턴스화** `app/workspace/tab/surface/view` + layout v3 key 네임스페이스(§3.1).
4. WorkspaceContext → **WorkspaceSession**(plane별 snapshot + dirty overlay + cancel/stale 규칙); reveal은 명령(§6).
5. ViewManifest 단일 load → **native/tree/webview metadata 3종 + built-in lazy activation binding 분리**;
   shellAdapter는 react 전용(§5).
6. when 파서 → **full 연산자·precedence·regex·괄호**(§7).
7. "순수함수 5모듈" → **7개, IntentBus/LayoutStore/ContextStore는 stateful**(§3.3).
8. "agent-bridge phase1 완성" → **session.v1 최소 클라이언트**(§1.2).
9. CSP ws 미허용 / Windows UDS 충돌 / 번들 identifier / Facts provenance 노출 추가(§8).
10. typed SDK/schema를 wire 권위로 고정하고 process handshake·binary provenance·privilege split 추가(§2).
11. scope lifecycle/queue budget와 원자적 FeatureManifest contribution 계약 추가(§3).
12. straight-line milestone을 hermetic proof gate와 의존 DAG로 교체(§10–§12).
13. A1(React 18)·A2(shellAdapter) **확정**(미결 아님)(§8.3, §5.2).
14. UI 전면 교체 대신 **facade + custom adapter + 공통 behavior contract**를 기본으로 확정(§5.3–§5.4).
15. persistent PanelService와 transient LayerManager를 분리하고 `M0.UI`를 M1 선행 gate로 추가(§10).
16. Family/Surface/View/Route를 분리하고 closed `TabKind`·정적 Router를 manifest-driven surface로 수렴(§3.7).
17. context key와 실제 화면 컨텍스트를 분리하고 snapshot-bound `ContextHandle` 전달 계약 추가(§3.8).
18. UI Command/UiScope bootstrap 구현이 Workbench 권위에 delegate하도록 single-owner migration 고정(§3.6, §5.4).
19. 분석 화면 패밀리 reference slice, `create:surface` DX, zero-shell-change completion rail 추가(§9.1, §10).
20. M0~M1.FAMILY를 P0~P7 owner-local PR, 실제 파일, RED→GREEN test, 실행 명령, stop condition으로 분해(§10.2~§10.5).
21. eager JSON metadata와 lazy `activate.ts`를 분리해 discovery가 React/command 실행 코드를 load하지 않도록 고정(§3.7, §5, §10.2).
22. `FeatureManifest`/`AppPageFamilyManifest`에 compatibility tuple을 추가해 schema/engine/owner version을 분리하고 skew를 fail-closed로 고정(§3.5, §3.7.1, §10.6).
23. `SettingContribution`을 placeholder로 두지 않고 `ConfigurationRegistry`/`SecretStoragePort` precedence·trust 계약까지 명시(§3.5.1, §10.6, §12).
22. 남은 구조 변경을 `WB-001`~`WB-904` 실행 ID, dependency, owner, completion evidence로 고정(§10.6).
