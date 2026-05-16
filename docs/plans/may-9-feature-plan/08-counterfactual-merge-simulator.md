# Feature 08: Counterfactual Merge Simulator

## One-liner

PR을 머지한 척 가상 인덱스를 만들어, 그 PR이 들어간 **이후의 dot-field**를 미리 보여준다. diff가 아니라 diff 이후의 우주를 본다.

## Problem Statement

머지 결정의 99%는 diff를 읽고 끝난다. 그런데 diff는 "이 변경 자체"만 보여준다.
정작 위험한 건 변경 이후에 일어나는 것들이다.

- 이 PR이 들어가면 **다른 어떤 파일**의 blast radius가 커지나
- 지금까지 안 걸리던 admission rule이 **새로 trip**하나
- 이 변경 때문에 **cross-team approval**이 필요해지는 모듈이 생기나
- 새로운 taint source/sink 경로가 열리나
- 커버리지가 떨어지는 영역이 어디 새로 생기나

지금 시장에서 풀고 있는 도구들:

- GitHub PR review: diff만 본다. 머지 후 세계는 모른다.
- merge queue: 빌드/테스트 통과 여부만 본다. 의미적 영향은 안 본다.
- Bazel target diff: 영향 받는 타겟 목록을 준다. 그 타겟 안에서 무엇이 변하는지는 안 준다.
- Cody: diff를 설명한다. 시뮬레이션이 아니다.

즉 모두가 **"PR이 어떻게 생겼는가"**를 본다. 우리는 **"PR이 머지된 이후의 코드베이스"**를 본다.

## Why This Matters

`/intelligence`의 핵심 surface는 dot-field다. 파일/모듈을 점으로 깔고 hotspot, ownership, blast, admission 결과를 같은 좌표 위에 얹는다.

dot-field는 이미 **현재 상태**를 잘 보여준다. 그런데 머지 결정은 본질적으로 **현재와 미래의 비교**다. 이 비교가 빠진 채로 dot-field를 머지 컨텍스트에서 쓰면 다음 질문에 답할 수 없다.

- "이 PR을 넣으면 이 점이 더 빨개지나, 식나?"
- "다른 점들 중에 이 PR 때문에 새로 빨개지는 게 있나?"
- "이 PR을 안 넣으면 어떻게 되지?"

답을 주려면 한 가지 방법뿐이다 — **PR을 가상으로 머지한 인덱스를 만들고, 그 인덱스 위에서 dot-field를 다시 계산해서, delta만 보여주는 것**.

이 방향이 맞는 이유:

- 머지 직전이 가장 비싼 의사결정 시점이다 — 머지 후엔 되돌리기가 비싸다
- 우리 엔진은 incremental analysis가 가능하다 — 가상 인덱스를 풀로 다시 만들 필요 없다
- delta는 본질적으로 작다 — 시각적으로도 압축이 잘 된다

## Moat

merge queue / GitHub PR view / Bazel diff는 commodity다. 그것들로는 다음을 못 한다.

> We don't show the diff. We show **the universe after the diff** — typed,
> evidence-backed, comparable to the current universe in the same coordinate
> space.

구체적으로:

1. **typed evidence가 가상 인덱스 위에서 다시 흐른다**. taint path, blast radius, admission rule, ownership delta 모두 같은 EvidenceItem schema로 떨어진다 (Feature 04에서 정의한 schema와 호환). diff 텍스트 한 줄짜리 LLM 요약이 아니다.
2. **virtual index가 분석 단위로 swap 가능하다**. 우리 엔진은 incremental_analysis로 PR 패치를 인덱스 위에 layered하게 얹는다. 같은 좌표계에서 before/after를 비교할 수 있는 건 우리뿐이다.
3. **dot-field 좌표 안정성**. 점의 위치는 머지 전후에 바뀌지 않는다 (좌표는 file path / module / cluster 기반). 즉 같은 점이 색만 바뀌므로 사용자가 1초 안에 "이 점이 변했다"를 본다. GitHub diff처럼 줄 단위 컨텍스트로 헤매지 않는다.
4. **delta 0이 assertion이 된다**. "no risk delta — safe to merge"는 mock copy가 아니라 분석 산출물이다. Bazel은 "affected targets = 0"를 줄 뿐, "의미적 영향 = 0"을 단언할 수 없다.

즉 commodity 머지툴이 "괜찮아 보입니다"를 말할 때, 우리는 **타입을 가진 증거로 "괜찮다"를 단언**한다.

## 기술 배경

핵심 엔진 자산:

- `change_impact_analysis` — PR 패치를 입력으로 받아 영향 노드 집합 계산
- `taint_flow` — source/sink 경로 재계산. virtual index 위에서 diff를 낸다
- `graph_path` — call graph 경로의 추가/삭제
- `dependency_reasoning` — dependency 변화 → blast 재계산
- `incremental_analysis` — patch overlay 기반의 가상 인덱스 스냅샷
- `index_status` — virtual index 자체의 freshness/coverage 추적

counterfactual은 최소 5개 delta lane을 다뤄야 한다.

1. **structural delta**
   - import / call graph edge 추가/삭제
2. **blast delta**
   - 각 노드의 blast radius 변화량 (다른 PR이 아닌, OTHER 파일들의 blast가 어떻게 변하나)
3. **admission delta**
   - 새로 trip하는 admission rule, 더 이상 안 걸리는 rule
4. **ownership delta**
   - 머지 후 cross-team approval path가 새로 필요한 모듈
5. **proof delta**
   - taint path 추가/삭제, coverage 영역 변화, dispatch overapprox가 새로 생기는 지점

