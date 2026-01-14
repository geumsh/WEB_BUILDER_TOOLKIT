---
name: create-symbol-state-component
description: 인라인 SVG HTML을 상태 기반 동적 컴포넌트로 변환합니다. CSS 변수로 색상을 제어하고 런타임 API를 제공합니다. Use when creating symbol components with state-based color changes, runtime status control, or dynamic theming.
---

# 심볼 상태 컴포넌트 생성

인라인 SVG HTML을 **상태 기반 동적 컴포넌트**로 변환하는 Skill입니다.
CSS 변수로 색상을 제어하고, 런타임 API를 통해 상태를 변경합니다.
Figma MCP는 필요하지 않습니다.

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
├── assets/                    # (필요시) 추가 에셋
├── views/component.html       # 인라인 SVG + CSS 변수 참조
├── styles/component.css       # 상태별 CSS 변수 정의
├── scripts/
│   ├── register.js            # 상태 변경 API + 구독
│   └── beforeDestroy.js       # 정리
├── preview.html               # 상태 전환 테스트
└── README.md                  # 컴포넌트 문서 (필수)
```

---

## 워크플로우

```
1. 정적 HTML 분석
   └─ figma-to-inline-svg에서 생성된 인라인 SVG 확인

2. 색상 정보 확인
   └─ 각 상태별 색상 값 (green, yellow, red 등)

3. CSS 변수 매핑 설계
   ├─ 어떤 색상을 어떤 변수로?
   │   - fill="#4ADE80" → var(--fill-primary)
   │   - stroke="#16A34A" → var(--stroke-color)
   └─ 상태별 변수 값 정의

4. HTML 변환
   └─ 하드코딩 색상 → CSS 변수 참조

5. CSS 작성
   ├─ 상태별 색상 클래스 정의
   └─ .status-green, .status-yellow, .status-red

6. register.js 작성
   ├─ setStatus 함수
   ├─ updateFromData 함수
   └─ subscriptions (선택)

7. beforeDestroy.js 작성
   └─ 리소스 정리

8. preview.html 작성
   └─ 모든 상태 전환 테스트
```

---

## 핵심 개념

### 1. 색상 → CSS 변수 변환

```html
<!-- 변환 전 (하드코딩) -->
<svg>
    <path fill="#4ADE80" d="..."/>
    <path fill="#86EFAC" d="..."/>
    <path stroke="#16A34A" d="..."/>
</svg>

<!-- 변환 후 (CSS 변수) -->
<svg>
    <path fill="var(--fill-primary)" d="..."/>
    <path fill="var(--fill-light)" d="..."/>
    <path stroke="var(--stroke-color)" d="..."/>
</svg>
```

### 2. 상태별 CSS 클래스

```css
/* GREEN 상태 (정상) */
.status-green {
    --fill-primary: #4ADE80;
    --fill-light: #86EFAC;
    --fill-lightest: #D1FAE5;
    --stroke-color: #16A34A;
}

/* YELLOW 상태 (경고) */
.status-yellow {
    --fill-primary: #FACC15;
    --fill-light: #FEF08A;
    --fill-lightest: #FEF9C3;
    --stroke-color: #CA8A04;
}

/* RED 상태 (위험) */
.status-red {
    --fill-primary: #EF4444;
    --fill-light: #FECACA;
    --fill-lightest: #FEE2E2;
    --stroke-color: #DC2626;
}
```

### 3. 상태 변경 API

```javascript
// 직접 상태 변경
setStatus('green');
setStatus('yellow');
setStatus('red');

// 데이터 객체로 변경
updateFromData({ status: 'yellow' });

// 현재 상태 조회
const current = getStatus();
```

### 4. 상태 변경 원리

```javascript
function setStatus(status) {
    const container = this.appendElement;

    // 기존 상태 클래스 제거
    container.classList.remove('status-green', 'status-yellow', 'status-red');

    // 새 상태 클래스 추가
    container.classList.add(`status-${status}`);

    // data 속성 업데이트 (선택)
    container.dataset.status = status;
}
```

---

## CSS 변수 매핑 가이드

### 색상 역할 분석

SVG의 각 색상이 어떤 역할인지 파악:

| 색상 역할 | 변수명 | 예시 |
|----------|--------|------|
| 주요 채움색 | `--fill-primary` | 면의 기본 색상 |
| 밝은 채움색 | `--fill-light` | 하이라이트 면 |
| 가장 밝은 채움색 | `--fill-lightest` | 최상단 면 |
| 강조 채움색 | `--fill-accent` | 포인트 영역 |
| 외곽선 색상 | `--stroke-color` | 테두리 |
| 그라디언트 어두운 색 | `--grad-dark` | 그라디언트 시작 |
| 그라디언트 중간 색 | `--grad-mid` | 그라디언트 중간 |

### 색상 추출 팁

```javascript
// 같은 역할의 색상 찾기
// green: #4ADE80 → 주요 채움색
// yellow: #FACC15 → 주요 채움색 (같은 역할, 다른 색상)
// red: #EF4444 → 주요 채움색 (같은 역할, 다른 색상)

