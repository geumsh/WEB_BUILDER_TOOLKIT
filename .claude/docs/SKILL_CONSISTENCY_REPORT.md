# SKILL ↔ 예제/참조자료 불일치 해결 보고서

> 감사 일자: 2026-02-20
> 대상: 6개 SKILL + 참조 문서 + 예제 프로젝트
> 해결 커밋: `364da59`, `7495432`

---

## 요약

SKILL 정의(`.claude/skills/`)와 참조 자료(CLAUDE.md, README.md, 예제 프로젝트)를 1:1 대조한 결과, **8건의 불일치**를 발견하고 전건 수정 완료.

| # | 분류 | 심각도 | 상태 |
|---|------|--------|------|
| 1 | MCP 서버명 불일치 | 높음 | 해결 (364da59) |
| 2 | MCP 도구명 불일치 | 높음 | 해결 (364da59) |
| 3 | preview.html CSS 참조 방식 불일치 | 중간 | 해결 (7495432) |
| 4 | unsubscribe 인수 개수 불일치 | 높음 | 해결 (7495432) |
| 5 | Cube3DSymbol 상태 전환 방식 불일치 | 중간 | 해결 (364da59) |
| 6 | SKILL 템플릿 this 프로퍼티 패턴 불일치 | 높음 | 해결 (7495432) |
| 7 | SKILL 템플릿 prefix 분리 누락 | 높음 | 해결 (7495432) |
| 8 | SKILL 템플릿 onEventBusHandlers 누락 | 높음 | 해결 (7495432) |

---

## 상세 기록

### #1. MCP 서버명 불일치

**SKILL**: `figma-to-html`, `figma-to-inline-svg` (Figma 변환 SKILL)
**참조**: `Figma_Conversion/CLAUDE.md`

**문제**: SKILL에서 참조하는 `Figma_Conversion/CLAUDE.md`에 MCP 서버명이 구버전으로 기재됨

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| 서버명 | `figma-dev-mode-mcp-server` | `figma-desktop` |
| 도구 prefix | `mcp__figma-dev-mode-mcp-server__` | `mcp__figma-desktop__` |

**근거**: CLI 등록 시 `claude mcp add figma-desktop ...`으로 등록됨. 실제 런타임에서 `figma-desktop`만 인식.

**수정 파일**: `Figma_Conversion/CLAUDE.md` (line 206~215)

---

### #2. MCP 도구명 불일치

**SKILL**: `figma-to-html`, `figma-to-inline-svg`
**참조**: `Figma_Conversion/CLAUDE.md`

**문제**: 문서에 4개 도구가 기재되어 있으나, 현재 MCP는 2개 도구만 제공

| 수정 전 (4개) | 수정 후 (2개) |
|---------------|---------------|
| `get_metadata` — 메타데이터 조회 | `get_design_context` — 디자인 정보 + 코드 통합 조회 |
| `get_code` — HTML/CSS 코드 추출 | `get_screenshot` — 스크린샷 캡처 |
| `get_image` — 이미지/아이콘 추출 | *(삭제)* |
| `get_variable_defs` — 변수 정의 조회 | *(삭제)* |

**근거**: Figma MCP 업데이트로 `get_metadata` + `get_code`가 `get_design_context`로 통합, `get_image`가 `get_screenshot`으로 대체, `get_variable_defs`는 `get_design_context` 내 포함.

**수정 파일**: `Figma_Conversion/CLAUDE.md` (line 171~200, 예제 코드 블록)

---

### #3. preview.html CSS 참조 방식 불일치

**SKILL**: `create-standard-component` 등
**참조**: `SHARED_INSTRUCTIONS.md`, 예제 preview.html

**문제**: SHARED_INSTRUCTIONS.md는 "inline 방식" 규칙을 명시하나, 3개 예제 preview.html이 외부 CSS 파일을 `<link>` 태그로 참조

| 컴포넌트 | 수정 전 | 수정 후 |
|----------|---------|---------|
| LogViewer | `<link rel="stylesheet" href="styles/component.css">` | `<style>/* 115줄 inline */</style>` |
| EventStatus | `<link rel="stylesheet" href="styles/component.css">` | `<style>/* 184줄 inline */</style>` |
| AssetTree | `<link rel="stylesheet" href="styles/component.css">` | `<style>/* 212줄 inline */</style>` |