중요: **delta가 0인 lane은 명시적으로 "no delta"로 표시**해야 한다. 빈 영역으로 두면 "분석이 안 끝난 건지, 정말 0인지" 구분이 안 된다 (Feature 04의 unknown 슬롯 강제와 같은 원칙).

추천 내부 단위:

- `MergeSimulation` — 한 PR(또는 PR stack)에 대한 시뮬레이션 루트
- `VirtualIndex` — 패치가 얹힌 가상 인덱스 핸들
- `DeltaLane` — 5개 lane 중 하나
- `DotDelta` — 좌표(점) 단위 변화량
- `RuleProbe` — what-if rule 추가/제거 실험

## 제안 기능

### 1. Virtual Index Build

PR을 우클릭하거나 diff를 붙여넣으면 가상 인덱스를 빌드한다.

- input
  - `prRef` (host/owner/repo/pr#) 또는 raw unified diff
  - 베이스 SHA (default: PR base)
- 진행 상태가 사용자에게 보여야 한다
  - `queued` → `applying_patch` → `incremental_indexing` → `ready` → `failed`
- 가상 인덱스는 ephemeral하다 — UI 세션 종료 시 폐기. 디스크에 안 남긴다 (LLM/RAG와 다르게 실제 코드 인덱스이므로 leak 위험이 다르다).
- 같은 PR을 두 번 시뮬레이션하면 캐시 히트 (PR head SHA 기반)

### 2. Split Dot-Field Delta Visualization

핵심 surface다.

- 좌측: 현재 dot-field (변경 없음)
- 우측: post-merge dot-field
- **공통 좌표계**. 같은 모듈은 같은 좌표를 갖는다
- delta가 있는 점만 pulse 애니메이션 — 나머지는 정적
- pulse 색상 의미
  - 빨강 pulse: 위험 ↑ (blast 확대 / rule trip / approval 추가 / taint 추가)
  - 청록 pulse: 위험 ↓ (rule 해소 / taint 차단 / coverage 향상)
  - 보라 pulse: 의미적 변화는 있으나 risk 방향이 모호 (예: ownership만 이동)
- 5개 lane 토글이 우상단에 칩으로. 켜진 lane만 pulse.
- delta가 0이면 화면 중앙에 banner: **"no risk delta — safe to merge"** + 분석 근거 4줄 (어떤 lane을 어떻게 비교했는지)

### 3. What-if Rule Probe

이게 진짜 차별점이다. 머지 후의 admission rule 동작을 미리 시험한다.

- "지금 없는 rule을 PR이 들어간 세계에 추가하면?" / "지금 있는 rule을 빼면?"
- 예
  - "타입 A → B 캐스팅 금지 rule을 추가했을 때, 이 PR은 trip하나?"
  - "now-stale ownership을 reject하는 rule을 추가하면 이 PR이 막히나?"
- 결과는 dot-field 위에 trip한 점만 highlight + RuleTrip 카드 (rule id, where, why, suggested mitigation)
- 이건 머지 의사결정뿐 아니라 **rule 설계 자체의 sandbox**가 된다. 정책 팀이 "이 rule을 켜면 어떤 PR이 막히지?"를 미리 테스트한다.

### 4. Batched PR Stack Simulation

stacked PR (Feature 05의 refactor stack)을 한 번에 시뮬레이션한다.

- 입력: PR n개 + 의도 순서
- 각 step별 cumulative delta + per-step delta
- "step 2가 step 3의 blast를 어떻게 바꾸나" — 즉 stack 내부 상호작용을 본다
- 출력
  - 각 step의 dot-field (좌→우 슬라이더 형태)
  - "이 stack은 순서를 바꾸면 더 안전합니다 (rule trip이 step 1에서 모두 해소됨)" 같은 reorder suggestion

### 5. Counterfactual Evidence Handoff

시뮬레이션 결과 → Feature 04 investigation으로 한 클릭 점프.

- 우측 dot의 새 빨강 pulse를 클릭하면 EvidenceItem 묶음이 뜬다
- "이 변화에 대한 조사 시작" 버튼 → InvestigationTarget으로 push
- evidence schema는 Feature 04와 동일 (kind만 추가: `counterfactual_blast_delta`, `counterfactual_rule_trip`, `counterfactual_taint_added`, ...)

## AI-native 설계

이 기능은 챗봇이 아니라 **시뮬레이션 엔진의 surface**다. 다만 AI가 다음을 해야 한다.

1. **delta 요약을 자연어로 한 문단**. 단, 반드시 evidence id에 anchored. "blast가 늘었다"가 아니라 "module X의 blast가 12 → 47로 늘어남 (evidence: cf_blast_X)".
2. **risk verdict는 결정론적**으로 계산하고 (rule), 자연어 설명만 LLM. verdict와 설명이 어긋날 수 없는 구조 (verdict는 LLM 입력에 포함시키지 않음 — 사후적으로 보여주기만 함).
3. **reorder suggestion**은 stack simulation 위에서 deterministic 검색으로 1차 추천 → LLM이 "왜 이 순서가 더 안전한가" 설명만 추가.
4. **unknown 표시 강제**. 가상 인덱스가 partial이거나 dispatch overapprox가 새로 생긴 영역은 lane별로 unknown 마커가 떠야 한다. 답변 전체를 "괜찮아 보임"으로 미장하지 않는다.

좋은 흐름:

- 개발자: PR #4221 우클릭 → "Simulate merge"
- 시스템: virtual index build → 5 lanes 비교 → split dot-field 렌더
- 사용자: 우측에 빨강 pulse 3개 → 그중 1개 클릭
- 시스템: "module checkout/payment의 blast가 18 → 73으로 증가. 원인: shared/policy.ts의 새 export가 7개의 transitive 호출자를 만들어냄."
- 사용자: "Investigate" 버튼 → Feature 04 surface로 점프

즉 시뮬레이션은 **decision support primitive**지, 챗 답변이 아니다.

## 리팩토링 / 아키텍처 영향

이 기능은 새 도메인이다. 기존 슬라이스에 박지 않고 분리한다.

필수 분리:

1. **simulation model** — MergeSimulation, VirtualIndex, DeltaLane, DotDelta, RuleProbe 타입과 store
2. **engine bridge** — `simulateMerge(prRef)` swap point. mock first; backend가 붙으면 시그니처 그대로 교체
3. **delta visualization** — split dot-field 렌더 layer (기존 dot-field 컴포넌트를 lift하지 않고 wrap)
4. **handoff** — Feature 04 investigation으로의 evidence pass-through

새 frontend 슬라이스:

- `features/counterfactual/model` — store, types, status machine
- `features/counterfactual/engine-bridge` — `simulateMerge`, `probeRule`, `simulateStack` 추상 인터페이스. Phase 1은 mock fixture로 충족.
- `features/counterfactual/ui` — SplitDotField, DeltaLaneToggles, NoDeltaBanner, RuleProbePanel, StackSlider, EvidencePopover

새 entity:

- `entities/counterfactual` — MergeSimulation / DeltaLane / DotDelta / RuleProbe / VirtualIndexSnapshot 타입과 fixture

기존 슬라이스에 대한 영향:

- `features/inspect-target/pr` — 우클릭 메뉴에 "Simulate merge" 항목 추가 (slot prop). 자체는 counterfactual을 모름.
- `features/admission-rules` — RuleProbe가 admission-rule schema를 재사용. import 방향은 counterfactual → admission-rules (단방향 유지).
- `features/ownership-routing` — ownership delta lane은 ownership entity의 OwnershipNode를 type-only import. UI는 자체 컴포넌트로 렌더 (서로 god-component 안 만들기).
- `features/change-planner` — blast delta는 change-planner가 이미 정의한 BlastResult shape를 type-only import.
- `features/apply-overlay` — overlay와는 surface가 다르다. apply-overlay는 "이 점에 분석을 입혀라", counterfactual은 "이 점의 미래를 비교하라". 코드 재사용 없음. 단, OverlayPopover(`features/apply-overlay/ui/OverlayPopover.tsx`)의 popover layout primitive는 EvidencePopover에서 참고만 한다 (직접 import 안 함 — popover는 shared로 추출하기에는 caller가 둘뿐이므로 일단 분리 유지).

## UI/UX 코멘트

이 섹션은 [00-uiux-science-guide.md](docs/plans/may-9-feature-plan/00-uiux-science-guide.md)를 인용한다. counterfactual의 핵심 UX 도전: **두 우주를 동시에 보는데 시각적으로 안 시끄럽게** 만드는 것.

### 1. Split dot-field — position-locked symmetry

가이드 §1.1에 따라 *position*은 가장 강력한 preattentive feature다. 좌/우 두 dot-field가 **동일 viewport, 동일 zoom, 동일 pan (lock-step)**으로 묶여야 사용자의 시선이 같은 좌표를 양쪽에서 동시에 처리할 수 있다 (visual correspondence; Ware 2012).

- 한쪽 zoom → 다른 쪽도 즉시 zoom (transition 0ms — lock-step은 latency가 곧 깨짐).
- pan/zoom 구현은 SVG `viewBox` 또는 canvas matrix 사용. CSS `transform`은 backdrop-filter ancestor 체인을 죽이므로 금지 (memory rule + 가이드 §4.2).
- 두 field 사이 split bar는 **8px gap + 1px hairline** (alpha 0.18). 굵은 separator는 두 우주의 비교를 끊는다.

### 2. Delta encoding — motion as the only signal

가이드 §1.2 (한 surface 한 motion). delta는 **motion 단독**으로 인코딩 — hue 사용 안 함.

- delta 점: ripple animation, period 1.2s, opacity 0.0 → 0.4 → 0.0.
- non-delta 점: 정적 (motion 없음) → 사용자 시선이 자동으로 delta로 끌림 (preattentive motion, Bartram 2001).
- delta 50개 초과 → top-20 (severity desc)만 pulse, 나머지는 stationary outline ring (size = preattentive 보조 채널).
- direction (위험 +/-)은 **icon shape**으로: ▲ (위험 증가), ▼ (위험 감소), ◇ (변화 없음 / unknown). 색이 아닌 모양 (가이드 §3.1).

### 3. "no risk delta" assertion banner

가이드 §10 안티패턴 회피: toast로 critical info 안 줌. banner는 **glass panel, 영속, 화면 중앙**.

- left colored stripe 0% (memory rule + 가이드 §3.3).
- 구성: assertion text (semibold 17px) + 5-lane 근거 list (각 lane 이름 + "delta 0" numeric) + "snapshot 보기" 토글 (Hick's Law: 액션 1개; 가이드 §2.2).
- WCAG AA 4.5:1 contrast on glass (가이드 §4.1). alpha 0.30–0.45 dark / 0.50–0.70 light.

### 4. Glass 제약 (가이드 §4)

- SplitDotField 두 패널 / RuleProbePanel / EvidencePopover / NoDeltaBanner — 모두 동일 GlassCard 모듈 (memory × 20+).
- 부모 체인 transform/filter/perspective 금지. pan/zoom은 SVG/canvas 좌표계로 구현.
- alpha 가독성 부족 시 alpha 안 올림. text weight + size로 (가이드 §4.1).

### 5. Lane toggle — Cowan 4±1 (가이드 §2.1)

5개 lane (Structural / Blast / Admission / Ownership / Proof)은 4±1 한도 경계. 따라서:
- **default**: Structural + Blast 2개만 활성. 나머지는 chip은 보이되 비활성 (Hick's: 의미 결정 부담 ↓; 가이드 §2.2).
- 사용자가 enable한 lane은 localStorage persist.
- chip = icon + text (가이드 §3.1, color 없이). 활성 = backdrop alpha +0.1, 비활성 = opacity 0.5 (Norman 2013 signifier; 가이드 §7.3).

### 6. Stack simulation slider

화면 하단 thin slider, height 44px (Fitts's Law 모바일 기준 minimum target; 가이드 §2.3).
- step 0 (현재) → step n (모든 PR 머지 후). drag 시 우측 dot-field 보간 — 좌측은 항상 현재 (anchor).
- 슬라이더 위 timeline ticks: 각 step마다 PR id + 머지 시각 (numeric, 색 없이).
- drag duration이 0.4s 초과면 (Doherty Threshold; 가이드 §5) 보간 중간 frame을 fade로 부드럽게.

### 7. EvidencePopover — Feature 04와 시각적 동족

dot 클릭 → 5-lane mini-card stack. Feature 04 EvidenceCard와 **동일 component family** 사용 (typography 14/12, confidence dot 0/25/50/75/100% fill, staleness pill, source tool chip).
- popover 위치: dot의 우측 12px gap (Fitts: 가까움). viewport 우측 경계에 닿으면 좌측으로 자동 flip.
- 진입 motion: ease-out 200ms scale 0.95 → 1.0 + opacity (가이드 §5).

### 8. Unknown 영역 — dotted outline

가이드 §1.1 (shape으로 인코딩). dispatch overapprox / runtime missing 등 비교가 약한 영역은 **dotted ring** (5,3 dash) + 중앙 `?` glyph. tooltip에 정확한 whyPartial 텍스트.
색 없이 모양만으로 "여기는 약하다"가 preattentive하게 드러남.

### 9. Motion 표 (가이드 §5)

| 이벤트 | duration | easing |
|---|---|---|
| dot delta pulse | 1200ms loop | ease-in-out (sin) |
| lane toggle chip on/off | 120ms | ease-out |
| EvidencePopover open | 200ms | ease-out |
| stack slider drag interpolation | 80ms (frame) | linear |
| no-risk banner fade-in | 240ms | ease-out |

`prefers-reduced-motion: reduce` (가이드 §5.3, WCAG 2.3.3): pulse → fade-only 480ms breathing. slider interpolation → step jumps without inter-frame fade. 정보 손실 0.

### 10. Surface cheat (가이드 §8)

| 채널 | 사용 |
|---|---|
| Primary preattentive | position (lock-step) + motion (delta pulse) |
| Direction encoding | shape (▲ ▼ ◇) — color 없음 |
| Cognitive load | default 2 lane, max 5 (확장 시 사용자 opt-in) |
| Motion | 1 surface 1 motion 원칙 — pulse 동안 다른 motion 정지 |

### 11. 검증 (가이드 §9)

- color-blind sim: ▲▼◇ shape이 보존되는지.
- WCAG AA: NoDeltaBanner / EvidencePopover 텍스트 4.5:1.
- time-to-first-glance: 사용자가 split을 본 후 *어디가 변했는지* 식별 <2s (eye-tracking 또는 click-test).
- prefers-reduced-motion ON에서도 delta 위치/방향 손실 0.

## 검증된 외부 패턴과 차이점

검증된 패턴:

- **GitHub merge queue** — 머지 직전에 빌드/테스트를 다시 돈다. 의미적 영향은 안 본다. 우리는 의미적 delta까지 본다.
- **Bazel target diff** — affected targets 목록을 준다. 그러나 (a) 좌표 비교가 없고 (b) 영향의 종류(taint/ownership/admission)가 구분되지 않는다. 우리는 lane 분리.
- **Sourcegraph Cody** — diff를 자연어로 설명한다. 시뮬레이션이 아니다. evidence schema가 없다.
- **Graphite** — stacked diff workflow가 있지만 stack 내부의 의미적 상호작용은 보지 않는다. 우리 stack simulation은 "step 2가 step 3의 blast를 줄임" 수준까지 본다.
- **Snyk / SonarQube** — 머지 후 정적 분석 결과 delta를 보여준다. 그러나 (a) dot-field 같은 좌표계가 없고 (b) admission rule 같은 user-defined policy probe가 없으며 (c) 가상 인덱스가 ephemeral하지 않고 디스크에 남는다.

우리가 더 갈 부분:

- typed evidence가 lane을 가로질러 흐른다
- 가상 인덱스는 ephemeral, leak 없음
- rule probe sandbox로 정책 설계까지 흡수
- Feature 04 investigation과 evidence schema 호환

## 성공 지표

### 단기 (leading)

- "Simulate merge" 클릭률 (PR 우클릭 메뉴 노출 대비)
- post-merge dot-field 본 후 머지 취소 비율 (위험 잡아냈다는 시그널)
- "no risk delta" banner 노출 후 즉시 머지 비율 (assertion 신뢰도)
- rule probe 사용 횟수 / 사용자
- stack simulation에서 reorder suggestion 채택률

### 장기 (lagging)

- 머지 후 revert PR 비율 감소 (특히 cross-team 영향)
- admission rule 신규 도입 속도 (probe sandbox가 도움)
- incident root cause가 "머지 후 처음 본 영향"인 비율 감소
- 머지 결정 latency (정보 수집 시간이 줄어드는지)

## 출시 순서

### Phase 1 — single-PR delta on dot-field

범위 좁힘. 목표: **하나의 PR에 대해 split dot-field가 뜨고, 5개 lane 중 blast/structural 2개만 정확히 보여주는 것**.

- `MergeSimulation` schema 확정
- PR 우클릭 → mock virtual index build (fixture 기반 status 전이)
- split dot-field 렌더 + lock-step pan/zoom
- 2개 lane만 (structural, blast). 나머지 3개는 토글에 보이지만 "coming soon" pill
- "no risk delta" banner (delta 0 케이스)
- EvidencePopover 1단계 (dot 클릭 → 그 점의 2개 lane delta만)

### Phase 2 — rule probe + 나머지 lane

- admission, ownership, proof lane 추가
- RuleProbePanel: 가상 rule add/remove → trip 결과
- EvidencePopover 5 lane 전부
- counterfactual → investigation handoff (evidence pass-through)
- unknown 영역 (overapprox / partial index) 시각화

### Phase 3 — PR stack simulation + reorder suggestion

- StackSlider UI (step별 cumulative delta)
- step 간 상호작용 분석 (step k가 step k+1의 blast를 줄이는가)
- AI reorder suggestion (deterministic search + LLM rationale)
- Feature 05의 refactor stack과 양방향 wiring (stack planner가 만든 stack을 그대로 시뮬레이션 가능)
- raw diff paste 입력 (PR ref 외에 unified diff 텍스트로도 시뮬레이션 시작 가능)

## Frontend 구현계획 (백엔드 제외)

백엔드는 별도 트랙. 이 섹션은 모든 phase를 frontend feature slice 단위로 풀어 쓴다. mock data는 [src/entities/counterfactual/](src/entities/counterfactual/)의 fixtures로 둔다 — backend가 붙으면 schema 매칭만 맞으면 swap.

### 0. 사전 정리 (모든 phase 공통)

- [src/features/counterfactual/](src/features/counterfactual/) 하위에 `model`, `engine-bridge`, `ui` 슬라이스 3개 생성
- [src/entities/counterfactual/](src/entities/counterfactual/) 신규 entity. 타입 + fixture
- [src/features/inspect-target/pr/](src/features/inspect-target/pr/)에 "Simulate merge" 메뉴 슬롯 prop 1개만 추가. inspect-target은 counterfactual을 import하지 않는다 (역방향 의존 금지).
- `features/admission-rules`, `features/ownership-routing`, `features/change-planner`는 **type-only import**만 허용. 런타임 코드 의존은 entity 레벨 fixture로 격리.

### Phase 1 — single-PR delta on dot-field

#### 1.1 entity 정의 — [src/entities/counterfactual/](src/entities/counterfactual/)

`model/types.ts` — 핵심 타입. **그대로 옮겨붙일 수 있는 수준**의 TS로 고정한다.

```ts
// branded id types
export type SimulationId = string & { readonly __brand: 'SimulationId' };
export type VirtualIndexId = string & { readonly __brand: 'VirtualIndexId' };
export type DotDeltaId = string & { readonly __brand: 'DotDeltaId' };
export type RuleProbeId = string & { readonly __brand: 'RuleProbeId' };

// PR 식별자. host는 미래의 self-hosted 대비.
export interface PrRef {
  host: 'github' | 'gitlab' | 'bitbucket' | 'self';
  owner: string;
  repo: string;
  number: number;
  headSha: string;       // 캐시 키
  baseSha: string;
}

// raw diff 입력도 같은 simulator에 들어가야 하므로 union으로 입력 surface 정의
export type SimulationInput =
  | { kind: 'pr'; ref: PrRef }
  | { kind: 'raw_diff'; baseSha: string; unifiedDiff: string };

export type SimulationStatus =
  | 'queued'
  | 'applying_patch'
  | 'incremental_indexing'
  | 'ready'
  | 'failed';

export interface VirtualIndexSnapshot {
  id: VirtualIndexId;
  baseSha: string;
  headSha: string;
  ephemeral: true;       // 디스크에 안 남긴다는 의미적 마커
  builtAt: string;       // ISO
}

// 5 lanes — discriminated union으로 lane 종류와 payload를 같이 묶는다.
export type DeltaLaneKind =
  | 'structural'
  | 'blast'
  | 'admission'
  | 'ownership'
  | 'proof';

// 점 단위 변화. 좌표는 dot-field가 가진 것과 동일 (NodeId).
// NodeId는 dot-field 쪽 entity에서 정의됨. 여기서는 type alias로만 받는다.
export type NodeId = string & { readonly __brand: 'NodeId' };

// risk 방향. 0 lane이라도 explicit 'unchanged'로 표현 — 빈 슬롯 금지.
export type RiskDirection = 'up' | 'down' | 'mixed' | 'unchanged' | 'unknown';

// lane별 payload 분리 — discriminated union
export type DotDeltaPayload =
  | {
      lane: 'structural';
      addedEdges: number;
      removedEdges: number;
      examples: { from: NodeId; to: NodeId; op: 'add' | 'remove' }[];
    }
  | {
      lane: 'blast';
      before: number;
      after: number;
      affectedNodes: NodeId[];
    }
  | {
      lane: 'admission';
      newlyTrippedRuleIds: string[];
      resolvedRuleIds: string[];
    }
  | {
      lane: 'ownership';
      addedTeams: string[];
      removedTeams: string[];
      newCrossTeamApproval: boolean;
    }
  | {
      lane: 'proof';
      addedTaintPaths: { source: string; sink: string; hops: number }[];
      removedTaintPaths: { source: string; sink: string; hops: number }[];
      coverageDeltaPct: number; // -100..+100
      newOverapprox: boolean;
    };

export interface DotDelta {
  id: DotDeltaId;
  node: NodeId;          // 좌표 — 좌/우 dot-field에서 동일
  direction: RiskDirection;
  severity: number;      // 0..1, pulse 우선순위 산출용
  payload: DotDeltaPayload;
}

// lane 단위 집계. 빈 lane도 'unchanged'로 명시.
export interface DeltaLane {
  kind: DeltaLaneKind;
  direction: RiskDirection;
  deltas: DotDelta[];    // 빈 배열이면 direction === 'unchanged' 또는 'unknown'
  whyPartial:
    | 'none'
    | 'index_partial'
    | 'overapprox'
    | 'rule_set_missing'
    | 'ownership_stale';
}

export interface MergeSimulation {
  id: SimulationId;
  input: SimulationInput;
  status: SimulationStatus;
  virtualIndex: VirtualIndexSnapshot | null;  // status === 'ready'일 때만 non-null
  lanes: DeltaLane[];                         // 항상 5개 (lane 누락 금지)
  startedAt: string;
  finishedAt: string | null;
  // 'no risk delta' assertion. 모든 lane이 'unchanged'면 true.
  // 단순 .every()로 도출하지 않고 별도 필드로 박아둠 — UI가 derive 로직 갖지 않게.
  noRiskDelta: boolean;
}

// rule probe (Phase 2부터 사용; 타입은 Phase 1에 미리 박아둔다)
export interface RuleProbeSpec {
  op: 'add' | 'remove';
  ruleId: string;        // admission-rules entity의 RuleId와 align
  ruleBody?: string;     // op === 'add'일 때 사용
}

export interface RuleProbeResult {
  id: RuleProbeId;
  spec: RuleProbeSpec;
  trippedNodes: NodeId[];
  resolvedNodes: NodeId[];
  rationale: string;     // <= 240 chars
}
```

검증 정책:

- `lanes.length === 5` 강제 — `assertSimulationShape(sim)` runtime check
- `noRiskDelta`는 store에서 set; UI는 read-only
- `DotDelta.payload.lane`과 lane 컨테이너의 `kind`가 같아야 함 (validator에서 매칭 검증; TS 타입만으로는 강제 못 함)

`model/fixtures.ts` — Phase 1 demo용 mock simulation 2종 (delta 있음 / 없음). 모든 id는 brand cast helper.

#### 1.2 store + engine bridge — [src/features/counterfactual/model/](src/features/counterfactual/model/) + [src/features/counterfactual/engine-bridge/](src/features/counterfactual/engine-bridge/)

- `CounterfactualContext.tsx` — provider + hook (`useCounterfactual`)
  - state: `{ simulation: MergeSimulation | null, hoveredDelta: DotDeltaId | null }`
  - actions: `start(input)`, `cancel()`, `dismiss()`, `setHovered(id)`
- `engine-bridge/simulateMerge.ts` — `simulateMerge(input: SimulationInput): Promise<MergeSimulation>`
  - Phase 1은 fixture 기반. setTimeout으로 status 전이만 mock.
  - **이 함수가 백엔드 트랙과의 swap point**. 시그니처는 변하지 않음.
- `engine-bridge/probeRule.ts` — `probeRule(simId, spec): Promise<RuleProbeResult>` — Phase 1엔 stub만 export, throw `not_implemented`. Phase 2에서 mock 구현.
- `engine-bridge/simulateStack.ts` — `simulateStack(inputs: SimulationInput[]): Promise<MergeSimulation[]>` — Phase 1엔 stub.

#### 1.3 routing / providers

- `<CounterfactualProvider>`를 **AppProviders에 올리지 않는다**. counterfactual은 dot-field surface 전용이고, 전역으로 올리면 (a) 다른 라우트에서도 ephemeral virtual index 핸들이 잡혀 상태가 새고, (b) lazy split 경계가 무너진다.
- 대신 [src/app/router/intelligence/IntelligenceLayout.tsx](src/app/router/intelligence/IntelligenceLayout.tsx) 안쪽에 `<CounterfactualProvider>`를 마운트한다. Feature 04의 `<InvestigationProvider>`와 같은 위치 (둘 다 IntelligenceLayout-scoped). 라우트 unmount = provider unmount = simulation cleanup.
- counterfactual UI는 lazy import. `useCounterfactual`을 호출하는 컴포넌트만 simulation이 시작된 시점에 mount.

#### 1.4 PR 진입점 — [src/features/inspect-target/pr/](src/features/inspect-target/pr/)

- inspect-target/pr의 PR row context menu에 슬롯 prop 추가:

```ts
export interface PrRowMenuSlots {
  onSimulateMerge?: (ref: PrRef) => void;
}
```

- IntelligenceLayout이 이 슬롯에 `(ref) => counterfactual.start({ kind: 'pr', ref })`를 주입.
- inspect-target/pr 자체는 counterfactual을 import하지 않는다 (단방향 의존).

#### 1.5 split dot-field 렌더 — [src/features/counterfactual/ui/](src/features/counterfactual/ui/)

- `SplitDotField.tsx` — 좌/우 두 viewport. 기존 dot-field 컴포넌트를 wrap.
  - 좌: 현재 데이터 (counterfactual 모름)
  - 우: simulation의 lanes에서 delta가 있는 노드만 색 변경 + pulse
  - lock-step pan/zoom — 한쪽 transform 변경 시 다른 쪽 동기화. **단, 각 dot-field 자체의 컨테이너에 `transform`을 주지 않는다** (memory rule: backdrop-filter 부모 transform 금지). pan/zoom은 내부 SVG `viewBox` / canvas matrix로 구현 — CSS transform 안 씀.
- `DeltaLaneToggles.tsx` — 5 lane chip. Phase 1은 structural / blast 2개만 active, 나머지 3개는 disabled chip + "coming soon" tooltip.
- `NoDeltaBanner.tsx` — `simulation.noRiskDelta === true`일 때 화면 중앙에 glass panel. 4줄 근거. **좌측 stripe 금지**. GlassCard 공유 모듈 사용 (FilterBar / Inspect 패널과 동일 모듈).
- `DotPulseLayer.tsx` — pulse animation. severity 기준 top-N (default 20) 만 pulse, 나머지는 stationary highlight.
- `EvidencePopover.tsx` — dot 클릭 시 popover. Phase 1은 structural / blast 2 lane만 mini-card. Feature 04의 EvidenceCard와 동족 룩 (confidence dot, staleness pill, source tool 배지). [src/features/apply-overlay/ui/OverlayPopover.tsx](src/features/apply-overlay/ui/OverlayPopover.tsx)는 layout 참조만, import 안 함.
- `SimulationStatusStrip.tsx` — `queued → applying_patch → incremental_indexing → ready` 진행 표시. failed 시 reason badge + "다시 시도".

#### 1.6 스타일 가드 (memory rules 반영)

- 좌측 컬러 stripe 금지 — SplitDotField, NoDeltaBanner, EvidencePopover, SimulationStatusStrip 모두 적용
- glassmorphism 유지 (alpha 0.3–0.45 dark / 0.5–0.7 light)
- IntelligenceLayout 좌측 FilterBar / 우측 Inspect 패널과 동일 GlassCard 모듈 공유
- backdrop-filter는 부모에 transform/filter/perspective 없는 컨테이너 위에서만 (pan/zoom은 viewBox로)

#### Phase 1 완료 조건

- [ ] PR row 우클릭 → "Simulate merge" → status strip이 fixture 기반으로 전이
- [ ] split dot-field가 좌/우 lock-step으로 pan/zoom
- [ ] structural / blast 2 lane의 delta가 우측에서 pulse
- [ ] delta 0 fixture에서 NoDeltaBanner가 4줄 근거와 함께 노출
- [ ] EvidencePopover가 dot 클릭 시 2 lane mini-card 표시
- [ ] AppProviders에 CounterfactualProvider 없음 (IntelligenceLayout 안에서만 mount)

---

### Phase 2 — rule probe + 나머지 3 lane

#### 2.1 lane 확장

- `engine-bridge/simulateMerge.ts` mock에 admission / ownership / proof lane 채움
- DeltaLaneToggles의 3 chip을 active로
- EvidencePopover에 5 lane mini-card 모두

#### 2.2 RuleProbePanel — [src/features/counterfactual/ui/](src/features/counterfactual/ui/)

- `RuleProbePanel.tsx` — 우상단에 collapsible glass panel
- 입력 form: rule add (DSL textarea) / rule remove (rule picker — admission-rules entity에서 list 가져옴, type-only)
- 결과: `RuleProbeResult` → trip된 노드만 dot-field에서 highlight (별도 색)
- `engine-bridge/probeRule.ts` mock 구현

#### 2.3 unknown 시각화

- DeltaLane.whyPartial이 'none'이 아닌 lane은 chip에 dotted ring
- 해당 lane의 dot은 회색 outline + tooltip ("dispatch overapprox", "ownership stale" 등)

#### 2.4 investigation handoff

- EvidencePopover 하단에 "Investigate" 버튼
- 클릭 시 Feature 04의 `useInvestigation().start(target)` 호출
  - `target = { kind: 'symbol' | 'file', id: nodeId, label }`
  - evidence 묶음 pass-through: counterfactual의 DotDelta → investigation의 EvidenceItem으로 adapter
  - adapter는 [src/features/counterfactual/model/handoff.ts](src/features/counterfactual/model/handoff.ts)에 격리. evidence kind 추가: `counterfactual_blast_delta`, `counterfactual_rule_trip`, `counterfactual_taint_added`, `counterfactual_ownership_shift`, `counterfactual_structural_change`.
- IntelligenceLayout의 `activeRightSurface`가 `'investigate'`로 전환됨 (Feature 04의 IA 결정 따름).

#### Phase 2 완료 조건

- [ ] 5 lane 모두 delta가 보이고 EvidencePopover에서 mini-card로 노출
- [ ] RuleProbePanel에서 rule add/remove 시 trip된 노드 highlight
- [ ] partial index / stale ownership 영역이 dotted ring으로 표시
- [ ] "Investigate" 버튼이 Feature 04 surface로 evidence와 함께 점프

---

### Phase 3 — PR stack simulation + reorder

#### 3.1 StackSlider — [src/features/counterfactual/ui/](src/features/counterfactual/ui/)

- `StackSlider.tsx` — 화면 하단 thin slider. step 0..n
- `engine-bridge/simulateStack.ts` mock 구현 — 각 step별 MergeSimulation 배열
- 슬라이더 드래그 → 우측 dot-field가 해당 step으로 보간 (보간은 시각적 ease만; lane 데이터는 step 단위로 swap)

#### 3.2 reorder suggestion

- `model/reorderSearch.ts` — deterministic 검색. 가능한 stack 순열 중 cumulative severity가 작은 순서 top-3
- AI rationale은 LLM에 verdict를 입력으로 주지 않고, 결과만 자연어로 설명하게 (verdict-narration drift 방지)
- `ReorderSuggestionCard.tsx` — 추천 순서 + 한 문단 rationale + "이 순서로 보기" 버튼

#### 3.3 raw diff paste 입력

- `RawDiffInput.tsx` — modal. unified diff 텍스트 + base SHA 입력
- `simulateMerge({ kind: 'raw_diff', ... })`로 dispatch
- `entities/counterfactual/lib/diffValidate.ts` — 최소 검증 (filename header 존재, hunk header 존재). 자세한 파싱은 백엔드.

#### 3.4 Feature 05 wiring

- Feature 05의 refactor stack 결과를 그대로 simulateStack 입력으로 변환
- `model/fromRefactorStack.ts` adapter — Feature 05의 RefactorStep → SimulationInput
- 양방향 wiring: stack planner의 step 카드 우상단에 "Simulate this stack" 버튼

#### 3.5 polish

- empty state, error state, cancellation
- keyboard nav: stack slider에서 ←/→로 step 이동, dot-field에서 j/k로 delta 노드 순회
- accessibility: aria-live for status transitions, role="region" on each viewport

#### Phase 3 완료 조건

- [ ] StackSlider가 step별 cumulative delta를 반영
- [ ] reorder suggestion top-3 표시 + rationale 한 문단
- [ ] raw diff paste로 simulation 시작 가능
- [ ] Feature 05의 refactor stack에서 한 클릭으로 stack simulation 진입

---

### 모듈 의존성 그래프

```
entities/counterfactual
  ↑
features/counterfactual/model         ← (type-only) features/admission-rules,
  ↑                ↑                     features/ownership-routing,
  engine-bridge    ui                    features/change-planner
  ↑                ↑
  ui/SplitDotField + RuleProbePanel + StackSlider + EvidencePopover
  ↑
app/router/intelligence/IntelligenceLayout (← provider 마운트 위치, AppProviders 아님)
```

handoff edge:

```
features/counterfactual/model/handoff.ts
  → features/investigation (Feature 04)  // DotDelta → EvidenceItem 변환
features/counterfactual/model/fromRefactorStack.ts
  ← features/ownership-routing (Feature 05)  // RefactorStep → SimulationInput
```

inspect-target/pr → counterfactual은 **slot prop 한 방향만**. inspect-target은 counterfactual을 import하지 않는다.

### 손대지 않을 것

- [src/features/chat-agent/](src/features/chat-agent/) — 이 기능은 챗과 무관. 토큰 미터도 공유 안 함.
- [src/features/apply-overlay/](src/features/apply-overlay/) — surface가 다르다. 코드 의존 없음. OverlayPopover는 layout 참조만 (직접 import 금지).
- [src/features/admission-rules/](src/features/admission-rules/), [src/features/ownership-routing/](src/features/ownership-routing/), [src/features/change-planner/](src/features/change-planner/) — type-only import만. 런타임 의존 금지.
- [src/features/investigation/](src/features/investigation/) — handoff adapter를 통해서만 wiring. Feature 04 내부는 안 건드림.
- 기존 dot-field 컴포넌트 — wrap만 하고 lift 안 함. dot-field가 counterfactual을 모르는 채로 유지.

### 백엔드 트랙과의 contract

frontend-backend boundary는 정확히 3개 함수다.

```ts
// 단일 PR 시뮬레이션
export type SimulateMerge =
  (input: SimulationInput) => Promise<MergeSimulation>;

// rule probe (Phase 2부터)
export type ProbeRule =
  (simId: SimulationId, spec: RuleProbeSpec) => Promise<RuleProbeResult>;

// stack 시뮬레이션 (Phase 3부터)
export type SimulateStack =
  (inputs: SimulationInput[]) => Promise<MergeSimulation[]>;
```

추가 contract:

- `MergeSimulation.lanes.length === 5`는 백엔드도 강제. 빈 lane은 `{ kind, direction: 'unchanged', deltas: [], whyPartial: 'none' }`로 채움.
- `noRiskDelta`는 백엔드 산출. UI는 derive 안 함.
- `VirtualIndexSnapshot.ephemeral === true`는 단순 마커가 아니라 **백엔드가 인덱스를 디스크에 영속화하지 않음**의 contract. 세션 GC는 백엔드 책임.
- 모든 fixture는 [src/entities/counterfactual/model/fixtures.ts](src/entities/counterfactual/model/fixtures.ts) 한 곳에. 백엔드 붙으면 이 파일만 dead code화.
- LLM rationale (reorder suggestion)은 백엔드에서 사후 생성. verdict (severity, direction, noRiskDelta)는 LLM 입력에 포함하지 않는다 — verdict-narration drift 방지.

## Why Developers Will Care

지금 머지 결정의 본질은 "이 diff가 그럴듯한가"다. AI가 코드를 더 빨리 쓰게 되면서, 그럴듯한 diff는 점점 흔해진다. 그러면 머지 직전의 진짜 질문은 바뀐다.

> "이 PR이 들어간 이후의 코드베이스를 내가 진짜로 본 적이 있나?"

이 기능은 그 질문에 처음으로 정직한 답을 준다 — diff 위에 자연어 요약 한 단락이 아니라, **delta가 박힌 좌표 위에 typed evidence로**.

GitHub은 diff를 보여준다. 우리는 그 diff가 만든 **세계**를 보여준다. 이게 차이다.
