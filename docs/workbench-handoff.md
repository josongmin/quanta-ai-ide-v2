# Workbench 리라이트 핸드오프 (2026-07-21)

> **SUPERSEDED (2026-07-22):** 이 문서는 조사 기록으로만 보존한다. 설계·실행 순서·완료 게이트의
> SSOT는 [`docs/plans/jul-22-workbench-architecture/readme.md`](plans/jul-22-workbench-architecture/readme.md)다.
> 충돌 시 새 실행 SSOT가 우선한다.

이전 세션(구 se-dot-field-demo 경로)에서 진행한 IDE 리라이트 설계 논의 전체 정리.
다음 세션은 이 문서 + 메모리 `workbench-architecture`를 기준으로 이어간다.

---

## 0. 지금 당장 해야 할 것

- [ ] **리네이밍 변경분 커밋** — repo 개명(se-dot-field-demo → quanta-ai-ide-v2)으로 수정된 파일들이 워킹트리에 **커밋 안 된 상태**로 남아 있음:
  - package.json (name), README.md (타이틀)
  - src-tauri/Cargo.toml, Cargo.lock, tauri.conf.json (productName/publisher/copyright)
  - src/shared/i18n/locales/{en,ko,ja,zh}/{agents,coding}.json (footer 문구)
- GitHub는 `josongmin/quanta-ai-ide-v2`로 개명 완료(옛 URL 리다이렉트 유지), 로컬 remote 자동 갱신됨.
- 로컬 폴더는 `~/Documents/quanta-ai-ide-v2`. Claude 프로젝트 메모리도 새 경로 키로 이관 완료.

---

## 1. 목표

예전에 만든 데모 IDE(`~/Documents/code-new/quanta-ide`, p0-ide-v2)를 **SOTA++ 아키텍처로 리라이트**한다.
결론: **이 repo(quanta-ai-ide-v2)가 호스트 앱**이고, IDE 워크벤치를 이 안에 신축한다. 새 repo 아님.

이유: 이 repo에 이미 있는 것 — workspace-tabs 크롬(registry+store+테스트), TanStack Router, zustand,
better-auth 실배선, **agent-bridge(session.v1) phase 1 완료**(하드닝+테스트), intent 토큰/글래스 디자인 시스템,
verify 파이프라인(typecheck·i18n·semgrep·bundle-budget), boundaries ESLint, Tauri 설정.
→ quanta-ide 리라이트 계획에서 "셸/에이전트/상태/라우팅" 파트가 전부 이미 완성돼 있다.
**새로 지을 것은 워크벤치(IDE 스테이지 내부 인프라)뿐.**

---

## 2. 구 quanta-ide 정밀조사 결과 (5개 병렬 조사 완료)

### 구조 요약
- pnpm 모노레포 ~297k 라인. `p0-ide-v2/packages/app-*` 15개 앱 + `libs/*` 9개 + `products/code-universe`(135.8k, 별도 제품).
- app-ide: entities 47개 / features 43개(inspector-* 27 + editor-* 8) / widgets 6개. React 19 + Vite 6 + CodeMirror 6. 상태 라이브러리 없음(수제 useSyncExternalStore 스토어 71개).

