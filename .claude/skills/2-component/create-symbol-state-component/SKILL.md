---
name: create-symbol-state-component
description: 인라인 SVG HTML을 상태 기반 동적 컴포넌트로 변환합니다. CSS 변수로 색상을 제어하고 런타임 API를 제공합니다. Use when creating symbol components with state-based color changes, runtime status control, or dynamic theming.
---

# 심볼 상태 컴포넌트 생성

인라인 SVG HTML을 **상태 기반 동적 컴포넌트**로 변환하는 Skill입니다.
`data-status` 속성과 CSS 셀렉터로 색상을 제어합니다.
Figma MCP는 필요하지 않습니다.

---

## 핵심 원리

```
┌─────────────────────────────────────────────────────────────┐
│  SVG <defs>에 3세트 gradient 정의                            │
│  (paint0-green, paint0-yellow, paint0-red ...)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SVG path에 layer 클래스 부여                                │
│  (layer-grad0, layer-fill-primary ...)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CSS [data-status="xxx"] 셀렉터로 fill URL 제어              │
│  .symbol-container[data-status="green"] {                   │
│      .layer-grad0 { fill: url(#paint0-green); }             │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  JS에서 dataset.status만 변경                                │
│  container.dataset.status = 'yellow';                       │
└─────────────────────────────────────────────────────────────┘
```

**장점:**
- innerHTML 교체 없이 속성만 변경 (DOM 효율적)
- SVG 구조는 한 번만 정의
- CSS가 색상 전환 담당 (관심사 분리)

---

## 입력

figma-to-inline-svg에서 생성된 정적 파일:
```
Figma_Conversion/Static_Components/[프로젝트명]/[컴포넌트명]/
├── assets/                    # 원본 SVG 파일 (참고용)
├── [컴포넌트명].html          # 인라인 SVG 포함
└── [컴포넌트명].css
```

## 출력

```
RNBT_architecture/Projects/[프로젝트명]/page/components/[ComponentName]/
├── views/component.html       # SVG + 3세트 gradient + layer 클래스
├── styles/component.css       # [data-status] 셀렉터
├── scripts/
│   ├── register.js            # 상태 변경 API
│   └── beforeDestroy.js       # 정리
├── preview.html               # 상태 전환 테스트
└── README.md                  # 컴포넌트 문서
```

---

## 워크플로우

```
1. 정적 HTML 분석
   └─ figma-to-inline-svg에서 생성된 인라인 SVG 확인

2. Gradient/색상 분류
   ├─ gradient 사용 path → layer-gradN 클래스
   ├─ solid fill path → layer-fill-primary/secondary 클래스
   └─ stroke path → layer-stroke 클래스

3. 3세트 gradient 정의
   ├─ paint0-green, paint1-green, ...
   ├─ paint0-yellow, paint1-yellow, ...
   └─ paint0-red, paint1-red, ...

4. CSS 셀렉터 작성
   └─ [data-status="xxx"] 별로 fill URL 지정

5. register.js 작성
   └─ setStatus에서 dataset.status만 변경

6. preview.html 작성
   └─ 상태 전환 테스트
```

---

## Layer 클래스 명명 규칙

| 클래스 | 용도 | 예시 |
|--------|------|------|
| `layer-grad0` ~ `layer-grad9` | gradient fill | `fill: url(#paint0-green)` |
| `layer-fill-primary` | 주요 solid color | `fill: #4ADE80` |
| `layer-fill-secondary` | 보조 solid color | `fill: #86EFAC` |
| `layer-fill-tertiary` | 세 번째 solid color | `fill: #D1FAE5` |
| `layer-stroke` | 외곽선 | `stroke: #16A34A` |
| `layer-stroke-border` | 테두리 stroke | `stroke: #16A34A` |

---

## views/component.html 템플릿

```html
<!-- Symbol State Component -->
<div class="symbol-container" data-status="green">
    <svg class="symbol-svg" viewBox="0 0 73 54" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <!-- ======== GREEN Gradients ======== -->
            <linearGradient id="paint0-green" x1="36" y1="42" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3A6B47"/><stop offset="1" stop-color="#2D5A3A"/>
            </linearGradient>
            <linearGradient id="paint1-green" ...>...</linearGradient>
            <!-- ... 필요한 만큼 -->

            <!-- ======== YELLOW Gradients ======== -->
            <linearGradient id="paint0-yellow" x1="36" y1="42" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                <stop stop-color="#8B6F20"/><stop offset="1" stop-color="#6B5617"/>
            </linearGradient>
            <linearGradient id="paint1-yellow" ...>...</linearGradient>

            <!-- ======== RED Gradients ======== -->
            <linearGradient id="paint0-red" x1="36" y1="42" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                <stop stop-color="#8B3A3A"/><stop offset="1" stop-color="#6B2D2D"/>
            </linearGradient>
            <linearGradient id="paint1-red" ...>...</linearGradient>
        </defs>

        <g id="Group">
            <!-- Gradient layers -->
            <path class="layer-grad0" d="..."/>
            <path class="layer-grad1 layer-stroke" d="..." stroke-opacity="0.3"/>

            <!-- Solid color layers -->
            <path class="layer-fill-primary" d="..."/>
            <path class="layer-fill-secondary" d="..."/>
            <path class="layer-fill-tertiary layer-stroke-border" d="..." stroke-width="0.07"/>

            <!-- Static layers (색상 변경 없음) -->
            <path d="..." fill="white"/>
        </g>
    </svg>
</div>
```

