# UI/UX Science Guide (Features 07–13 공통)

이 문서는 Features 07–13 plan들의 "UI/UX 코멘트" 섹션이 인용하는 **과학적 ground truth**다. "예쁘게"가 아니라, *왜 이게 효과적인가*를 시지각/인지/HCI 연구로 정당화한다.

각 feature plan은 이 문서의 원칙을 인용하며 자기 surface에 적용한다 — 예: "preattentive feature로 motion을 사용 (이 가이드 §2.1)".

---

## 0. 디자인 철학 (한 문장 요약)

> **"색은 의미를 운반하지 않는다. 모양·위치·운동만이 의미를 운반한다."**

색은 *부수적 채널*로만 쓴다. 색맹 사용자(전체 8% 남성, 0.5% 여성), dark/light 테마, glassmorphism의 낮은 contrast 환경 모두에서 깨지지 않으려면 의미 채널을 **redundant encoding**으로 박아야 한다 (Ware 2012, *Information Visualization: Perception for Design*).

이게 우리 메모리 룰 "no left colored stripes"를 단순한 취향이 아니라 *과학적 일관성*으로 만든다.

---

## 1. 시지각 기초 — Preattentive Processing

Treisman의 preattentive feature 이론 (1985)에 따르면, 다음 채널들은 ~200ms 안에 의식적 주의 없이 처리된다:

| 채널 | 정확도 | 구분 가능 단계 |
|---|---|---|
| **Position** (2D 위치) | ★★★★★ | 사실상 무한 |
| **Length** (선의 길이) | ★★★★ | ~7단계 |
| **Angle / Slope** | ★★★ | ~6단계 |
| **Area** | ★★ | ~4단계 |
| **Motion** (movement, flicker) | ★★★★ | binary (있다/없다) 가장 강함 |
| **Hue** (색상) | ★★ | ~5단계, 색맹·테마에 약함 |
| **Saturation / Lightness** | ★★ | ~3단계 |

### 1.1 우리 surface에 적용
- **dot-field의 risk**: position과 motion(pulse)으로 표현. hue는 보조.
- **evidence freshness**: opacity decay (preattentive)와 numeric "Xh ago" (post-attentive verification) 둘 다 제공.
- **chat speaker 구분**: shape(아바타 도형) + position(들여쓰기) + chip text. hue는 마지막.

### 1.2 motion을 아끼기

preattentive에서 motion은 가장 강력하지만, **하나의 surface에 motion이 2개 이상이면 둘 다 약화**된다 (Bartram 2001). 따라서 한 surface에서 동시에 움직이는 요소는 **한 종류만**.

- counterfactual diff에서 delta pulse 동안에는 로딩 spinner를 멈춘다.
- chat에서 admission rule turn이 들어올 때 chip이 fade-in 하면, 같은 시점에 progress bar는 멈춘다.

---

## 2. 정보 밀도와 인지 부하

### 2.1 Miller (1956) 7±2 → Cowan (2001) 4±1

작업 기억은 동시에 **3–5개 chunk**만 유지한다. 따라서:

- evidence strip: 정확히 **3개**의 evidence (04 문서 정책과 일치 — `EvidenceTriple`).
- chat suggestion preset: 4개 (현재 chat-agent가 그대로 — Miller 한도 안).
- hypothesis market 한 화면: top **5개**까지, 나머지는 fold.
- whisperer ticker: 동시 노출 **3개**, 그 이상은 카운트 배지.

### 2.2 Hick's Law

선택지가 N개일 때 결정 시간 = `a + b·log₂(N+1)`. 선택지를 줄이면 결정이 빨라진다.

- investigation answer의 action 버튼: Phase 1은 **1개** (open_focus)만 활성. 나머지는 disabled로 *존재만* 보여줌 (사용자가 미래 가능성을 인지하되 결정 비용은 안 냄).
- counterfactual의 right-click 메뉴: 3개 이하.

### 2.3 Fitts's Law

타겟 도달 시간 ∝ `log₂(2D/W)`. 자주 쓰는 액션은 (a) 가깝게, (b) 크게.

- Investigate CTA: focus stack item 위에 직접 — 마우스 이동 거리 최소.
- regenerate CTA: evidence decay pill 안에 직접 박음 — pill 클릭이 곧 regenerate.

---

## 3. 색 시스템 — "의미 없는 색"

### 3.1 우리는 색으로 의미를 인코딩하지 않는다

다음 항목들은 **색이 아니라 다른 채널**로 인코딩된다:

| 의미 | 1차 채널 | 2차 채널 (검증용) |
|---|---|---|
| risk severity | size + position | numeric score |
| evidence staleness | opacity + clock icon | "Xh ago" text |
| confidence | dot fill 비율 (0/25/50/75/100%) | numeric % |
| speaker type (chat) | avatar shape + name chip | (no color) |
| blast tier | icon + text label | numeric caller count |
| admission severity | icon (info/warn/block glyph) + text | rule_id |
| hypothesis dominance | bar **width** animation | numeric score |
| answer mode | chip icon + text | (no color) |

### 3.2 색이 허용되는 곳

- **brand accent** (액션 강조용): 시스템 전체에 1개. 우리는 cyan-mint 한 가지.
- **테마 자체** (dark/light): hue가 아닌 lightness 대비.
- **glassmorphism의 ambient color**: 배경의 color bleed는 OK — 의미 없음.
- **diff red/green**: 코드 diff에서만, 그 외에서는 사용 금지.

### 3.3 명시적으로 금지

- **left colored stripe** — 어떤 surface에서도 금지 (memory rule × 3+ 경고). 색이 의미를 운반하기 시작하면 색맹/테마/contrast에서 깨짐.
- **status background color** (warning yellow card 전체 등) — chip + icon으로만.
- **두 개 이상의 brand accent** — 강조 위계가 무너짐.

---

## 4. Glassmorphism — 과학적 제약

Glassmorphism은 *depth perception*을 활용한 일관된 시각 언어지만, 잘못 쓰면 contrast가 무너진다.

### 4.1 측정 가능한 제약

- **dark theme alpha**: 0.30–0.45 (memory rule). 이보다 낮으면 텍스트 가독성, 높으면 glass 효과 죽음.
- **light theme alpha**: 0.50–0.70.
- **backdrop-filter blur**: 12–20px. 그 이상이면 ancestor transform 충돌 시 fallback이 보기 흉함.
- **WCAG 2.1 contrast ratio**: 본문 4.5:1, 대제목 3:1. glass 위에서도 *측정해서* 만족시킨다 — alpha를 올리는 게 아니라 **텍스트 색을 조정** (memory rule).

### 4.2 ancestor transform 함정

`backdrop-filter`는 부모 체인에 `transform: !none` 또는 `filter`/`perspective`가 있으면 죽는다 (memory rule). plan 문서들은 `InvestigatePanel` 등 chrome 패널을 추가할 때 ancestor 체인 검증을 명시한다.

### 4.3 GlassCard 모듈 공유

InspectPanel, FilterBar, InvestigatePanel, Whisperer ticker — 같은 모듈 인스턴스를 import 한다 (memory rule, 20+ warnings). 색·blur·corner-radius 일관성 자동 보장.

---

## 5. Motion 디자인 — Disney 12 원칙 → Material Motion

### 5.1 timing curves

- **enter**: `cubic-bezier(0.0, 0.0, 0.2, 1)` (ease-out, decelerate). 사용자에게 "도착했다" 감각.
- **exit**: `cubic-bezier(0.4, 0.0, 1, 1)` (ease-in, accelerate). "사라진다" 감각.
- **morph (state change)**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (standard).
- **금지**: `linear` (기계적), 1초 이상의 transition (사용자가 기다리게 됨).

### 5.2 duration 표

| 거리/규모 | duration |
|---|---|
| chip fade, dot pulse | 80–120ms |
| panel slide-in | 200–300ms |
| route transition | 300–400ms |
| onboarding hero motion | 600–800ms (1회성만) |

이상의 값들은 Doherty Threshold (400ms 미만 응답이면 사용자가 "즉시"로 인식, Doherty & Thadani 1982)와 Material Motion 가이드라인 합성.

### 5.3 reduced-motion 대응

`@media (prefers-reduced-motion: reduce)`에서 모든 motion은 **fade**로만 대체. counterfactual의 delta pulse도 fade로. WCAG 2.3.3 (Animation from Interactions) 준수.

---

## 6. Typography — 측정 기반

### 6.1 모듈러 스케일

base 14px, ratio 1.25 (Major Third):
`14 → 17.5 → 21.875 → 27.34 → 34.18 → 42.7`

→ 우리 사용: 12, 14, 17, 22, 28, 35.

### 6.2 측정 (measure)

한 줄 글자 수 **45–75자** (Bringhurst 2004, *The Elements of Typographic Style*). evidence summary `<= 140 chars` (04 doc 제약)는 약 2줄 분량 — 의도된 디자인.

### 6.3 계층