**근거**: preview.html은 브라우저에서 직접 열어 확인하는 용도. 로컬 파일 시스템에서 상대 경로 CSS가 CORS로 로드 실패할 수 있음. CDN 폰트(Pretendard 등)는 외부 URL이므로 허용.

**수정 파일**:
- `RNBT_architecture/Components/LogViewer/preview.html`
- `RNBT_architecture/Components/EventStatus/preview.html`
- `RNBT_architecture/Components/AssetTree/preview.html`
- `SHARED_INSTRUCTIONS.md` (규칙 문구 명확화)

**SHARED_INSTRUCTIONS.md 규칙 변경**:
```
수정 전: "inline 방식 (LogViewer 패턴) — 외부 파일 로드 금지"
수정 후: "inline 방식 — CSS는 <style> 태그로 인라인, <link rel="stylesheet" href="..."> 로컬 파일 참조 금지 (CDN 폰트 등 외부 라이브러리는 허용)"
```

---

### #4. unsubscribe 인수 개수 불일치 (근본 원인 발견)

**SKILL**: `create-standard-component`, `create-project`
**참조**: SimpleDashboard, Simple3DStatus 예제 프로젝트

**문제**: 8개 `beforeDestroy.js`에서 `unsubscribe`를 3인수로 호출. 실제 API는 2인수만 사용.

**API 원본 확인** (`Utils/GlobalDataPublisher.js:47-53`):
```javascript
// subscribe는 3인수: (topic, instance, handler)
subscribe(topic, instance, handler) {
    if (!subscriberTable.has(topic)) subscriberTable.set(topic, new Set());
    subscriberTable.get(topic).add({ instance, handler });
},

// unsubscribe는 2인수: (topic, instance) — handler 불필요
unsubscribe(topic, instance) {
    const subs = subscriberTable.get(topic);
    if (!subs) return;
    for (const sub of subs) {
        if (sub.instance === instance) subs.delete(sub);
    }
},
```

**근본 원인**: `subscribe(topic, this, this[fn])` 패턴을 그대로 복사하여 `unsubscribe(topic, this, this[fn])`으로 작성. `unsubscribe`는 `instance` 기준으로 해당 topic의 모든 구독을 삭제하므로 handler 인수가 불필요. 3번째 인수는 조용히 무시되어 런타임 오류는 없었으나, API를 잘못 이해한 코드.

**수정 전** (3인수 — 오류):
```javascript
fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && unsubscribe(topic, this, this[fn]), fnList)
    )
);
```

**수정 후** (2인수 — 정확):
```javascript
fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, _]) => unsubscribe(topic, this))
);
```

**수정 파일** (8개):
- `Examples/SimpleDashboard/page/components/StatsCards/scripts/beforeDestroy.js`
- `Examples/SimpleDashboard/page/components/DataTable/scripts/beforeDestroy.js`
- `Examples/SimpleDashboard/page/components/TrendChart/scripts/beforeDestroy.js`
- `Examples/SimpleDashboard/master/page/components/Header/scripts/beforeDestroy.js`
- `Examples/SimpleDashboard/master/page/components/Sidebar/scripts/beforeDestroy.js`
- `Examples/Simple3DStatus/master/page/components/Header/scripts/beforeDestroy.js`
- `Examples/Simple3DStatus/master/page/components/Sidebar/scripts/beforeDestroy.js`
- `Examples/Simple3DStatus/page/components/Equipment3D/scripts/beforeDestroy.js`

---

### #5. Cube3DSymbol 상태 전환 방식 불일치

**SKILL**: `create-symbol-state-component`
**참조**: `Cube3DSymbol/README.md`

**문제**: README.md가 "상태별 전체 SVG 교체(innerHTML)" 방식으로 설명하나, 실제 `register.js`는 `data-status` 속성 + CSS 셀렉터 방식 사용.

**수정 전** (README.md):
```
상태별 전체 SVG 교체 방식
- 각 상태(normal, warning, critical, offline)에 대한 SVG 템플릿을 미리 정의
- 상태 변경 시 컨테이너의 innerHTML을 교체
```
```javascript
function applyStatus(status) {
    const container = this.appendElement.querySelector('.cube-3d-container');
    container.innerHTML = svgTemplates[status] || svgTemplates.normal;
}
```