// 모두 --fill-primary로 매핑
```

---

## register.js 템플릿

```javascript
/**
 * [ComponentName] - Symbol State Component
 *
 * 상태에 따라 색상이 변경되는 심볼 컴포넌트
 *
 * 상태: green (정상), yellow (경고), red (위험)
 *
 * Usage:
 *   setStatus('green')
 *   updateFromData({ status: 'yellow' })
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ==================
// CONFIG
// ==================

const config = {
    validStatuses: ['green', 'yellow', 'red'],
    defaultStatus: 'green',
    statusKey: 'TBD_status'  // API 필드명
};

// ==================
// STATE
// ==================

this._currentStatus = config.defaultStatus;

// ==================
// BINDINGS
// ==================

this.setStatus = setStatus.bind(this, config);
this.updateFromData = updateFromData.bind(this, config);
this.getStatus = getStatus.bind(this);
this.renderData = renderData.bind(this, config);

// ==================
// SUBSCRIPTIONS (선택)
// ==================

this.subscriptions = {
    TBD_topicName: ['renderData']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ==================
// CUSTOM EVENTS (선택)
// ==================

this.customEvents = {
    click: {
        '.symbol-container': '@TBD_symbolClicked'
    }
};

bindEvents(this, this.customEvents);

console.log('[SymbolState] Registered');

// ==================
// STATUS FUNCTIONS
// ==================

/**
 * 상태 변경
 * @param {Object} config - 설정
 * @param {string} status - 'green' | 'yellow' | 'red'
 */
function setStatus(config, status) {
    if (!config.validStatuses.includes(status)) {
        console.warn(`[SymbolState] Invalid status: ${status}`);
        return;
    }

    const container = this.appendElement;

    // 기존 상태 클래스 제거
    config.validStatuses.forEach(s =>
        container.classList.remove(`status-${s}`)
    );

    // 새 상태 클래스 추가
    container.classList.add(`status-${status}`);

    // data 속성 업데이트
    container.dataset.status = status;

    // 내부 상태 업데이트
    this._currentStatus = status;

    console.log(`[SymbolState] Status changed to: ${status}`);
}

/**
 * 데이터 객체로 상태 변경
 * @param {Object} config - 설정
 * @param {Object} data - { status: 'green' | 'yellow' | 'red' }
 */
function updateFromData(config, data) {
    if (data && data[config.statusKey]) {
        this.setStatus(data[config.statusKey]);
    }
}

/**
 * 현재 상태 반환
 * @returns {string} 현재 상태
 */
function getStatus() {
    return this._currentStatus;
}

/**
 * 구독 데이터 렌더링
 * @param {Object} config - 설정
 * @param {Object} param - { response: { data } }
 */
function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    this.updateFromData(data);
}
```

---

## beforeDestroy.js 템플릿

```javascript
/**
 * [ComponentName] - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;

// ==================
// UNSUBSCRIBE
// ==================

if (this.subscriptions) {
    fx.go(
        Object.entries(this.subscriptions),
        fx.each(([topic, _]) => unsubscribe(topic, this))
    );
    this.subscriptions = null;
}

// ==================
// REMOVE EVENTS
// ==================

if (this.customEvents) {
    removeCustomEvents(this, this.customEvents);
    this.customEvents = null;
}

// ==================
// CLEAR REFERENCES
// ==================

this.setStatus = null;
this.updateFromData = null;
this.getStatus = null;
this.renderData = null;
this._currentStatus = null;

console.log('[SymbolState] Destroyed');
```

---

## views/component.html 템플릿

```html
<!-- Symbol State Component -->
<div class="symbol-container">
    <svg class="symbol-svg" viewBox="0 0 73 54" preserveAspectRatio="none">
        <!--
            CSS 변수로 색상 참조
            원본: fill="#4ADE80" → 변환: fill="var(--fill-primary)"
        -->
        <path d="..." fill="var(--fill-primary)"/>
        <path d="..." fill="var(--fill-light)"/>
        <path d="..." stroke="var(--stroke-color)"/>
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

    .symbol-container {
        width: 100%;
        height: 100%;
    }

    .symbol-svg {
        display: block;
        width: 100%;
        height: 100%;
    }
}

/* ============================================
   상태별 색상 정의 (Figma에서 추출)
   ============================================ */