- 본문: regular 14px / line-height 1.5
- chip: medium 12px / line-height 1.0 (compact)
- code/id: monospace 13px (JetBrains Mono 권장)
- heading: semibold, 17/22/28

색이 아닌 **weight + size**로 위계. (메모리 룰과 합치)

---

## 7. Information Architecture 원칙

### 7.1 Right-column priority

`/intelligence` 우측 컬럼은 **주의의 종착지**다 (좌측은 필터, 중앙은 visualization, 우측은 detail/action). 따라서 우측 surface는 한 번에 하나만 mount (04 IA 결정과 일치).

- focus / investigate / counterfactual / pin-replay — 모두 우측 컬럼에서 **active surface 1개만**. 전환은 explicit toggle, split 금지.

### 7.2 Progressive disclosure

- **L1 (always visible)**: conclusion, evidence strip, primary action.
- **L2 (one click)**: full evidence detail, hypothesis list.
- **L3 (deeper)**: planner trace, raw tool output.

7±2 한도 안에 첫 화면을 묶기 위해 L1을 엄격히 제한.

### 7.3 권한과 시각

- disabled 액션은 **opacity 0.5** + cursor not-allowed. 숨기지 않음 — 사용자가 미래 가능성을 인지해야 한다 (signifier; Norman 2013).

---

## 8. Surface별 적용 cheat sheet

각 feature plan의 UI/UX 섹션은 이 표를 인용한다.

| Feature | Primary preattentive | Cognitive load 설계 | 색 사용 |
|---|---|---|---|
| 07 Evidence Decay | opacity + clock icon | 3 evidence 유지, decay pill 1개 | none — 시간은 모양·텍스트로 |
| 08 Counterfactual | motion (delta pulse) + position | split layout 강조 1, no extra widget | none — delta는 pulse |
| 09 Admission Bot | shape (avatar) + chip + position | speakers 4 이하, presets 4 유지 | none — speaker별 icon |
| 10 Pin Replay | timeline position + opacity | diff 3 카테고리(added/removed/changed) | none — 카테고리는 icon |
| 11 Whisperer | icon + text + numeric count | 동시 3 whisper, 그 이상 fold | none — severity는 icon |
| 12 Hypothesis Market | bar **width** + position | top 5만, 그 이하 fold | none — 점수는 width |
| 13 Blast-Aware Chat | chip icon + chip text on AI turn | tier 4단계 (small/med/large/cross) | none — tier는 icon+text |

---

## 9. 검증 방법

각 feature는 다음 4가지를 **측정**해 README나 Storybook story에 박는다 (subjective "예쁘다" 금지):

1. **Time-to-first-glance comprehension**: 사용자가 surface를 처음 보고 *무엇이 중요한지* 식별하는 데 걸리는 시간 (target: <2s, preattentive 기반).
2. **Color-blind safe pass**: Sim Daltonism (Protanopia/Deuteranopia/Tritanopia) 시뮬레이션에서 모든 의미가 보존되는가?
3. **WCAG AA contrast**: glass 위에서 4.5:1 (본문) / 3:1 (대제목).
4. **prefers-reduced-motion 대응**: motion 제거 시 정보 손실 0.

---

## 10. 안티패턴 모음 (이 가이드 위반 = 즉시 reject)

- 좌측 컬러 stripe (memory rule × 3+)
- 의미를 hue로만 인코딩
- 한 surface에 동시 motion 2개 이상
- glass alpha를 가독성 위해 0.45 초과로 올림
- linear easing, 600ms+ in-app transition
- toast로 critical info 전달 (사라지면 못 봄)
- icon만으로 의미 전달 (icon + text 페어가 룰)
- 동시 노출 항목 5개 초과 (Cowan 한도)

---

## 인용

- Treisman, A. (1985). *Preattentive processing in vision.*
- Cowan, N. (2001). *The magical number 4 in short-term memory.*
- Ware, C. (2012). *Information Visualization: Perception for Design* (3rd ed.).
- Bartram, L. (2001). *Enhancing visualizations with motion.*
- Doherty, W. & Thadani, A. (1982). *The economic value of rapid response time.*
- Norman, D. (2013). *The Design of Everyday Things.*
- Bringhurst, R. (2004). *The Elements of Typographic Style.*
- WCAG 2.1 — Web Content Accessibility Guidelines.
- Material Design 3 — Motion guidance.

---

이 가이드는 features/07–13 plan의 UI/UX 섹션이 자기 surface별로 인용·확장한다. plan 안에서 새 원칙을 추가하지 말고, 새 원칙이 필요하면 이 문서로 PR 한다.