**수정 후** (README.md):
```
data-status 속성 + CSS 셀렉터 방식
- SVG는 하나만 존재, 상태에 따라 data-status 속성만 변경
- CSS에서 [data-status="warning"] 등의 셀렉터로 색상/스타일 전환
```
```javascript
function applyStatus(status) {
    const container = this.appendElement.querySelector('.cube-3d-container');
    container.dataset.status = status;
}
```

**근거**: 실제 `register.js` 코드 확인 결과, `dataset.status`를 사용. innerHTML 교체 방식은 존재하지 않음.

**수정 파일**: `RNBT_architecture/Projects/Symbol_Test/page/components/Cube3DSymbol/README.md`

---

### #6. SKILL 템플릿 this 프로퍼티 패턴 불일치

**SKILL**: `create-project` (페이지 생성 SKILL)
**참조**: SimpleDashboard 예제 프로젝트

**문제**: SKILL 템플릿의 master/page 간 `this` 프로퍼티 관리 패턴이 SimpleDashboard 실제 코드와 다름.

| 항목 | SKILL 템플릿 (수정 전) | SimpleDashboard 실제 |
|------|----------------------|---------------------|
| 구독 핸들러 | `this.eventBusHandlers` (공유) | `this.masterEventBusHandlers` / `this.pageEventBusHandlers` (분리) |
| 파라미터 | `this.currentParams` | `this.pageParams` |
| 병합 전략 | `Object.assign` 덮어쓰기 방지 | prefix 분리로 충돌 자체 불가 |

**근거**: SimpleDashboard는 master의 `register.js`에서 `this.masterEventBusHandlers`, page의 `register.js`에서 `this.pageEventBusHandlers`를 사용. prefix로 분리하면 `Object.assign` 같은 병합 로직이 불필요하고, 변수 충돌 위험이 구조적으로 제거됨.

**수정 파일**: `.claude/skills/3-page/create-project/SKILL.md`

---

### #7. SKILL 템플릿 prefix 분리 누락

**SKILL**: `create-project`
**참조**: SimpleDashboard 예제 프로젝트

**문제**: #6과 연동. SKILL 템플릿에 prefix 분리 원칙이 코드 수준에서 반영되지 않았음.

**수정 전** (SKILL 템플릿 발췌):
```javascript
// master register.js
this.eventBusHandlers = { ... };

// page register.js — 충돌 위험
this.eventBusHandlers = { ... }; // master 것을 덮어쓰기
```

**수정 후**:
```javascript
// master register.js
this.masterEventBusHandlers = { ... };

// page register.js — 충돌 불가
this.pageEventBusHandlers = { ... };
```

**수정 파일**: `.claude/skills/3-page/create-project/SKILL.md`

---

### #8. SKILL 템플릿 onEventBusHandlers 누락

**SKILL**: `create-project`
**참조**: SimpleDashboard 예제 프로젝트

**문제**: SimpleDashboard의 master `register.js`에서 `Wkit.onEventBusHandlers(this)`를 호출하여 이벤트 버스 핸들러를 런타임에 등록하지만, SKILL 템플릿에는 이 호출이 누락.

**수정 전** (SKILL 템플릿):
```javascript
// onEventBusHandlers 호출 없음
this.masterEventBusHandlers = { ... };
// → 핸들러가 정의만 되고 런타임에 등록되지 않음
```

**수정 후**:
```javascript
this.masterEventBusHandlers = { ... };
Wkit.onEventBusHandlers(this);
// → 핸들러가 정의 + 런타임 등록 완료
```

**수정 파일**: `.claude/skills/3-page/create-project/SKILL.md`

---

## 영향 분석

### 런타임 영향

| # | 런타임 오류 여부 | 설명 |
|---|----------------|------|
| 1-2 | 발생 | MCP 도구 호출 실패 (잘못된 서버명/도구명) |
| 3 | 발생 가능 | 로컬 파일 CORS로 CSS 로드 실패 |
| 4 | **미발생** | 3번째 인수가 조용히 무시됨 |
| 5 | 미발생 | README만 잘못됨, 코드는 정상 |
| 6-8 | 발생 | 생성된 코드에서 this 충돌 / 핸들러 미등록 |

### 코드 생성 영향