---

## styles/component.css 템플릿

```css
/* Symbol State Component */

#[component-name]-container {
    width: 73px;
    height: 54px;
    position: relative;
    overflow: hidden;
}

#[component-name]-container .symbol-container {
    width: 100%;
    height: 100%;
}

#[component-name]-container .symbol-svg {
    display: block;
    width: 100%;
    height: 100%;
}

/* ========================================
   GREEN 상태 (정상)
   ======================================== */
.symbol-container[data-status="green"] {
    .layer-grad0 { fill: url(#paint0-green); }
    .layer-grad1 { fill: url(#paint1-green); }
    .layer-grad2 { fill: url(#paint2-green); }
    /* ... 필요한 만큼 */

    .layer-fill-primary { fill: #4ADE80; }
    .layer-fill-secondary { fill: #86EFAC; }
    .layer-fill-tertiary { fill: #D1FAE5; }
    .layer-stroke { stroke: #16A34A; }
    .layer-stroke-border { stroke: #16A34A; }
}

/* ========================================
   YELLOW 상태 (경고)
   ======================================== */
.symbol-container[data-status="yellow"] {
    .layer-grad0 { fill: url(#paint0-yellow); }
    .layer-grad1 { fill: url(#paint1-yellow); }
    .layer-grad2 { fill: url(#paint2-yellow); }

    .layer-fill-primary { fill: #FACC15; }
    .layer-fill-secondary { fill: #FEF08A; }
    .layer-fill-tertiary { fill: #FEF9C3; }
    .layer-stroke { stroke: #CA8A04; }
    .layer-stroke-border { stroke: #CA8A04; }
}

/* ========================================
   RED 상태 (위험)
   ======================================== */
.symbol-container[data-status="red"] {
    .layer-grad0 { fill: url(#paint0-red); }
    .layer-grad1 { fill: url(#paint1-red); }
    .layer-grad2 { fill: url(#paint2-red); }

    .layer-fill-primary { fill: #EF4444; }
    .layer-fill-secondary { fill: #FECACA; }
    .layer-fill-tertiary { fill: #FEE2E2; }
    .layer-stroke { stroke: #DC2626; }
    .layer-stroke-border { stroke: #DC2626; }
}
```

---

## scripts/register.js 템플릿

```javascript
/**
 * [ComponentName] - Symbol State Component
 * data-status 속성 변경으로 색상 제어
 *
 * 상태: green (정상), yellow (경고), red (위험)
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    validStatuses: ['green', 'yellow', 'red'],
    defaultStatus: 'green',
    statusKey: 'TBD_status'  // API 필드명
};

// ======================
// STATE
// ======================

this._currentStatus = config.defaultStatus;

// ======================
// BINDINGS
// ======================

this.setStatus = setStatus.bind(this, config);
this.updateFromData = updateFromData.bind(this, config);
this.getStatus = getStatus.bind(this);
this.renderData = renderData.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    TBD_topicName: ['renderData']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// CUSTOM EVENTS
// ======================

this.customEvents = {
    click: {
        '.symbol-container': '@TBD_symbolClicked'
    }
};

bindEvents(this, this.customEvents);

console.log('[ComponentName] Registered');

// ======================
// STATUS FUNCTIONS
// ======================

/**
 * 상태 변경 - data-status 속성만 변경
 * @param {Object} config - 설정
 * @param {string} status - 'green' | 'yellow' | 'red'
 */
function setStatus(config, status) {
    if (!config.validStatuses.includes(status)) {
        console.warn(`[ComponentName] Invalid status: ${status}`);
        return;
    }

    const container = this.appendElement.querySelector('.symbol-container');
    if (!container) {
        console.warn('[ComponentName] Symbol container not found');
        return;
    }

    // data-status 속성 변경 → CSS가 색상 제어
    container.dataset.status = status;

    // 내부 상태 업데이트
    this._currentStatus = status;

    console.log(`[ComponentName] Status changed to: ${status}`);
}

/**
 * 데이터 객체로 상태 변경
 */
function updateFromData(config, data) {
    if (data && data[config.statusKey]) {
        this.setStatus(data[config.statusKey]);
    }
}

/**
 * 현재 상태 반환
 */
function getStatus() {
    return this._currentStatus;
}

/**
 * 구독 데이터 렌더링
 */
function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    this.updateFromData(data);
}
```

---

## scripts/beforeDestroy.js 템플릿