/* GREEN 상태 (정상) */
.status-green {
    --fill-primary: #4ADE80;
    --fill-light: #86EFAC;
    --fill-lightest: #D1FAE5;
    --fill-accent: #22C55E;
    --stroke-color: #16A34A;

    /* 그라디언트 색상 (필요시) */
    --grad-dark: #3A6B47;
    --grad-darker: #2D5A3A;
    --grad-darkest: #166534;
    --grad-mid: #5DBF6C;
}

/* YELLOW 상태 (경고) */
.status-yellow {
    --fill-primary: #FACC15;
    --fill-light: #FEF08A;
    --fill-lightest: #FEF9C3;
    --fill-accent: #EAB308;
    --stroke-color: #CA8A04;

    --grad-dark: #8B7A3A;
    --grad-darker: #6B5A2D;
    --grad-darkest: #713F12;
    --grad-mid: #D4B85F;
}

/* RED 상태 (위험) */
.status-red {
    --fill-primary: #EF4444;
    --fill-light: #FECACA;
    --fill-lightest: #FEE2E2;
    --fill-accent: #EF4444;
    --stroke-color: #DC2626;

    --grad-dark: #8B3A3A;
    --grad-darker: #6B2D2D;
    --grad-darkest: #7F1D1D;
    --grad-mid: #B55F5F;
}

/* 상태 전환 애니메이션 (선택) */
#[component-name]-container {
    transition: all 0.3s ease;
}
```

---

## preview.html 템플릿

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[ComponentName] - Symbol State Preview</title>
    <link rel="stylesheet" href="styles/component.css">
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
            gap: 24px;
            padding: 40px;
        }

        h1 {
            color: #e0e6ed;
            font-size: 18px;
            font-weight: 500;
        }

        .preview-controls {
            display: flex;
            gap: 12px;
        }

        .preview-controls button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: transform 0.1s, box-shadow 0.1s;
        }

        .preview-controls button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .btn-green { background: #4ADE80; color: #166534; }
        .btn-yellow { background: #FACC15; color: #713F12; }
        .btn-red { background: #EF4444; color: white; }

        .status-display {
            color: #8892a0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <h1>[ComponentName] - Symbol State Component</h1>

    <!-- 컴포넌트 컨테이너 -->
    <div id="[component-name]-container" class="status-green" data-status="green">
        <!-- views/component.html 내용 -->
        <div class="symbol-container">
            <svg class="symbol-svg" viewBox="0 0 73 54" preserveAspectRatio="none">
                <!-- SVG 내용 -->
            </svg>
        </div>
    </div>

    <!-- 상태 전환 버튼 -->
    <div class="preview-controls">
        <button class="btn-green" onclick="setStatus('green')">🟢 Green (정상)</button>
        <button class="btn-yellow" onclick="setStatus('yellow')">🟡 Yellow (경고)</button>
        <button class="btn-red" onclick="setStatus('red')">🔴 Red (위험)</button>
    </div>

    <div class="status-display">
        현재 상태: <span id="current-status">green</span>
    </div>

    <script>
        const container = document.getElementById('[component-name]-container');
        const statusDisplay = document.getElementById('current-status');
        const validStatuses = ['green', 'yellow', 'red'];

        function setStatus(status) {
            if (!validStatuses.includes(status)) {
                console.warn('Invalid status:', status);
                return;
            }

            // 기존 상태 클래스 제거
            validStatuses.forEach(s => container.classList.remove(`status-${s}`));

            // 새 상태 클래스 추가
            container.classList.add(`status-${status}`);
            container.dataset.status = status;

            // 표시 업데이트
            statusDisplay.textContent = status;

            console.log('Status changed to:', status);
        }

        function updateFromData(data) {
            if (data && data.status) {
                setStatus(data.status);
            }
        }

        function getStatus() {
            return container.dataset.status;
        }

        // API 노출 (테스트용)
        window.SymbolState = { setStatus, updateFromData, getStatus };
    </script>
</body>
</html>
```

---