### 구조적 구멍 4개 (리라이트의 이유)
1. **데이터 레이어 부재** — entities/*/api = mock.ts만(총 ~11.4k줄, file mock 3,488줄). 38개 파일이 mock 직수입. Editor.tsx가 ORCHESTRATOR 하드코딩 → 탭 눌러도 파일 안 바뀜. 히어로 78점이 3중 하드코딩.
2. **레지스트리 반쪽** — 인스펙터 모드 메타는 레지스트리인데 컴포넌트 해석은 FileInspectorView.tsx의 27-branch 인라인 조건문 + 27개 정적 import(lazy 없음).
3. **셀렉션 모델 부재** — 사이드바→인스펙터는 props, 에디터→인스펙터는 focusStore 싱글턴, 에디터↔사이드바 연결 없음. focusedSymbol 개념 자체가 없음. jumpTo는 queueMicrotask one-shot 핵.
4. **닫힌 플랫폼 계약** — TabApp closed union(`"rules" as AppKind` 캐스팅 치팅 중), ShellEvents 타입만 있고 emitter 미구현, when 가드는 함수 산발.

기타: AgentPane 이름 충돌 2개(하단 대시보드 vs 인스펙터 채팅, 무관한 컴포넌트), token-radar 3중 구현, 레이아웃 직렬화 없음.

### 자산 판정표
| 자산 | 판정 |
|---|---|
| canvas-engine(10.4k)/canvas-pixi(9.4k)/canvas-worker(779) | **그대로 가져옴** — React·앱 의존 0, 순수. 필요 시점(캔버스 이식 단계)에 패키지째 복사 |
| telemetry-agent, proof-carrying-pr | 그대로 가져옴 (순수 라이브러리) |
| CM6 익스텐션 팩토리 5종 | **패턴 보존, 재포장** (아래 §7 함정 참조) |
| shell의 feature-registry/shortcut-registry 설계 | 설계 이식(priority+when, 이벤트 로그), 코드는 새로 |
| workspace-canvas(39.6k) | 인터페이스 3개만 계승: GraphSource / AiService / PresenceTransport |
| 인스펙터 27패널, 하단 6패널 | View 계약 정의 후 기계적 포팅 (전부 `{file: FileFacts}` + focusStore만 씀) |
| mock 11.4k줄, synth-metrics 3.6k줄 | fixture 어댑터로 강등 (데모 모드 전용) |
| git-workspace 스토어, Terminal/Output 패널 | 버림 (전부 시뮬레이션) |
| e2e Playwright 10개 spec | 시나리오 계승 (탭/팔레트/라우팅/비주얼 회귀) |

---

## 3. 백엔드 현실: quanta-index (`~/Documents/code-new/quanta-index`)

- Rust 23크레이트 ~180k줄. **검색 플레인**: lexical(Tantivy)·semantic(LanceDB)·structural(tree-sitter AST)·hybrid(RRF)·repomap. 노출은 **UDS + CBOR IPC만**(searchd 데몬, 16MiB frame cap). SDK(quanta-index-sdk)·CLI(searchctl) 있음.
- **중요: taint/blast/risk/dead-code/coverage는 quanta-index 스코프 밖.** producer(semantica-codegraph-v2) 책임.
- 단, 와이어 계약 `OwnerDocKind`에 `Dataflow, Risk, Test, GraphEdge, Callsite, ServiceMap, OwnerMap` 이 **이미 예약**돼 있음 → FE facts 포트의 레코드 분류를 여기에 정렬하면 producer facts가 도착하는 날 어댑터 하나로 연결됨.

### 데이터 3플레인 (FE 포트 설계)
1. **SearchPlane** — quanta-index가 지금 제공 (심볼, 검색, repomap, 구조 매칭). UDS라 브라우저 직결 불가 → 얇은 로컬 게이트웨이(HTTP/WS) 또는 Tauri 사이드카.
2. **FactsPlane** — taint/blast/risk 등 분석 facts. 오늘 = fixture 어댑터(구 mock 이관), 내일 = producer 어댑터. kind는 OwnerDocKind 정렬.
3. **AgentPlane** — agent-bridge session.v1 (**이 repo에 phase 1 완료**). phase 2(tool/diff/approval + coding-stage)가 워크벤치 하단 패널·에디터 diff와 만나는 지점 — 두 작업이 한 설계로 합쳐짐.

---

## 4. 워크벤치 아키텍처 (핵심 결정)

### 4.1 WorkbenchScope 트리 — 커널 하나, 인스턴스 계층
"호스트용/IDE용 두 시스템"이 아니라 단일 커널 + 스코프 트리. 호스트도 루트 스코프일 뿐.

```
root scope (app-shell)          ← workspace-tabs, 전역 패널(agent 드로어, palette, toast), 전역 커맨드/키
 ├─ scope "ide" (ide-stage)     ← Part 4개 레이아웃, 인스펙터/에디터 뷰
 └─ scope "..." (다른 스테이지)
```

```ts
interface WorkbenchScope {
  id: string;
  parent: WorkbenchScope | null;
  views: ScopedRegistry<ViewManifest>;
  commands: ScopedRegistry<Command>;
  contextKeys: ScopedContextKeyService;   // 부모 체인 머지 + 로컬 섀도잉
  layout: LayoutStore;                    // 스코프별 직렬화 (storage key 네임스페이스: wb:root, wb:ide)
  intents: IntentBus;
  createChild(id: string): WorkbenchScope; // mount에 생성, unmount에 일괄 dispose
}
```

**상호 호출 4메커니즘** (사용자 요구: 자식↔부모 패널 상호 호출):
1. **체인 룩업** — `views.resolve("agent.drawer")`: 로컬→부모 순 해석. 자식이 부모 패널 여는 건 해석 규칙의 자연 결과. ID는 네임스페이스(`ide.inspector.flow`).
2. **인텐트 버블(위) + 스코프 주소(아래)** — 자식→부모는 emit 후 버블. 부모→자식은 `workbench.scope("ide").commands.run("editor.revealLine", {uri, line})` 명시 주소 + 비활성 스코프면 활성화 후 큐 실행(커널 담당).
3. **context key 상속+섀도잉** — when 평가는 머지 뷰. 전역 키 디스패치는 루트 1회, 깊은 스코프 우선 매칭 (Escape 계단이 선언으로 나옴).
4. **경계 = 커맨드/인텐트/openView만** — 부모 스토어 직접 import 금지(boundaries ESLint 강제). 이 경계가 곧 VS Code 호환의 직렬화 경계와 동일.

### 4.2 패널 시스템: 자체 구현 (dockview 철회)
- 고정 **Part 4개**(sidebar / editor / inspector / bottom) + Part 내 **Stack**. editor part만 split tree(에디터 그룹 분할). free-float 도킹 비목표.
- 철회 이유: 도킹 라이브러리는 자기 DOM/CSS 강제(커스텀 글래스와 충돌), drag preview transform이 backdrop-filter 죽임(기존 확정 제약), 이 제약이면 레이아웃 엔진 ~1.5k줄로 충분.
- 레이아웃은 순수 데이터 + 순수 함수(addView/moveView/closeView/resize/serialize/restore). 버전 필드 + 마이그레이션.

```ts
type PartId = "sidebar" | "editor" | "inspector" | "bottom";
type LayoutNode =
  | { kind: "split"; dir: "row" | "col"; sizes: number[]; children: LayoutNode[] }
  | { kind: "stack"; id: string; viewIds: string[]; activeViewId: string | null };
```

### 4.3 ViewRegistry — 모든 화면의 단일 계약
사이드바 트리·에디터·인스펙터 패널·하단 패널 전부 동일 View 계약. (구 repo의 인스펙터 반쪽 레지스트리 + PANES 배열 + VIEW_REGISTRY 3벌이 이거 하나로 수렴)

```ts
interface ViewManifest {
  id: string;                    // "ide.inspector.flow"
  title: string;
  icon?: IconRef;
  defaultLocation: PartId;
  order?: number;
  when?: ContextKeyExpr;         // File/Folder/Repo 뷰 분기가 이걸로 통합
  badge?: (ctx) => Promise<number | undefined>;   // 탭 카운트
  keepAlive?: boolean;           // 기본 unmount, 터미널류만 true
  load: () => Promise<{ default: ComponentType<ViewProps> }>;  // lazy 필수
}
interface ViewProps {
  viewId: string; isActive: boolean; isVisible: boolean;
  api: WorkbenchAPI;             // 스코프 바운드. 전역 스토어 직접 import 금지
}
```
ViewHost 파이프라인: resolve → lazy → Suspense 스켈레톤 → ErrorBoundary(뷰 죽어도 워크벤치 생존) → isActive/isVisible 주입 → keepAlive 정책.

### 4.4 FeatureManifest v2 기여점
구 feature-registry의 성숙한 부분(이벤트 로그, enable/disable, 카테고리) 계승 + 기여점 통합:
`views / commands / keybindings(when 포함) / editorExtensions / settings / statusItems`.
등록은 `workbench.contribute(manifest)` 한 방 → 커널이 분배, disposer 반환.

### 4.5 WorkspaceContext — 셀렉션 SSOT
```ts
interface WorkspaceContext {
  repo: RepoRef | null;
  openFiles: FileRef[];              // 에디터 탭 = 이 배열의 파생
  activeFile: FileRef | null;        // 사이드바·에디터·인스펙터 전부 구독
  cursor: { line: number; col: number } | null;
  focusedSymbol: SymbolRef | null;   // 신설 개념
  reveal: { line: number; nonce: number } | null;  // jumpTo microtask 핵 대체
}
```

---

## 5. VS Code 확장 호환 (UI 포함) — 장기 요구사항

**핵심 통찰**: VS Code 확장은 임의 DOM을 못 만짐. UI = ①선언적 기여점(views/menus/TreeDataProvider/statusBar/QuickPick/decorations…) ②Webview 샌드박스(iframe + acquireVsCodeApi). → **자체 디자인 유지하면서 호환 가능** (Theia가 증명). 호환의 실체 = 기여점 의미론 + webview 호스트 + `vscode` API 심을 확장 호스트 프로세스 RPC로 구현.

### L0 스펙 정합 7가지 (지금 M0 계약에 반영, 비용 ~0)
1. **when-clause 문법 VS Code 그대로** (`==`, `!=`, `&&`, `||`, `!`, `=~`, `in`) + context key 네이밍 관례 준수. 자체 문법 발명 금지.
2. **View 모델을 viewsContainers/views에 정렬.** View 3종: `native`(우리 1급 React) / `tree`(TreeDataProvider 렌더러) / `webview`(iframe 호스트). native는 우리만의 슈퍼셋.
3. **RPC 직렬화 경계** — 확장 대면 표면에 함수/컴포넌트/DOM 금지. command 인자 JSON-직렬화 가능. native 뷰 load()는 내부 전용 표면.
4. **Uri, 0-based Position/Range/Selection, TextDocument{uri, version}** — VS Code/LSP 정렬. CM6 offset은 EditorService 뒤 렌더링 디테일.
5. **활성화 생명주기** — activation events(`onView:*`, `onCommand:*`, `onLanguage:*`) + Disposable 패턴 내장.
6. **TextMate 하이라이팅 경로** — vscode-textmate + oniguruma-wasm을 CM6에 물리는 하이라이터 (호환 레이어에서).
7. **확장 호스트 = Node 사이드카** (Tauri에 Node 없음). 웹 빌드는 web-extension 서브셋(worker)만. 사이드카 관리 인프라는 quanta-index searchd와 공용화.

### 레벨 로드맵
- L0 지금: 스펙 정합 / L1: 선언 전용(테마·스니펫·키바인딩) / **L2: 확장 호스트 + webview/TreeView/commands ← 체감 호환 80%** / L3: LSP·DAP / L4(비목표 가능): 커스텀 에디터·노트북.
- 마켓플레이스는 **Open VSX** + VSIX 사이드로딩 (MS 마켓플레이스는 ToS상 불가). Code-OSS 코드는 MIT라 조각 재사용 합법.

### 에디터 결정
**CM6 유지** + vscode-editor API 어댑터는 고가치 서브셋만(diagnostics/decorations/hover/completion/CodeLens/go-to-def).
Monaco면 어댑터 공짜지만 커스텀 인라인 UI(블록 위젯 칩바) 유연성과 기존 CM6 자산 때문에 CM6. 리스크로 인지하고 있음.

---

## 6. 배치 + 구현 순서

```
src/shared/workbench/
  contract/   # Scope, ViewManifest, Intent, when — VS Code 정합 (L0 7가지 여기)
  core/       # ScopeNode, ScopedRegistry(체인 룩업), ContextKeyService(머지/섀도잉),
              # IntentBus(버블/큐잉), LayoutStore(트리+직렬화) — React 무관 순수함수 + 테스트
  react/      # WorkbenchRoot, ScopeProvider, useWorkbench, PartGrid, ViewStack, ViewHost
src/app/…             # 루트 스코프 생성 + 기존 크롬(workspace-tabs, control-palette) 어댑터 등록
src/widgets/ide-stage # "ide" 자식 스코프 + IDE 매니페스트 조립
src/features/ide-*    # 에디터 확장·인스펙터 패널 — View 매니페스트로 기여
```

**규칙 2개**: ① shared/workbench는 repo 내부 코드 import 금지(추출 가능성 유지, boundaries ESLint) ② IDE 스테이지는 lazy chunk + bundle-budget 별도 예산.

**순서**:
1. **M0**: core 헤드리스 완성 + 테스트. 심장 3개를 순수함수로 조지기 — 체인 룩업 해석 순서 / 인텐트 버블·큐잉(비활성 스코프 디스패치) / context key 섀도잉 + when 평가(VS Code 문법 파서)
2. **M1**: react 레이어(PartGrid/ViewStack/ViewHost) + 더미 뷰 3개로 검증(등록→탭 이동→직렬화 복원→when 필터)
3. **M2**: ide-stage 마운트 + 에디터 수직 슬라이스(CM6 팩토리 재포장, **파일 전환 실동작**) — 데이터는 FactsPlane fixture
4. **M3**: 인스펙터 셸 + 대표 패널 3개(flow=인텐트 왕복 검증 / blast=단순 렌더 / token-radar=구 3중 구현 단일화)
5. **M4**: SearchPlane 연결(quanta-index UDS → 로컬 게이트웨이) — 사이드바 트리=repomap, 심볼 호버=symbol search. **첫 실데이터 화면**
6. **M5**: AgentPlane(agent-bridge phase 2와 합류 — tool/diff/approval, 하단 타임라인)
7. **M6**: 나머지 패널 대량 포팅(병렬 가능), 캔버스(canvas-engine/pixi/worker 복사 + GraphSource를 게이트웨이에)

---

## 7. 구 repo에서 가져올 때의 함정 (조사에서 확인된 실버그)

- **gutter-marks는 raw `gutter()` API** — doc 변경 시 RangeSet 리매핑 안 됨(실버그). StateField 기반으로 재작성. fn-header/file-header는 이미 StateField + `setFnHeaderFacts`/`setFileHeaderFacts` StateEffect 구조(단, 한 번도 dispatch 안 됨 — 이 통로가 실데이터 갱신 경로).
- **risk-minimap이 gutter-marks의 GLYPH_META 직수입** — 카테고리→색 매핑을 공유 타입으로 분리.
- **호버 팝업이 DIY fixed-position + 공유 dismissTimer**(플리커 버그 소지) — CM6 `showTooltip`으로 교체.
- **editor-canvas가 SOURCES mock을 별도로 읽음**(에디터 문서와 이중 소스) — 에디터 문서 상태 단일화.
- CM6 익스텐션 팩토리 시그니처(보존 가치): `engineGutter(marks, handlers)` / `fnHeaders(initial)+StateEffect` / `fileHeader(initial)+StateEffect` / `symbolHover(symbols, onHover)→[ViewPlugin, domEventHandlers]` / `callSiteHover(sites, onHover)`. 단 **이벤트 out은 focusStore 직호출 클로저 → 인텐트 emit으로 교체**(익스텐션 독립성).
- 칩 임계값(blast≥10, cpx≥5, mutation<50/75 등)이 fn-header/file-header에 하드코딩 — 정책 객체로 분리.
- 구 repo 참조 시: node_modules/dist/.claude/worktrees 제외하고 볼 것. React 19(구) vs 18(이 repo) — canvas-pixi peer가 React 19라 복사 시점에 확인.

## 8. 이 repo 기존 규칙 (메모리에 있음, 요약)
- 디자인: 좌측 컬러 스트라이프 금지 / 선택상태 dark grey fill 금지 / rounded+비대칭 보더 금지 / 글래스는 다크 전용(라이트는 불투명) / raw Tailwind 색 금지(intent 토큰) / font-size는 named class / backdrop-filter는 조상 transform에 죽음.
- pre-commit 훅 느림(~2-3분) — 수동 게이트 후 `--no-verify` 허용. 큰 변경은 커밋 전 헬어딧 1바퀴가 디폴트.