| # | SKILL이 참조 → 생성할 코드에 영향? |
|---|----------------------------------|
| 1-2 | 예 — Figma MCP 호출 코드 생성 실패 |
| 3 | 예 — preview.html에 잘못된 `<link>` 태그 생성 |
| 4 | 예 — beforeDestroy.js에 불필요한 3인수 코드 생성 |
| 5 | 예 — symbol 컴포넌트에 잘못된 innerHTML 방식 생성 |
| 6-8 | 예 — 프로젝트 생성 시 this 충돌 + 핸들러 미등록 |

---

## 교훈

1. **API 시그니처는 원본 소스에서 확인**: `subscribe(3인수)` ≠ `unsubscribe(2인수)`. 대칭적으로 보이는 API도 실제 구현이 다를 수 있음.

2. **"동작하니까 맞다"는 위험**: #4는 런타임 오류 없이 동작했지만, API를 잘못 이해한 코드. 이런 코드가 예제에 있으면 모든 새 컴포넌트에 전파됨.

3. **SKILL 템플릿과 예제의 동기화 필수**: SKILL이 예제를 참조하여 코드를 생성하므로, 예제가 변경되면 SKILL 템플릿도 반드시 갱신해야 함.

4. **preview.html 규칙은 구체적이어야**: "inline 방식"이라는 추상적 규칙보다 "`<link>` 금지, `<style>` 필수, CDN 허용"처럼 구체적으로 명시.

---

## 후속 조치: SKILL 문서 중복 제거 (2026-02-21)

> 커밋: `5a349ad` | 6개 SKILL 파일에서 422줄 삭제 → 108줄로 정리

### 조치 내용

이 보고서에서 발견된 불일치의 **구조적 원인** — 동일 규칙이 여러 문서에 중복 존재 — 을 해결하기 위해 SKILL 문서를 정리:

| SKILL | 변경 | 삭제된 중복 내용 |
|-------|------|----------------|
| figma-to-html | 대폭 축소 (280→72줄) | 워크플로우, MCP 도구, 추측금지, 에셋규칙, Playwright 등 |
| figma-to-inline-svg | 중간 축소 | MCP 도구, CSS 원칙, 추측금지, Playwright 등 |
| create-standard-component | 소폭 축소 | 이벤트 이중구조 테이블, 공통 금지사항 |
| create-component-with-popup | 금지사항 1줄 삭제 | `{ response }` 필수 |
| create-symbol-state-component | 금지사항 2줄 삭제 | 생성/정리 불일치, `{ response }` 필수 |
| create-project | 소폭 축소 | 이벤트 처리 원칙 테이블, 공통 금지사항 |

### 원칙

- 참조 문서(SHARED_INSTRUCTIONS.md, Figma_Conversion/CLAUDE.md)에 존재하는 내용은 SKILL에서 삭제
- SKILL에는 참조 링크 + 해당 SKILL 고유 내용만 유지
- 금지 사항은 `> 공통 금지 사항: SHARED 참조` + SKILL 고유 항목으로 통일

### 이 보고서 항목과의 관계

| # | 불일치 | 중복 제거로 해결? |
|---|--------|-----------------|
| 1-2 | MCP 서버명/도구명 | 부분적 — Figma_Conversion/CLAUDE.md에 단일 출처화. SKILL에서 중복 삭제 |
| 3 | preview.html CSS | 예 — SHARED_INSTRUCTIONS.md 1곳에만 규칙 존재 |
| 4 | unsubscribe 인수 | 예 — SHARED_INSTRUCTIONS.md 1곳에만 규칙 존재 |
| 5 | Cube3DSymbol 방식 | 해당 없음 — README 자체의 오류 (중복과 무관) |
| 6-8 | SKILL 템플릿 | 해당 없음 — 이미 SKILL 내용으로 수정 완료 |

### 남은 과제

- SKILL 테스트: Claude가 참조 문서를 실제로 읽는지 관찰 필요
- Hook 도입: 텍스트 규칙의 강제력 보완 (HOOKS_FOR_CONSISTENCY.md 참조)

---

*작성: 2026-02-20 | 관련 감사: CLAUDE_CODE_AUDIT.md*
*업데이트: 2026-02-21 | 후속 조치: SKILL 중복 제거 (5a349ad)*