## 생성/정리 매칭 테이블

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this.subscriptions = {...}` | `this.subscriptions = null` |
| `subscribe(topic, this, handler)` | `unsubscribe(topic, this)` |
| `this.customEvents = {...}` | `this.customEvents = null` |
| `bindEvents(this, customEvents)` | `removeCustomEvents(this, customEvents)` |
| `this.setStatus = fn.bind(this)` | `this.setStatus = null` |
| `this.updateFromData = fn.bind(this)` | `this.updateFromData = null` |
| `this.getStatus = fn.bind(this)` | `this.getStatus = null` |
| `this._currentStatus = value` | `this._currentStatus = null` |

---

## TBD 패턴

API 명세 확정 전 개발:

```javascript
// config
const config = {
    statusKey: 'TBD_status'  // API에서 상태를 나타내는 필드명
};

// subscriptions
this.subscriptions = {
    TBD_topicName: ['renderData']
};

// customEvents
this.customEvents = {
    click: {
        '.symbol-container': '@TBD_symbolClicked'
    }
};
```

---

## 금지 사항

```
❌ 하드코딩 색상 남기기
- 모든 색상은 CSS 변수로 변환
- fill="#4ADE80" → fill="var(--fill-primary)"

❌ 상태 클래스 직접 조작
- classList.add/remove 대신 setStatus 함수 사용
- 일관된 상태 관리 보장

❌ 생성 후 정리 누락
- subscribe 후 unsubscribe 필수
- bindEvents 후 removeCustomEvents 필수

❌ 응답 구조 잘못 사용
- function(response) ❌
- function({ response }) ✅
```

---

## 완료 체크리스트

```
- [ ] 정적 HTML의 인라인 SVG 분석 완료
- [ ] 색상 → CSS 변수 매핑 설계
- [ ] views/component.html 생성 (CSS 변수 참조)
- [ ] styles/component.css 생성 (상태별 색상 정의)
- [ ] register.js 작성
    - [ ] setStatus 함수
    - [ ] updateFromData 함수
    - [ ] getStatus 함수
    - [ ] subscriptions (필요시)
    - [ ] customEvents (필요시)
- [ ] beforeDestroy.js 작성
- [ ] preview.html 작성
    - [ ] 모든 상태 전환 버튼
    - [ ] 상태 전환 테스트
- [ ] README.md 작성 (필수)
- [ ] 브라우저에서 preview.html로 모든 상태 확인
```

---

## README.md 템플릿 (필수)

```markdown
# [ComponentName]

상태에 따라 색상이 변경되는 심볼 컴포넌트

## 상태

| 상태 | 설명 | 색상 |
|------|------|------|
| `green` | 정상 | 녹색 계열 |
| `yellow` | 경고 | 노란색 계열 |
| `red` | 위험 | 빨간색 계열 |

## API

### setStatus(status)

상태를 직접 변경합니다.

\`\`\`javascript
setStatus('green');
setStatus('yellow');
setStatus('red');
\`\`\`

### updateFromData(data)

데이터 객체로 상태를 변경합니다.

\`\`\`javascript
updateFromData({ status: 'yellow' });
\`\`\`

### getStatus()

현재 상태를 반환합니다.

\`\`\`javascript
const current = getStatus(); // 'green' | 'yellow' | 'red'
\`\`\`

## 데이터 구조

\`\`\`javascript
{
    status: 'green' | 'yellow' | 'red'
}
\`\`\`

## 구독 (Subscriptions)

| Topic | 함수 | 설명 |
|-------|------|------|
| `TBD_topicName` | `renderData` | 상태 데이터 수신 |

## 발행 이벤트 (Events)

| 이벤트 | 발생 시점 | payload |
|--------|----------|---------|
| `@TBD_symbolClicked` | 심볼 클릭 시 | `{ event, targetInstance }` |

## CSS 변수

| 변수명 | 용도 |
|--------|------|
| `--fill-primary` | 주요 채움색 |
| `--fill-light` | 밝은 채움색 |
| `--stroke-color` | 외곽선 색상 |

## 파일 구조

\`\`\`
[ComponentName]/
├── views/component.html      # 인라인 SVG + CSS 변수
├── styles/component.css      # 상태별 색상 정의
├── scripts/
│   ├── register.js           # 상태 API
│   └── beforeDestroy.js
├── preview.html              # 상태 전환 테스트
└── README.md
\`\`\`
```

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [CODING_STYLE.md](../CODING_STYLE.md) | 함수형 코딩 지침 (필수 참고) |
| [create-component/skill.md](../create-component/skill.md) | 일반 컴포넌트 패턴 |

---

## 참고 예제

| 예제 | 참고 시점 | 특징 |
|------|----------|------|
| `Figma_Conversion/Static_Components/Symbol_Test/3d-cube/` | 완성 예제 | 3D 큐브 상태 컴포넌트 |