```javascript
/**
 * [ComponentName] - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;

// ======================
// UNSUBSCRIBE
// ======================

if (this.subscriptions) {
    fx.go(
        Object.entries(this.subscriptions),
        fx.each(([topic, _]) => unsubscribe(topic, this))
    );
    this.subscriptions = null;
}

// ======================
// REMOVE EVENTS
// ======================

if (this.customEvents) {
    removeCustomEvents(this, this.customEvents);
    this.customEvents = null;
}

// ======================
// CLEAR REFERENCES
// ======================

this.setStatus = null;
this.updateFromData = null;
this.getStatus = null;
this.renderData = null;
this._currentStatus = null;

console.log('[ComponentName] Destroyed');
```

---

## preview.html 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[ComponentName] - Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1f2e;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 32px;
            padding: 40px;
        }

        h1 { color: #e0e6ed; font-size: 20px; }

        /* Component Container */
        #[component-name]-container {
            width: 73px;
            height: 54px;
        }

        #[component-name]-container .symbol-container {
            width: 100%;
            height: 100%;
        }

        #[component-name]-container .symbol-svg {
            display: block;
            width: 100%;
            height: 100%;
        }

        /* ======== GREEN ======== */
        .symbol-container[data-status="green"] {
            .layer-grad0 { fill: url(#paint0-green); }
            .layer-fill-primary { fill: #4ADE80; }
            .layer-fill-secondary { fill: #86EFAC; }
            .layer-stroke { stroke: #16A34A; }
        }

        /* ======== YELLOW ======== */
        .symbol-container[data-status="yellow"] {
            .layer-grad0 { fill: url(#paint0-yellow); }
            .layer-fill-primary { fill: #FACC15; }
            .layer-fill-secondary { fill: #FEF08A; }
            .layer-stroke { stroke: #CA8A04; }
        }

        /* ======== RED ======== */
        .symbol-container[data-status="red"] {
            .layer-grad0 { fill: url(#paint0-red); }
            .layer-fill-primary { fill: #EF4444; }
            .layer-fill-secondary { fill: #FECACA; }
            .layer-stroke { stroke: #DC2626; }
        }

        /* Controls */
        .preview-controls { display: flex; gap: 12px; }
        .preview-controls button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }
        .btn-green { background: #4ADE80; color: #166534; }
        .btn-yellow { background: #FACC15; color: #713F12; }
        .btn-red { background: #EF4444; color: white; }

        .status-display { color: #8892a0; font-size: 14px; }
        .status-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 12px;
        }
        .status-badge.green { background: #4ADE80; color: #166534; }
        .status-badge.yellow { background: #FACC15; color: #713F12; }
        .status-badge.red { background: #EF4444; color: white; }
    </style>
</head>
<body>
    <h1>[ComponentName] - Symbol State Component</h1>

    <div id="[component-name]-container">
        <div class="symbol-container" data-status="green">
            <svg class="symbol-svg" viewBox="0 0 73 54" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <!-- GREEN/YELLOW/RED gradients here -->
                </defs>
                <g id="Group">
                    <!-- paths with layer classes -->
                </g>
            </svg>
        </div>
    </div>

    <div class="preview-controls">
        <button class="btn-green" onclick="setStatus('green')">Green (정상)</button>
        <button class="btn-yellow" onclick="setStatus('yellow')">Yellow (경고)</button>
        <button class="btn-red" onclick="setStatus('red')">Red (위험)</button>
    </div>

    <div class="status-display">
        현재 상태: <span id="status-badge" class="status-badge green">green</span>
    </div>

    <script>
        const validStatuses = ['green', 'yellow', 'red'];
        const symbolContainer = document.querySelector('.symbol-container');
        const statusBadge = document.getElementById('status-badge');

        function setStatus(status) {
            if (!validStatuses.includes(status)) return;

            // data-status 속성만 변경 → CSS가 색상 제어
            symbolContainer.dataset.status = status;

            statusBadge.textContent = status;
            statusBadge.className = 'status-badge ' + status;
            console.log('Status:', status);
        }

        function getStatus() {
            return symbolContainer.dataset.status;
        }

        window.SymbolState = { setStatus, getStatus };
    </script>
</body>
</html>
```

---

## 완료 체크리스트

```
- [ ] 정적 HTML의 gradient/색상 분석
- [ ] layer 클래스 매핑 설계
- [ ] views/component.html
    - [ ] 3세트 gradient 정의 (green/yellow/red)
    - [ ] path에 layer 클래스 부여
- [ ] styles/component.css
    - [ ] [data-status="xxx"] 셀렉터 작성
- [ ] scripts/register.js
    - [ ] setStatus (dataset.status 변경)
    - [ ] updateFromData, getStatus, renderData
- [ ] scripts/beforeDestroy.js
- [ ] preview.html 테스트
- [ ] README.md 작성
```

---

## 참고 예제

| 예제 | 위치 |
|------|------|
| Cube3DSymbol | `RNBT_architecture/Projects/Symbol_Test/page/components/Cube3DSymbol/` |

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [CODING_STYLE.md](../../../guides/CODING_STYLE.md) | 함수형 코딩 지침 |
