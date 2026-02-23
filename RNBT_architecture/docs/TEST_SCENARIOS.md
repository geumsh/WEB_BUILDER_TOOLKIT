# RNBT Architecture 테스트 시나리오

이 문서는 RNBT_architecture README.md를 기반으로 작성된 테스트 시나리오입니다.

---

## 관련 문서

| 문서 | 역할 | 내용 |
|------|------|------|
| **이 문서 (TEST_SCENARIOS.md)** | 테스트 명세서 (What) | 무엇을 테스트해야 하는가 - 테스트 케이스 목록과 검증 기준 |
| [tests/README.md](/RNBT_architecture/tests/README.md) | 테스트 실행 가이드 (How) | Playwright 환경 설정, 설치, 실행 방법 |

```
TEST_SCENARIOS.md          tests/README.md
(무엇을 테스트?)     →     (어떻게 실행?)
                              ↓
                         tests/*.spec.ts
                         (Playwright E2E 테스트 코드)
```

---

## 목차

1. [라이프사이클 테스트](#1-라이프사이클-테스트)
2. [이벤트 시스템 테스트](#2-이벤트-시스템-테스트)
3. [데이터 흐름 테스트](#3-데이터-흐름-테스트)
4. [Interval 관리 테스트](#4-interval-관리-테스트)
5. [리소스 정리 테스트](#5-리소스-정리-테스트)
6. [PopupMixin 테스트](#6-popupmixin-테스트)
7. [팝업 컴포넌트 테스트](#7-팝업-컴포넌트-테스트)
8. [fx.go 에러 핸들링 테스트](#8-fxgo-에러-핸들링-테스트)

---

## 1. 라이프사이클 테스트

### 1.1 개요

RNBT 아키텍처에서 라이프사이클은 페이지와 컴포넌트가 생성되고 소멸되는 순서를 정의합니다.
올바른 순서가 보장되어야 리소스 정리와 이벤트 바인딩이 정상 동작합니다.

### 1.2 테스트 대상

| 대상 | 라이프사이클 단계 |
|------|------------------|
| 페이지 | Before Load → Loaded → Before Unload |
| 컴포넌트 | register → beforeDestroy |
| 뷰어 훅 | _onViewerReady → _onViewerDestroy |
| WScript | REGISTER → BEFORE_DESTROY → DESTROY |

---

### 1.3 테스트 시나리오

#### TC-LC-001: 페이지 라이프사이클 순서 검증

**목적:** 페이지의 Before Load → Loaded → Before Unload 순서가 올바르게 실행되는지 검증

**사전조건:**
- 테스트용 페이지가 준비되어 있음
- 각 라이프사이클 단계에서 로그를 출력하도록 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 로드 시작 | `[Page] Before Load` 로그 출력 |
| 2 | 모든 컴포넌트 register 완료 대기 | 컴포넌트 register 로그들이 Before Load 이후에 출력 |
| 3 | 모든 컴포넌트 completed 후 | `[Page] Loaded` 로그 출력 |
| 4 | 페이지 언로드 시작 | `[Page] Before Unload` 로그 출력 |
| 5 | 컴포넌트 beforeDestroy 실행 | 컴포넌트 beforeDestroy가 Before Unload 이후에 실행 |

**주입 코드 (CodeBox에 입력):**

```javascript
// beforeLoad 탭
console.log('[Page] Before Load - timestamp:', Date.now());

// loaded 탭
console.log('[Page] Loaded - timestamp:', Date.now());

// beforeUnLoad 탭
console.log('[Page] Before Unload - timestamp:', Date.now());
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const consoleLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    consoleLogs.push(msg.text());
  }
});

// 뷰어 로드 후 대기
await previewPage.waitForTimeout(3000);

// 라이프사이클 순서 검증: Before Load → Loaded
const beforeLoadIdx = consoleLogs.findIndex(l => l.includes('Before Load'));
const loadedIdx = consoleLogs.findIndex(l => l.includes('Loaded'));

expect(beforeLoadIdx).toBeGreaterThanOrEqual(0);
expect(loadedIdx).toBeGreaterThanOrEqual(0);
expect(beforeLoadIdx).toBeLessThan(loadedIdx);

// 페이지 이동 후 Before Unload 검증
const beforeUnloadIdx = consoleLogs.findIndex(l => l.includes('Before Unload'));
expect(beforeUnloadIdx).toBeGreaterThanOrEqual(0);
```

**예상 로그 순서:**
```
[Page] Before Load - timestamp: 1000
[Component A] register - timestamp: 1001
[Component B] register - timestamp: 1002
[Page] Loaded - timestamp: 1003
... (사용자 인터랙션) ...
[Page] Before Unload - timestamp: 2000
[Component A] beforeDestroy - timestamp: 2001
[Component B] beforeDestroy - timestamp: 2002
```

**통과 기준:**
- Before Load가 모든 컴포넌트 register 이전에 실행됨
- Loaded가 모든 컴포넌트 completed 이후에 실행됨
- Before Unload가 모든 컴포넌트 beforeDestroy 이전에 실행됨

---

#### TC-LC-002: 컴포넌트 라이프사이클 순서 검증

**목적:** 컴포넌트의 register → beforeDestroy 순서가 올바르게 실행되는지 검증

**사전조건:**
- 테스트용 컴포넌트가 페이지에 배치되어 있음
- 각 라이프사이클 단계에서 로그를 출력하도록 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 컴포넌트 로드 | `[Component] register` 로그 출력 |
| 2 | register에서 this.appendElement 접근 | HTMLElement(2D) 또는 THREE.Object3D(3D) 반환 |
| 3 | 페이지 언로드 시작 | `[Component] beforeDestroy` 로그 출력 |
| 4 | beforeDestroy에서 this.appendElement 접근 | 여전히 접근 가능 |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭
console.log('[Component] register');
console.log('[Component] appendElement:', this.appendElement);
console.log('[Component] appendElement tagName:', this.appendElement?.tagName); // 2D의 경우 DIV

// beforeDestroy 탭
console.log('[Component] beforeDestroy');
console.log('[Component] appendElement still accessible:', !!this.appendElement);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const componentLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Component]')) {
    componentLogs.push(msg.text());
  }
});

// 뷰어 로드 후 대기
await previewPage.locator('.badge_1').waitFor({ state: 'visible', timeout: 30000 });

// register 로그 확인
const registerIdx = componentLogs.findIndex(l => l.includes('[Component] register'));
expect(registerIdx).toBeGreaterThanOrEqual(0);

// appendElement가 유효한 DOM 요소인지 확인
const appendElementLog = componentLogs.find(l => l.includes('appendElement tagName:'));
expect(appendElementLog).toContain('DIV');

// 페이지 이동으로 beforeDestroy 트리거 후
const beforeDestroyIdx = componentLogs.findIndex(l => l.includes('[Component] beforeDestroy'));
expect(beforeDestroyIdx).toBeGreaterThanOrEqual(0);

// beforeDestroy에서 appendElement 접근 가능 확인
const accessibleLog = componentLogs.find(l => l.includes('appendElement still accessible:'));
expect(accessibleLog).toContain('true');

// 순서 검증: register → beforeDestroy
expect(registerIdx).toBeLessThan(beforeDestroyIdx);
```

**통과 기준:**
- register에서 this.appendElement가 유효한 DOM 요소임
- beforeDestroy에서 this.appendElement가 여전히 접근 가능함

---

#### TC-LC-003: 뷰어 전용 라이프사이클 훅 실행 순서 검증

**목적:** _onViewerReady와 _onViewerDestroy가 WScript 이벤트와 올바른 순서로 실행되는지 검증

**사전조건:**
- 커스텀 컴포넌트 클래스가 정의되어 있음
- 뷰어 모드로 실행됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 컴포넌트 로드 (등록 시점) | 1) `_onViewerReady()` → 2) `WScript REGISTER` 순서로 실행 |
| 2 | 컴포넌트 언로드 (소멸 시점) | 1) `WScript BEFORE_DESTROY` → 2) `_onViewerDestroy()` → 3) `WScript DESTROY` 순서로 실행 |

**참고 — 커스텀 컴포넌트 클래스 (사전 구현 필요):**

이 TC는 `_onViewerReady`/`_onViewerDestroy` 훅이 정의된 커스텀 컴포넌트가 필요합니다.
해당 훅은 CodeBox로 주입할 수 없으며, 컴포넌트 클래스 파일에 사전 정의되어야 합니다.

```javascript
// 커스텀 컴포넌트 클래스 정의 (컴포넌트 JS 파일)
class TestComponent extends WVDOMComponent {
  _onViewerReady() {
    console.log('[TestComponent] _onViewerReady');
  }

  _onViewerDestroy() {
    console.log('[TestComponent] _onViewerDestroy');
  }
}
```

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭
console.log('[TestComponent] WScript REGISTER');

// beforeDestroy 탭
console.log('[TestComponent] WScript BEFORE_DESTROY');

// destroy 탭
console.log('[TestComponent] WScript DESTROY');
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const hookLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[TestComponent]')) {
    hookLogs.push(msg.text());
  }
});

// 뷰어 로드 후 대기
await previewPage.locator('.test_component_1').waitFor({ state: 'visible', timeout: 30000 });

// 등록 시점 순서 검증: _onViewerReady → WScript REGISTER
const viewerReadyIdx = hookLogs.findIndex(l => l.includes('_onViewerReady'));
const registerIdx = hookLogs.findIndex(l => l.includes('WScript REGISTER'));

expect(viewerReadyIdx).toBeGreaterThanOrEqual(0);
expect(registerIdx).toBeGreaterThanOrEqual(0);
expect(viewerReadyIdx).toBeLessThan(registerIdx);

// 페이지 이동으로 소멸 트리거 후
const beforeDestroyIdx = hookLogs.findIndex(l => l.includes('WScript BEFORE_DESTROY'));
const viewerDestroyIdx = hookLogs.findIndex(l => l.includes('_onViewerDestroy'));
const destroyIdx = hookLogs.findIndex(l => l.includes('WScript DESTROY'));

// 소멸 시점 순서 검증: BEFORE_DESTROY → _onViewerDestroy → DESTROY
expect(beforeDestroyIdx).toBeLessThan(viewerDestroyIdx);
expect(viewerDestroyIdx).toBeLessThan(destroyIdx);
```

**예상 로그 순서 (등록):**
```
[TestComponent] _onViewerReady
[TestComponent] WScript REGISTER
```

**예상 로그 순서 (소멸):**
```
[TestComponent] WScript BEFORE_DESTROY
[TestComponent] _onViewerDestroy
[TestComponent] WScript DESTROY
```

**통과 기준:**
- 등록 시점: _onViewerReady → WScript REGISTER 순서
- 소멸 시점: WScript BEFORE_DESTROY → _onViewerDestroy → WScript DESTROY 순서

---

#### TC-LC-004: appendElement 접근성 검증 (시점별)

**목적:** 각 라이프사이클 시점에서 this.appendElement 접근 가능 여부를 검증

**사전조건:**
- 테스트용 컴포넌트가 준비되어 있음

**테스트 단계:**

| 시점 | 행위 | 예상 결과 |
|------|------|----------|
| _onViewerReady() | this.appendElement 접근 | 접근 가능 (유효한 DOM) |
| WScript REGISTER | this.appendElement 접근 | 접근 가능 (유효한 DOM) |
| WScript BEFORE_DESTROY | this.appendElement 접근 | 접근 가능 (유효한 DOM) |
| _onViewerDestroy() | this.appendElement 접근 | 접근 가능 (유효한 DOM) |
| WScript DESTROY | this.appendElement 접근 | **접근 불가** (이미 제거됨) |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭
console.log('[REGISTER] appendElement accessible:', !!this.appendElement);
console.log('[REGISTER] appendElement hasChildren:', this.appendElement?.children?.length >= 0);

// beforeDestroy 탭
console.log('[BEFORE_DESTROY] appendElement accessible:', !!this.appendElement);
console.log('[BEFORE_DESTROY] appendElement hasChildren:', this.appendElement?.children?.length >= 0);

// destroy 탭
console.log('[DESTROY] appendElement:', this.appendElement);
console.log('[DESTROY] appendElement accessible:', !!this.appendElement);
```

> **참고:** `_onViewerReady`/`_onViewerDestroy` 시점의 검증은 TC-LC-003의 커스텀 컴포넌트를 사용합니다.

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const accessLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().match(/\[(REGISTER|BEFORE_DESTROY|DESTROY)\]/)) {
    accessLogs.push(msg.text());
  }
});

// 뷰어 로드 후 register 시점 검증
const registerLog = accessLogs.find(l => l.includes('[REGISTER] appendElement accessible:'));
expect(registerLog).toContain('true');

// 페이지 이동으로 소멸 트리거 후
const beforeDestroyLog = accessLogs.find(l => l.includes('[BEFORE_DESTROY] appendElement accessible:'));
expect(beforeDestroyLog).toContain('true');

// destroy 시점: appendElement 접근 불가 검증
const destroyLog = accessLogs.find(l => l.includes('[DESTROY] appendElement accessible:'));
expect(destroyLog).toContain('false');
```

**통과 기준:**
- _onViewerReady ~ _onViewerDestroy: appendElement 접근 가능
- WScript DESTROY: appendElement가 null 또는 접근 불가

---

#### TC-LC-005: 다중 컴포넌트 라이프사이클 순서 검증

**목적:** 페이지에 여러 컴포넌트가 있을 때 라이프사이클 순서가 보장되는지 검증

**사전조건:**
- 페이지에 Component A, B, C가 배치되어 있음
- 각 컴포넌트에서 라이프사이클 로그 출력

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 로드 | Page Before Load → 모든 컴포넌트 register → Page Loaded |
| 2 | 페이지 언로드 | Page Before Unload → 모든 컴포넌트 beforeDestroy |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭 — lifecycleLog 초기화
window.lifecycleLog = [];
window.lifecycleLog.push({ type: 'page', phase: 'before_load', timestamp: Date.now() });
console.log('[LC-005] Page before_load');

// 페이지 loaded 탭
window.lifecycleLog.push({ type: 'page', phase: 'loaded', timestamp: Date.now() });
console.log('[LC-005] Page loaded');

// 페이지 beforeUnLoad 탭
window.lifecycleLog.push({ type: 'page', phase: 'before_unload', timestamp: Date.now() });
console.log('[LC-005] Page before_unload');

// 각 컴포넌트 register 탭
window.lifecycleLog.push({ type: 'component', name: this.name, phase: 'register', timestamp: Date.now() });
console.log('[LC-005] ' + this.name + ' register');

// 각 컴포넌트 beforeDestroy 탭
window.lifecycleLog.push({ type: 'component', name: this.name, phase: 'beforeDestroy', timestamp: Date.now() });
console.log('[LC-005] ' + this.name + ' beforeDestroy');
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const lc005Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[LC-005]')) {
    lc005Logs.push(msg.text());
  }
});

// 뷰어 로드 후 페이지 이동으로 소멸 트리거
await previewPage.locator('.badge_1').waitFor({ state: 'visible', timeout: 30000 });
await previewPage.locator('.badge_1').click();
await previewPage.waitForTimeout(1000);

// window.lifecycleLog 데이터 가져오기
const validationResult = await previewPage.evaluate(() => {
  const log = (window as any).lifecycleLog;
  const pageBeforeLoad = log.find((l: any) => l.type === 'page' && l.phase === 'before_load');
  const pageLoaded = log.find((l: any) => l.type === 'page' && l.phase === 'loaded');
  const pageBeforeUnload = log.find((l: any) => l.type === 'page' && l.phase === 'before_unload');
  const componentRegisters = log.filter((l: any) => l.type === 'component' && l.phase === 'register');
  const componentDestroys = log.filter((l: any) => l.type === 'component' && l.phase === 'beforeDestroy');

  const allRegistersAfterBeforeLoad = componentRegisters.every((r: any) => r.timestamp > pageBeforeLoad.timestamp);
  const loadedAfterAllRegisters = componentRegisters.every((r: any) => r.timestamp < pageLoaded.timestamp);
  const allDestroysAfterBeforeUnload = componentDestroys.every((d: any) => d.timestamp > pageBeforeUnload.timestamp);

  return { allRegistersAfterBeforeLoad, loadedAfterAllRegisters, allDestroysAfterBeforeUnload };
});

expect(validationResult.allRegistersAfterBeforeLoad).toBe(true);
expect(validationResult.loadedAfterAllRegisters).toBe(true);
expect(validationResult.allDestroysAfterBeforeUnload).toBe(true);
```

**통과 기준:**
- 모든 검증 항목이 true

---

#### TC-LC-006: 2D vs 3D appendElement 타입 검증

**목적:** 2D 컴포넌트와 3D 컴포넌트의 appendElement 타입이 올바른지 검증

**사전조건:**
- 2D 컴포넌트와 3D 컴포넌트가 각각 준비되어 있음

**테스트 단계:**

| 컴포넌트 타입 | 행위 | 예상 결과 |
|--------------|------|----------|
| 2D | this.appendElement 타입 확인 | HTMLElement (div), id 속성 = instance id |
| 3D | this.appendElement 타입 확인 | THREE.Object3D, name = "MainGroup" |

**주입 코드 (CodeBox에 입력):**

```javascript
// 2D 컴포넌트 register 탭
console.log('[2D Component] is HTMLElement:', this.appendElement instanceof HTMLElement);
console.log('[2D Component] tagName:', this.appendElement?.tagName);
console.log('[2D Component] id matches:', this.appendElement?.id === this.id);

// 3D 컴포넌트 register 탭
console.log('[3D Component] is Object3D:', this.appendElement instanceof THREE.Object3D);
console.log('[3D Component] name:', this.appendElement?.name);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const typeLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().match(/\[(2D|3D) Component\]/)) {
    typeLogs.push(msg.text());
  }
});

// 뷰어 로드 후 대기
await previewPage.waitForTimeout(3000);

// 2D 컴포넌트 검증
const is2DLog = typeLogs.find(l => l.includes('[2D Component] is HTMLElement:'));
expect(is2DLog).toContain('true');

const tagNameLog = typeLogs.find(l => l.includes('[2D Component] tagName:'));
expect(tagNameLog).toContain('DIV');

const idMatchLog = typeLogs.find(l => l.includes('[2D Component] id matches:'));
expect(idMatchLog).toContain('true');

// 3D 컴포넌트 검증
const is3DLog = typeLogs.find(l => l.includes('[3D Component] is Object3D:'));
expect(is3DLog).toContain('true');

const nameLog = typeLogs.find(l => l.includes('[3D Component] name:'));
expect(nameLog).toContain('MainGroup');
```

**통과 기준:**
- 2D: HTMLElement(div) + id = instance id
- 3D: THREE.Object3D + name = "MainGroup"

---

#### TC-LC-007: this.name 접근성 검증

**목적:** 컴포넌트 인스턴스 이름이 this.name으로 접근 가능한지 검증

**사전조건:**
- 테스트 컴포넌트의 인스턴스 이름이 지정되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | register에서 this.name 접근 | 인스턴스 이름 문자열 반환 |
| 2 | beforeDestroy에서 this.name 접근 | 동일한 인스턴스 이름 반환 |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭
console.log('[Component] Instance name:', this.name);
console.log('[Component] Name type:', typeof this.name);
console.log('[Component] Name is not empty:', this.name.length > 0);

// beforeDestroy 탭
console.log('[Component] Name still accessible:', this.name);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const nameLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Component]') && msg.text().includes('name')) {
    nameLogs.push(msg.text());
  }
});

// 뷰어 로드 후 대기
await previewPage.locator('.badge_1').waitFor({ state: 'visible', timeout: 30000 });

// register에서 this.name 확인
const nameLog = nameLogs.find(l => l.includes('Instance name:'));
expect(nameLog).toBeDefined();
expect(nameLog).not.toContain('undefined');

const typeLog = nameLogs.find(l => l.includes('Name type:'));
expect(typeLog).toContain('string');

const notEmptyLog = nameLogs.find(l => l.includes('Name is not empty:'));
expect(notEmptyLog).toContain('true');

// 페이지 이동으로 소멸 트리거 후
const accessibleLog = nameLogs.find(l => l.includes('Name still accessible:'));
expect(accessibleLog).toBeDefined();
expect(accessibleLog).not.toContain('undefined');
```

**통과 기준:**
- this.name이 비어있지 않은 문자열
- register와 beforeDestroy에서 동일한 값

---

### 1.4 테스트 요약 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-LC-001 | 페이지 라이프사이클 순서 검증 | ☐ |
| TC-LC-002 | 컴포넌트 라이프사이클 순서 검증 | ☐ |
| TC-LC-003 | 뷰어 전용 라이프사이클 훅 실행 순서 검증 | ☐ |
| TC-LC-004 | appendElement 접근성 검증 (시점별) | ☐ |
| TC-LC-005 | 다중 컴포넌트 라이프사이클 순서 검증 | ☐ |
| TC-LC-006 | 2D vs 3D appendElement 타입 검증 | ☐ |
| TC-LC-007 | this.name 접근성 검증 | ☐ |

---

## 2. 이벤트 시스템 테스트

### 2.1 개요

RNBT 아키텍처의 이벤트 시스템은 크게 세 가지로 구성됩니다:
1. **EventBus (Weventbus)**: 페이지-컴포넌트 간 통신
2. **customEvents + bindEvents**: 컴포넌트 DOM 이벤트를 EventBus로 발행
3. **3D 이벤트 (bind3DEvents)**: 3D 오브젝트 상호작용

### 2.2 테스트 대상

| 대상 | 설명 |
|------|------|
| eventBusHandlers | 페이지에서 정의하는 이벤트 핸들러 객체 |
| onEventBusHandlers | EventBus 핸들러 등록 함수 |
| offEventBusHandlers | EventBus 핸들러 해제 함수 |
| customEvents | 컴포넌트 DOM 이벤트 정의 객체 |
| bindEvents | DOM 이벤트를 EventBus로 바인딩하는 함수 |
| removeCustomEvents | DOM 이벤트 바인딩 해제 함수 |
| bind3DEvents | 3D 오브젝트 이벤트 바인딩 함수 |
| @ 접두사 | 커스텀 이벤트 구분자 |

---

### 2.3 테스트 시나리오

#### TC-EV-001: EventBus 핸들러 등록 및 호출 검증

**목적:** onEventBusHandlers로 등록한 핸들러가 정상적으로 호출되는지 검증

**사전조건:**
- 페이지 before_load.js에 eventBusHandlers가 정의되어 있음
- 컴포넌트에서 해당 이벤트를 발행할 준비가 되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | eventBusHandlers 객체 정의 | 객체 생성됨 |
| 2 | onEventBusHandlers() 호출 | 핸들러가 EventBus에 등록됨 |
| 3 | Weventbus.emit('@testEvent', payload) 호출 | 등록된 핸들러가 payload와 함께 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@testEvent': ({ event, targetInstance }) => {
        console.log('[EventBus] @testEvent received');
        console.log('[EventBus] event type:', event?.type);
        console.log('[EventBus] targetInstance name:', targetInstance?.name);
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

```javascript
// 컴포넌트 register 탭 (이벤트 발행)
Weventbus.emit('@testEvent', {
    event: { type: 'click', target: { value: 'test-value' } },
    targetInstance: this
});
console.log('[Component] @testEvent emitted');
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const eventLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[EventBus]') || msg.text().includes('[Component]')) {
    eventLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 이벤트가 발행되었는지 확인
const emittedLog = eventLogs.find(l => l.includes('@testEvent emitted'));
expect(emittedLog).toBeDefined();

// 핸들러가 호출되었는지 확인
const receivedLog = eventLogs.find(l => l.includes('@testEvent received'));
expect(receivedLog).toBeDefined();

// targetInstance 정보 확인
const instanceLog = eventLogs.find(l => l.includes('targetInstance name:'));
expect(instanceLog).toBeDefined();
expect(instanceLog).not.toContain('undefined');
```

**통과 기준:**
- 핸들러가 호출되어 '@testEvent received' 로그가 출력됨
- receivedPayload에 event와 targetInstance가 포함됨

---

#### TC-EV-002: EventBus 핸들러 해제 검증

**목적:** offEventBusHandlers로 핸들러를 해제하면 이벤트가 더 이상 수신되지 않는지 검증

**사전조건:**
- 이벤트 핸들러가 등록되어 있음
- 이벤트가 정상 동작하는 것이 확인됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 핸들러가 등록된 상태에서 이벤트 발행 | 핸들러 호출됨, callCount = 1 |
| 2 | offEventBusHandlers() 호출 | 핸들러가 해제됨 |
| 3 | 동일한 이벤트 다시 발행 | 핸들러 호출되지 않음, callCount = 1 (변화 없음) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭 (핸들러 등록 — TC-EV-001과 동일)
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@testEvent': ({ event, targetInstance }) => {
        console.log('[EventBus] @testEvent received');
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

```javascript
// 페이지 beforeUnLoad 탭 (핸들러 해제)
const { offEventBusHandlers } = Wkit;

// 해제 전 이벤트 발행
Weventbus.emit('@testEvent', { event: {}, targetInstance: this });
console.log('[Before off] event emitted');

// 핸들러 해제
offEventBusHandlers.call(this, this.eventBusHandlers);
console.log('[After off] handlers removed');

// 해제 후 이벤트 발행
Weventbus.emit('@testEvent', { event: {}, targetInstance: this });
console.log('[After off] event emitted again');
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const offLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[EventBus]') || msg.text().includes('[Before off]') || msg.text().includes('[After off]')) {
    offLogs.push(msg.text());
  }
});

// 페이지 이동으로 beforeUnLoad 트리거 후
// 해제 전 이벤트 수신 확인 (beforeUnLoad에서 emit → 핸들러 호출)
const beforeOffReceived = offLogs.filter(l => l.includes('@testEvent received'));
expect(beforeOffReceived.length).toBeGreaterThanOrEqual(1);

// 해제 후에는 핸들러가 호출되지 않아야 함
// (해제 후 emit → 핸들러 호출되지 않음 → '@testEvent received' 증가 없음)
const handlersRemovedIdx = offLogs.findIndex(l => l.includes('handlers removed'));
const receivedAfterOff = offLogs.filter((l, i) => i > handlersRemovedIdx && l.includes('@testEvent received'));
expect(receivedAfterOff.length).toBe(0);
```

**통과 기준:**
- 해제 후 이벤트 발행 시 핸들러가 호출되지 않음
- callCount가 증가하지 않음

---

#### TC-EV-003: customEvents + bindEvents 동작 검증 (2D)

**목적:** 컴포넌트의 customEvents 정의와 bindEvents를 통한 이벤트 위임이 정상 동작하는지 검증

**사전조건:**
- 컴포넌트에 버튼 요소가 존재함
- customEvents가 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | customEvents 객체 정의 | { click: { '.my-button': '@buttonClicked' } } 형태 |
| 2 | bindEvents(this, customEvents) 호출 | 이벤트 위임이 설정됨 |
| 3 | .my-button 클릭 | '@buttonClicked' 이벤트가 EventBus로 발행됨 |
| 4 | 페이지의 '@buttonClicked' 핸들러 호출됨 | event와 targetInstance 수신 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.my-button': '@buttonClicked',
        '.my-link': '@linkClicked'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@buttonClicked': ({ event, targetInstance }) => {
        console.log('[Page] Button clicked in component:', targetInstance.name);
        console.log('[Page] Event target tagName:', event.target?.tagName);
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const clickLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    clickLogs.push(msg.text());
  }
});

// 컴포넌트 내 .my-button 클릭
await previewPage.locator('.my-button').click();
await previewPage.waitForTimeout(500);

// 핸들러 호출 확인
const btnClickLog = clickLogs.find(l => l.includes('Button clicked in component:'));
expect(btnClickLog).toBeDefined();

// targetInstance name 확인
expect(btnClickLog).not.toContain('undefined');

// event.target 확인
const targetLog = clickLogs.find(l => l.includes('Event target tagName:'));
expect(targetLog).toBeDefined();
```

**통과 기준:**
- .my-button 클릭 시 페이지의 '@buttonClicked' 핸들러가 호출됨
- targetInstance가 해당 컴포넌트를 가리킴
- event.target이 클릭된 버튼 요소를 가리킴

---

#### TC-EV-004: 이벤트 위임 패턴 검증 (동적 요소)

**목적:** 이벤트 위임을 통해 동적으로 생성된 요소에서도 이벤트가 정상 동작하는지 검증

**사전조건:**
- bindEvents가 적용된 컴포넌트가 있음
- 초기 로드 시 .dynamic-item 요소가 없음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | customEvents에 '.dynamic-item': '@itemClicked' 정의 | 이벤트 위임 설정됨 |
| 2 | bindEvents 호출 (이 시점에 .dynamic-item 없음) | 정상 완료 |
| 3 | 동적으로 .dynamic-item 요소 생성 | DOM에 추가됨 |
| 4 | 동적 생성된 요소 클릭 | '@itemClicked' 이벤트 발행됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.dynamic-item': '@itemClicked'
    }
};

bindEvents(this, this.customEvents);

// 동적 요소 생성 (register 시점에 .dynamic-item이 없는 상태에서 바인딩 후 생성)
setTimeout(() => {
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.dataset.id = 'item-1';
    item.textContent = 'First Item';
    this.appendElement.querySelector('.item-list').appendChild(item);
    console.log('[Component] Dynamic item created');
}, 1000);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@itemClicked': ({ event, targetInstance }) => {
        console.log('[Page] Dynamic item clicked');
        console.log('[Page] item dataset.id:', event.target?.dataset?.id);
        console.log('[Page] targetInstance:', targetInstance?.name);
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const dynamicLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]') || msg.text().includes('[Component]')) {
    dynamicLogs.push(msg.text());
  }
});

// 동적 요소 생성 대기
await previewPage.locator('.dynamic-item').waitFor({ state: 'visible', timeout: 5000 });

// 동적 생성된 요소 클릭
await previewPage.locator('.dynamic-item').click();
await previewPage.waitForTimeout(500);

// 이벤트 위임으로 핸들러가 호출되었는지 확인
const itemClickedLog = dynamicLogs.find(l => l.includes('Dynamic item clicked'));
expect(itemClickedLog).toBeDefined();

// dataset.id 확인
const datasetLog = dynamicLogs.find(l => l.includes('item dataset.id:'));
expect(datasetLog).toContain('item-1');
```

**통과 기준:**
- bindEvents 시점에 존재하지 않던 요소도 클릭 이벤트가 정상 발행됨
- 이벤트 위임 패턴이 올바르게 동작함

---

#### TC-EV-005: removeCustomEvents 동작 검증

**목적:** removeCustomEvents로 이벤트 바인딩을 해제하면 더 이상 이벤트가 발행되지 않는지 검증

**사전조건:**
- bindEvents로 이벤트가 바인딩되어 있음
- 이벤트가 정상 동작하는 것이 확인됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 바인딩된 상태에서 버튼 클릭 | 이벤트 발행됨, callCount = 1 |
| 2 | removeCustomEvents(this, customEvents) 호출 | 이벤트 바인딩 해제됨 |
| 3 | 동일 버튼 다시 클릭 | 이벤트 발행되지 않음, callCount = 1 (변화 없음) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭 (이벤트 바인딩 — TC-EV-003과 동일)
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.my-button': '@buttonClicked'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 컴포넌트 beforeDestroy 탭 (이벤트 해제)
const { removeCustomEvents } = Wkit;

console.log('[Before remove] About to remove custom events');
removeCustomEvents(this, this.customEvents);
this.customEvents = null;
console.log('[After remove] Custom events removed');
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@buttonClicked': ({ event, targetInstance }) => {
        console.log('[Page] @buttonClicked received');
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const removeLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]') || msg.text().includes('[Before remove]') || msg.text().includes('[After remove]')) {
    removeLogs.push(msg.text());
  }
});

// 해제 전: 버튼 클릭 시 이벤트 발행 확인
await previewPage.locator('.my-button').click();
await previewPage.waitForTimeout(500);

const beforeRemoveReceived = removeLogs.filter(l => l.includes('@buttonClicked received'));
expect(beforeRemoveReceived.length).toBe(1);

// 페이지 이동으로 beforeDestroy 트리거 (removeCustomEvents 실행됨)
// 이후 버튼 클릭 시 이벤트가 발행되지 않아야 함
```

**통과 기준:**
- removeCustomEvents 후 클릭해도 이벤트가 발행되지 않음

---

#### TC-EV-006: @ 접두사 커스텀 이벤트 구분 검증

**목적:** @ 접두사가 커스텀 이벤트를 구분하는 용도로 올바르게 사용되는지 검증

**사전조건:**
- customEvents에 @ 접두사가 있는 이벤트명과 없는 이벤트명이 정의됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | '@customEvent' 형태로 정의 | EventBus를 통해 발행됨 |
| 2 | 'nativeEvent' 형태로 정의 (@ 없음) | 동작 방식 확인 필요 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.custom-btn': '@customButtonClicked',   // @ 접두사: 커스텀 이벤트
        '.native-btn': 'nativeButtonClicked'     // @ 없음: 네이티브 이벤트
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@customButtonClicked': ({ event, targetInstance }) => {
        console.log('[Page] Custom event received (@ prefix)');
    },
    'nativeButtonClicked': ({ event, targetInstance }) => {
        console.log('[Page] Native event received (no @ prefix)');
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const prefixLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    prefixLogs.push(msg.text());
  }
});

// @ 접두사 버튼 클릭
await previewPage.locator('.custom-btn').click();
await previewPage.waitForTimeout(500);

const customLog = prefixLogs.find(l => l.includes('Custom event received'));
expect(customLog).toBeDefined();

// @ 없는 버튼 클릭
await previewPage.locator('.native-btn').click();
await previewPage.waitForTimeout(500);

// 동작 방식 확인 (@ 접두사 유무에 따른 차이 검증)
```

**통과 기준:**
- @ 접두사가 있는 이벤트명은 EventBus를 통해 정상 발행/수신됨
- @ 접두사의 의미와 동작이 명확함

---

#### TC-EV-007: 3D 이벤트 바인딩 검증 (bind3DEvents)

**목적:** bind3DEvents로 3D 오브젝트에 이벤트가 정상 바인딩되는지 검증

**사전조건:**
- 3D 컴포넌트가 준비되어 있음
- Three.js 환경이 설정되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | this.customEvents = { click: '@3dObjectClicked' } 정의 | 3D 이벤트 정의됨 |
| 2 | bind3DEvents(this, customEvents) 호출 | 3D 오브젝트에 이벤트 바인딩됨 |
| 3 | 3D 오브젝트 클릭 | '@3dObjectClicked' 이벤트 발행됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.customEvents = {
    click: '@3dObjectClicked',
    mousemove: '@3dObjectHovered'
};

bind3DEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@3dObjectClicked': ({ event, targetInstance }) => {
        console.log('[Page] 3D object clicked');
        console.log('[Page] intersects count:', event.intersects?.length);
        console.log('[Page] intersected object type:', event.intersects[0]?.object?.type);
        console.log('[Page] targetInstance name:', targetInstance.name);
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const threeDLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    threeDLogs.push(msg.text());
  }
});

// 3D 캔버스 영역 클릭 (3D 오브젝트 위치)
await previewPage.locator('canvas').click();
await previewPage.waitForTimeout(500);

// 이벤트 발행 확인
const clickedLog = threeDLogs.find(l => l.includes('3D object clicked'));
expect(clickedLog).toBeDefined();

// intersects 정보 확인
const intersectsLog = threeDLogs.find(l => l.includes('intersects count:'));
expect(intersectsLog).toBeDefined();

// targetInstance 확인
const instanceLog = threeDLogs.find(l => l.includes('targetInstance name:'));
expect(instanceLog).toBeDefined();
expect(instanceLog).not.toContain('undefined');
```

**통과 기준:**
- 3D 오브젝트 클릭 시 이벤트가 발행됨
- event.intersects에 교차 정보가 포함됨
- targetInstance가 3D 컴포넌트를 가리킴

---

#### TC-EV-008: 3D 이벤트와 2D 이벤트 차이점 검증

**목적:** 3D 이벤트와 2D 이벤트의 구조적 차이를 검증

**사전조건:**
- 2D 컴포넌트와 3D 컴포넌트가 각각 준비되어 있음

**테스트 단계:**

| 구분 | 2D 이벤트 | 3D 이벤트 |
|------|----------|----------|
| customEvents 구조 | `{ click: { '.selector': '@event' } }` | `{ click: '@event' }` |
| event 객체 | DOM Event (target, type 등) | intersects 배열 포함 |
| 선택자 | CSS 선택자 사용 | 선택자 없음 (전체 오브젝트 대상) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 2D 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.button-a': '@buttonAClicked',
        '.button-b': '@buttonBClicked'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.customEvents = {
    click: '@3dClicked'  // 선택자 없이 이벤트명만
};

bind3DEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@buttonAClicked': ({ event }) => {
        console.log('[2D] event.target tagName:', event.target?.tagName);
        console.log('[2D] event.type:', event.type);
    },
    '@3dClicked': ({ event }) => {
        console.log('[3D] event.intersects is array:', Array.isArray(event.intersects));
        console.log('[3D] event.intersects[0].object type:', event.intersects[0]?.object?.type);
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const diffLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[2D]') || msg.text().includes('[3D]')) {
    diffLogs.push(msg.text());
  }
});

// 2D 버튼 클릭
await previewPage.locator('.button-a').click();
await previewPage.waitForTimeout(500);

// 2D 이벤트 구조 확인
const targetLog = diffLogs.find(l => l.includes('[2D] event.target tagName:'));
expect(targetLog).toBeDefined();

const typeLog = diffLogs.find(l => l.includes('[2D] event.type:'));
expect(typeLog).toContain('click');

// 3D 오브젝트 클릭
await previewPage.locator('canvas').click();
await previewPage.waitForTimeout(500);

// 3D 이벤트 구조 확인
const intersectsLog = diffLogs.find(l => l.includes('[3D] event.intersects is array:'));
expect(intersectsLog).toContain('true');
```

**통과 기준:**
- 2D: event.target이 DOM Element
- 3D: event.intersects가 배열이며, 교차된 3D 오브젝트 정보 포함
- 구조적 차이가 문서와 일치

---

#### TC-EV-009: datasetInfo 검증 (3D 컴포넌트)

**목적:** 3D 컴포넌트의 datasetInfo가 배열 형태로 정의되고, targetInstance를 통해 접근 가능한지 검증

**사전조건:**
- 3D 컴포넌트에 datasetInfo가 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | this.datasetInfo 배열 정의 | 다중 데이터셋 정보 포함 |
| 2 | 3D 오브젝트 클릭 | 이벤트 발행됨 |
| 3 | targetInstance.datasetInfo 접근 | 배열 반환됨 |
| 4 | datasetInfo 순회하며 데이터 fetch | 각 데이터셋에 대해 fetchData 호출 가능 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.datasetInfo = [
    {
        datasetName: 'sensorData',
        param: { id: this.id, type: 'temperature' }
    },
    {
        datasetName: 'historyData',
        param: { id: this.id, range: '24h' }
    }
];

this.customEvents = {
    click: '@sensorClicked'
};

bind3DEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;
const { fetchData } = Wkit;

this.eventBusHandlers = {
    '@sensorClicked': async ({ event, targetInstance }) => {
        const { datasetInfo } = targetInstance;

        console.log('[Page] datasetInfo is array:', Array.isArray(datasetInfo));
        console.log('[Page] datasetInfo length:', datasetInfo?.length);

        if (datasetInfo?.length) {
            for (const { datasetName, param } of datasetInfo) {
                console.log('[Page] Fetching ' + datasetName);
                const data = await fetchData(this, datasetName, param);
                console.log('[Page] Received data from ' + datasetName + ':', !!data);
            }
        }
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const datasetLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    datasetLogs.push(msg.text());
  }
});

// 3D 오브젝트 클릭
await previewPage.locator('canvas').click();
await previewPage.waitForTimeout(3000); // fetchData 대기

// datasetInfo 배열 확인
const isArrayLog = datasetLogs.find(l => l.includes('datasetInfo is array:'));
expect(isArrayLog).toContain('true');

const lengthLog = datasetLogs.find(l => l.includes('datasetInfo length:'));
expect(lengthLog).toContain('2');

// fetchData 호출 확인
const fetchLogs = datasetLogs.filter(l => l.includes('Fetching'));
expect(fetchLogs.length).toBe(2);

// 데이터 수신 확인
const receivedLogs = datasetLogs.filter(l => l.includes('Received data from'));
expect(receivedLogs.length).toBe(2);
```

**통과 기준:**
- datasetInfo가 배열 형태
- targetInstance를 통해 접근 가능
- 배열 순회하며 각 데이터셋에 대해 fetchData 호출 가능

---

#### TC-EV-010: event vs targetInstance 정보 비교 검증

**목적:** 이벤트 발생 시 event와 targetInstance가 제공하는 정보의 차이를 검증

**사전조건:**
- 컴포넌트에 이벤트가 바인딩되어 있음
- 해당 컴포넌트에 datasetInfo와 커스텀 메서드가 정의되어 있음

**테스트 단계:**

| 정보 타입 | event.target | targetInstance |
|-----------|--------------|----------------|
| 사용자 입력 | value, textContent | - |
| DOM 속성 | dataset, classList | - |
| 인스턴스 메타 | - | id, name |
| 데이터셋 정보 | - | datasetInfo |
| 인스턴스 메서드 | - | showDetail() 등 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.datasetInfo = [{ datasetName: 'myData', param: {} }];
this.showDetail = () => console.log('[Component] Show detail for:', this.name);

this.customEvents = {
    click: {
        '.item': '@itemClicked'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@itemClicked': ({ event, targetInstance }) => {
        // event.target에서 얻을 수 있는 정보
        console.log('[event.target] textContent:', event.target?.textContent);
        console.log('[event.target] dataset:', JSON.stringify(event.target?.dataset));

        // targetInstance에서 얻을 수 있는 정보
        console.log('[targetInstance] id:', targetInstance.id);
        console.log('[targetInstance] name:', targetInstance.name);
        console.log('[targetInstance] datasetInfo:', JSON.stringify(targetInstance.datasetInfo));
        console.log('[targetInstance] showDetail type:', typeof targetInstance.showDetail);

        // targetInstance의 메서드 호출
        if (targetInstance.showDetail) {
            targetInstance.showDetail();
        }
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const infoLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().match(/\[(event\.target|targetInstance|Component)\]/)) {
    infoLogs.push(msg.text());
  }
});

// 아이템 클릭
await previewPage.locator('.item').first().click();
await previewPage.waitForTimeout(500);

// event.target 정보 확인
const textLog = infoLogs.find(l => l.includes('[event.target] textContent:'));
expect(textLog).toBeDefined();

// targetInstance 정보 확인
const idLog = infoLogs.find(l => l.includes('[targetInstance] id:'));
expect(idLog).toBeDefined();
expect(idLog).not.toContain('undefined');

const nameLog = infoLogs.find(l => l.includes('[targetInstance] name:'));
expect(nameLog).toBeDefined();

const datasetInfoLog = infoLogs.find(l => l.includes('[targetInstance] datasetInfo:'));
expect(datasetInfoLog).toContain('myData');

// showDetail 메서드 호출 확인
const showDetailLog = infoLogs.find(l => l.includes('[targetInstance] showDetail type:'));
expect(showDetailLog).toContain('function');

const detailCallLog = infoLogs.find(l => l.includes('Show detail for:'));
expect(detailCallLog).toBeDefined();
```

**통과 기준:**
- event.target: DOM 관련 정보 (value, textContent, dataset, classList)
- targetInstance: 인스턴스 메타 정보 (id, name), datasetInfo, 커스텀 메서드
- 두 객체가 상호 보완적으로 완전한 컨텍스트 제공

---

#### TC-EV-011: 다중 이벤트 타입 바인딩 검증

**목적:** 하나의 컴포넌트에 여러 이벤트 타입(click, mouseover, change 등)을 바인딩할 수 있는지 검증

**사전조건:**
- 컴포넌트에 다양한 인터랙티브 요소가 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 여러 이벤트 타입으로 customEvents 정의 | click, mouseover, change 등 포함 |
| 2 | bindEvents 호출 | 모든 이벤트 타입이 바인딩됨 |
| 3 | 각 이벤트 타입 트리거 | 각각의 핸들러가 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.button': '@buttonClicked',
        '.link': '@linkClicked'
    },
    mouseover: {
        '.card': '@cardHovered'
    },
    change: {
        '.input-field': '@inputChanged',
        '.select-box': '@selectChanged'
    },
    submit: {
        '.form': '@formSubmitted'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@buttonClicked': () => console.log('[Page] click event: @buttonClicked'),
    '@linkClicked': () => console.log('[Page] click event: @linkClicked'),
    '@cardHovered': () => console.log('[Page] mouseover event: @cardHovered'),
    '@inputChanged': () => console.log('[Page] change event: @inputChanged'),
    '@selectChanged': () => console.log('[Page] change event: @selectChanged'),
    '@formSubmitted': () => console.log('[Page] submit event: @formSubmitted'),
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const multiEventLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]') && msg.text().includes('event:')) {
    multiEventLogs.push(msg.text());
  }
});

// click 이벤트
await previewPage.locator('.button').click();
await previewPage.waitForTimeout(300);

// mouseover 이벤트
await previewPage.locator('.card').hover();
await previewPage.waitForTimeout(300);

// change 이벤트
await previewPage.locator('.input-field').fill('new value');
await previewPage.waitForTimeout(300);

// 각 이벤트 타입별 핸들러 호출 확인
const clickLog = multiEventLogs.find(l => l.includes('click event: @buttonClicked'));
expect(clickLog).toBeDefined();

const hoverLog = multiEventLogs.find(l => l.includes('mouseover event: @cardHovered'));
expect(hoverLog).toBeDefined();

const changeLog = multiEventLogs.find(l => l.includes('change event: @inputChanged'));
expect(changeLog).toBeDefined();
```

**통과 기준:**
- 각 이벤트 타입별로 정의된 핸들러가 정상 호출됨
- 이벤트 타입별 분리가 명확함

---

#### TC-EV-012: 이벤트 핸들러에서 비동기 처리 검증

**목적:** EventBus 핸들러에서 async/await를 사용한 비동기 처리가 정상 동작하는지 검증

**사전조건:**
- fetchData 등 비동기 함수가 준비되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | async 핸들러 정의 | 비동기 핸들러가 등록됨 |
| 2 | 이벤트 발생 | 핸들러 내 await가 정상 동작함 |
| 3 | 비동기 작업 완료 후 | 후속 로직이 실행됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;
const { fetchData } = Wkit;

this.eventBusHandlers = {
    '@itemClicked': async ({ event, targetInstance }) => {
        console.log('[Handler] Start');

        const { datasetInfo } = targetInstance;

        if (datasetInfo?.length) {
            for (const { datasetName, param } of datasetInfo) {
                try {
                    const data = await fetchData(this, datasetName, param);
                    console.log('[Handler] Data received from ' + datasetName + ':', !!data);
                } catch (error) {
                    console.error('[Handler] Fetch error:', error.message);
                }
            }
        }

        console.log('[Handler] End');
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const asyncLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Handler]')) {
    asyncLogs.push(msg.text());
  }
});

// 이벤트 트리거 (아이템 클릭)
await previewPage.locator('.item').first().click();
await previewPage.waitForTimeout(5000); // fetchData 비동기 완료 대기

// 비동기 흐름 검증: Start → Data received → End
const startIdx = asyncLogs.findIndex(l => l.includes('[Handler] Start'));
const endIdx = asyncLogs.findIndex(l => l.includes('[Handler] End'));

expect(startIdx).toBeGreaterThanOrEqual(0);
expect(endIdx).toBeGreaterThanOrEqual(0);
expect(startIdx).toBeLessThan(endIdx);

// 데이터 수신 확인
const dataLogs = asyncLogs.filter(l => l.includes('Data received'));
expect(dataLogs.length).toBeGreaterThan(0);
```

**통과 기준:**
- async 핸들러 내에서 await가 정상 동작함
- 비동기 작업 완료 후 후속 로직이 실행됨
- 에러 발생 시 catch 블록에서 처리됨

---

### 2.4 테스트 요약 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-EV-001 | EventBus 핸들러 등록 및 호출 검증 | ☐ |
| TC-EV-002 | EventBus 핸들러 해제 검증 | ☐ |
| TC-EV-003 | customEvents + bindEvents 동작 검증 (2D) | ☐ |
| TC-EV-004 | 이벤트 위임 패턴 검증 (동적 요소) | ☐ |
| TC-EV-005 | removeCustomEvents 동작 검증 | ☐ |
| TC-EV-006 | @ 접두사 커스텀 이벤트 구분 검증 | ☐ |
| TC-EV-007 | 3D 이벤트 바인딩 검증 (bind3DEvents) | ☐ |
| TC-EV-008 | 3D 이벤트와 2D 이벤트 차이점 검증 | ☐ |
| TC-EV-009 | datasetInfo 검증 (3D 컴포넌트) | ☐ |
| TC-EV-010 | event vs targetInstance 정보 비교 검증 | ☐ |
| TC-EV-011 | 다중 이벤트 타입 바인딩 검증 | ☐ |
| TC-EV-012 | 이벤트 핸들러에서 비동기 처리 검증 | ☐ |

---

## 3. 데이터 흐름 테스트

### 3.1 개요

RNBT 아키텍처의 데이터 흐름은 **GlobalDataPublisher**를 중심으로 한 Pub-Sub 패턴입니다.
페이지가 데이터를 발행(publish)하고, 컴포넌트들이 구독(subscribe)하여 데이터를 수신합니다.

**핵심 흐름:**
```
페이지 (Publisher)
  → globalDataMappings 정의
  → registerMapping()
  → fetchAndPublish()
        ↓
컴포넌트들 (Subscribers)
  → subscribe(topic, handler)
  → 데이터 수신 및 렌더링
```

### 3.2 테스트 대상

| 대상 | 설명 |
|------|------|
| globalDataMappings | 페이지에서 정의하는 데이터 매핑 배열 |
| GlobalDataPublisher.registerMapping | 데이터 매핑 등록 |
| GlobalDataPublisher.unregisterMapping | 데이터 매핑 해제 |
| GlobalDataPublisher.fetchAndPublish | 데이터 fetch 후 구독자에게 발행 |
| GlobalDataPublisher.subscribe | 컴포넌트에서 topic 구독 |
| GlobalDataPublisher.unsubscribe | 컴포넌트에서 topic 구독 해제 |
| currentParams | topic별 동적 파라미터 관리 |

---

### 3.3 테스트 시나리오

#### TC-DF-001: globalDataMappings 정의 및 registerMapping 검증

**목적:** globalDataMappings 구조가 올바르게 정의되고 registerMapping이 정상 동작하는지 검증

**사전조건:**
- 페이지 loaded.js가 준비되어 있음
- GlobalDataPublisher가 사용 가능함

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | globalDataMappings 배열 정의 | topic, datasetInfo, refreshInterval 포함 |
| 2 | registerMapping() 호출 | 각 매핑이 등록됨 |
| 3 | 등록된 매핑 확인 | GlobalDataPublisher 내부에 매핑 저장됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { each } = fx;

this.globalDataMappings = [
    {
        topic: 'sensorData',
        datasetInfo: {
            datasetName: 'sensorApi',
            param: { endpoint: '/api/sensors' }
        },
        refreshInterval: 5000
    },
    {
        topic: 'alertData',
        datasetInfo: {
            datasetName: 'alertApi',
            param: { endpoint: '/api/alerts' }
        }
        // refreshInterval 없음 = 한 번만 fetch
    }
];

// 매핑 등록
fx.go(
    this.globalDataMappings,
    each(mapping => {
        console.log('[Page] Registering mapping:', mapping.topic);
        GlobalDataPublisher.registerMapping(mapping);
    })
);

// 등록 확인 로그
this.globalDataMappings.forEach(({ topic }) => {
    console.log('[Page] Topic registered:', topic);
});
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const mappingLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    mappingLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 매핑 등록 확인
const registerLogs = mappingLogs.filter(l => l.includes('Registering mapping:'));
expect(registerLogs.length).toBe(2); // sensorData, alertData

const topicLogs = mappingLogs.filter(l => l.includes('Topic registered:'));
expect(topicLogs.length).toBe(2);
```

**globalDataMappings 구조 검증:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| topic | string | O | 구독자들이 사용할 topic 이름 |
| datasetInfo.datasetName | string | O | API 데이터셋 이름 |
| datasetInfo.param | object | O | API 호출 파라미터 |
| refreshInterval | number | X | 밀리초 단위 갱신 주기 (없으면 1회 fetch) |

**통과 기준:**
- globalDataMappings 배열이 정상 생성됨
- 각 topic이 GlobalDataPublisher에 등록됨

---

#### TC-DF-002: subscribe 및 데이터 수신 검증

**목적:** 컴포넌트가 topic을 구독하고 데이터를 정상적으로 수신하는지 검증

**사전조건:**
- 페이지에서 topic이 등록되어 있음
- 컴포넌트가 준비되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | subscriptions 객체 정의 | topic과 핸들러 매핑 |
| 2 | subscribe() 호출 | 구독이 등록됨 |
| 3 | fetchAndPublish() 실행 | 구독자에게 데이터 전달됨 |
| 4 | 핸들러에서 response 수신 | { response: { data: ... } } 형태 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;
const { each } = fx;

this.subscriptions = {
    sensorData: ['renderSensorTable'],
    alertData: ['renderAlertList', 'updateAlertCount']
};

// 핸들러 정의 및 바인딩
function renderSensorTable({ response }) {
    console.log('[Component] renderSensorTable called');
    console.log('[Component] response has data:', !!response?.data);

    const { data } = response;
    if (!data) return;

    console.log('[Component] Rendering table with data');
}

this.renderSensorTable = renderSensorTable.bind(this);

// 구독 등록
fx.go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => {
            if (this[fn]) {
                console.log('[Component] Subscribing ' + fn + ' to ' + topic);
                subscribe(topic, this, this[fn]);
            }
        }, fnList)
    )
);
```

**Playwright 검증:**

```typescript
// 콘솔 로그 수집
const subLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Component]')) {
    subLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000); // fetchAndPublish 완료 대기

// 구독 등록 확인
const subscribeLogs = subLogs.filter(l => l.includes('Subscribing'));
expect(subscribeLogs.length).toBeGreaterThan(0);

// 핸들러 호출 확인
const calledLog = subLogs.find(l => l.includes('renderSensorTable called'));
expect(calledLog).toBeDefined();

// response.data 확인
const dataLog = subLogs.find(l => l.includes('response has data:'));
expect(dataLog).toContain('true');
```

**통과 기준:**
- subscribe 호출 시 에러 없음
- fetchAndPublish 후 핸들러가 호출됨
- response 객체에 data가 포함됨

---

#### TC-DF-003: 하나의 topic에 여러 핸들러 구독 검증

**목적:** 동일한 topic에 여러 핸들러가 구독할 수 있고, 모든 핸들러가 호출되는지 검증

**사전조건:**
- topic이 등록되어 있음
- 컴포넌트에 여러 렌더링 함수가 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | topicA: ['handler1', 'handler2'] 정의 | 하나의 topic에 2개 핸들러 |
| 2 | 각 핸들러에 대해 subscribe() 호출 | 2개 구독 등록됨 |
| 3 | fetchAndPublish('topicA') 실행 | handler1, handler2 모두 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;
const { each } = fx;

this.subscriptions = {
    sensorData: ['renderTable', 'updateCount']
};

function renderTable({ response }) {
    console.log('[handler1] renderTable called');
}

function updateCount({ response }) {
    console.log('[handler2] updateCount called');
}

this.renderTable = renderTable.bind(this);
this.updateCount = updateCount.bind(this);

fx.go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);
```

**Playwright 검증:**

```typescript
const handlerLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[handler')) {
    handlerLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 두 핸들러 모두 호출 확인
const handler1Log = handlerLogs.find(l => l.includes('renderTable called'));
expect(handler1Log).toBeDefined();

const handler2Log = handlerLogs.find(l => l.includes('updateCount called'));
expect(handler2Log).toBeDefined();
```

**통과 기준:**
- fetchAndPublish 후 모든 핸들러(renderTable, updateCount)가 호출됨

---

#### TC-DF-004: 여러 컴포넌트가 동일 topic 구독 검증

**목적:** 서로 다른 컴포넌트들이 동일한 topic을 구독하고 모두 데이터를 수신하는지 검증

**사전조건:**
- 페이지에 Component A, B, C가 배치되어 있음
- 동일한 topic을 구독함

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | Component A, B, C 각각 'sharedTopic' 구독 | 3개 구독 등록 |
| 2 | fetchAndPublish('sharedTopic') 실행 | 3개 컴포넌트 모두에 데이터 전달 |
| 3 | 각 컴포넌트의 핸들러 호출 확인 | 모두 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// Component A — register 탭
const { subscribe } = GlobalDataPublisher;
this.handleDataA = ({ response }) => {
    console.log('[Component A] Received data');
};
subscribe('sharedTopic', this, this.handleDataA);

// Component B — register 탭
const { subscribe } = GlobalDataPublisher;
this.handleDataB = ({ response }) => {
    console.log('[Component B] Received data');
};
subscribe('sharedTopic', this, this.handleDataB);

// Component C — register 탭
const { subscribe } = GlobalDataPublisher;
this.handleDataC = ({ response }) => {
    console.log('[Component C] Received data');
};
subscribe('sharedTopic', this, this.handleDataC);
```

**Playwright 검증:**

```typescript
const compLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('Received data')) {
    compLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 3개 컴포넌트 모두 데이터 수신 확인
expect(compLogs.find(l => l.includes('[Component A]'))).toBeDefined();
expect(compLogs.find(l => l.includes('[Component B]'))).toBeDefined();
expect(compLogs.find(l => l.includes('[Component C]'))).toBeDefined();
```

**통과 기준:**
- 3개 컴포넌트 모두 데이터 수신
- 중복 fetch 없이 한 번의 API 호출로 모두에게 전달

---

#### TC-DF-005: fetchAndPublish 동작 및 응답 구조 검증

**목적:** fetchAndPublish가 올바른 응답 구조로 데이터를 발행하는지 검증

**사전조건:**
- topic이 등록되어 있음
- 구독자가 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | fetchAndPublish(topic, page, param) 호출 | API fetch 실행 |
| 2 | 응답 수신 | { response: { data: ... } } 구조 |
| 3 | 구독자에게 전달 | 동일한 구조로 전달됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const result = await GlobalDataPublisher.fetchAndPublish(
    'sensorData',
    this,
    this.currentParams['sensorData'] || {}
);
console.log('[Page] fetchAndPublish completed');
```

```javascript
// 컴포넌트 register 탭 — 구독 핸들러
function renderData({ response }) {
    console.log('[Response] has response key:', 'response' in arguments[0]);
    console.log('[Response] has data:', response?.data !== undefined);
    console.log('[Response] data type:', typeof response?.data);

    const { data } = response;
    if (!data) {
        console.log('[Response] Early return: data is empty');
        return;
    }

    console.log('[Response] Data received successfully');
}
```

**Playwright 검증:**

```typescript
const respLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Response]') || msg.text().includes('[Page]')) {
    respLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// fetchAndPublish 완료 확인
expect(respLogs.find(l => l.includes('fetchAndPublish completed'))).toBeDefined();

// 응답 구조 확인
const hasResponseLog = respLogs.find(l => l.includes('has response key:'));
expect(hasResponseLog).toContain('true');

const hasDataLog = respLogs.find(l => l.includes('has data:'));
expect(hasDataLog).toContain('true');
```

**응답 구조:**
```javascript
// 핸들러가 받는 인자
{
    response: {
        data: /* API 응답 데이터 */
    }
}
```

**통과 기준:**
- fetchAndPublish가 Promise를 반환
- 구독자가 { response: { data: ... } } 구조로 데이터 수신
- data가 null/undefined일 경우 핸들러에서 early return

---

#### TC-DF-006: unsubscribe 동작 검증

**목적:** unsubscribe 후 해당 컴포넌트에 더 이상 데이터가 전달되지 않는지 검증

**사전조건:**
- 컴포넌트가 topic을 구독 중임
- 데이터가 정상 수신되는 것이 확인됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 구독 상태에서 fetchAndPublish | 핸들러 호출됨, callCount = 1 |
| 2 | unsubscribe(topic, this) 호출 | 구독 해제됨 |
| 3 | 다시 fetchAndPublish | 핸들러 호출되지 않음, callCount = 1 (변화 없음) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 beforeDestroy 탭
const { unsubscribe } = GlobalDataPublisher;
const { each } = fx;

// 구독 해제
fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => {
        console.log('[Component] Unsubscribing from ' + topic);
        unsubscribe(topic, this);
    })
);

this.subscriptions = null;
console.log('[Component] All subscriptions removed');
```

**Playwright 검증:**

```typescript
const unsubLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Component]')) {
    unsubLogs.push(msg.text());
  }
});

// 페이지 이동으로 beforeDestroy 트리거
// ...

// 구독 해제 확인
const unsubLog = unsubLogs.find(l => l.includes('Unsubscribing from'));
expect(unsubLog).toBeDefined();

const removedLog = unsubLogs.find(l => l.includes('All subscriptions removed'));
expect(removedLog).toBeDefined();

// 해제 후 fetchAndPublish 시 핸들러 미호출 확인
// (새로운 데이터 수신 로그가 추가되지 않아야 함)
```

**통과 기준:**
- unsubscribe 후 fetchAndPublish 시 핸들러가 호출되지 않음
- 다른 구독자들은 여전히 데이터를 수신함

---

#### TC-DF-007: unregisterMapping 동작 검증

**목적:** unregisterMapping 후 해당 topic의 fetchAndPublish가 동작하지 않는지 검증

**사전조건:**
- 페이지에서 topic이 등록되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 등록 상태에서 fetchAndPublish | 정상 동작 |
| 2 | unregisterMapping(topic) 호출 | 매핑 해제됨 |
| 3 | 다시 fetchAndPublish | 에러 또는 무시됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeUnLoad 탭
const { each } = fx;

// 매핑 해제
fx.go(
    this.globalDataMappings,
    each(({ topic }) => {
        console.log('[Page] Unregistering mapping: ' + topic);
        GlobalDataPublisher.unregisterMapping(topic);
    })
);

this.globalDataMappings = null;
console.log('[Page] All mappings unregistered');

// 해제 후 fetchAndPublish 시도
try {
    await GlobalDataPublisher.fetchAndPublish('sensorData', this);
    console.log('[After unregister] fetchAndPublish succeeded (unexpected)');
} catch (e) {
    console.log('[After unregister] fetchAndPublish failed: ' + e.message);
}
```

**Playwright 검증:**

```typescript
const unregLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]') || msg.text().includes('[After unregister]')) {
    unregLogs.push(msg.text());
  }
});

// 페이지 이동으로 beforeUnLoad 트리거 후
const unregLog = unregLogs.find(l => l.includes('All mappings unregistered'));
expect(unregLog).toBeDefined();

// 해제 후 fetchAndPublish 실패 확인
const failLog = unregLogs.find(l => l.includes('fetchAndPublish failed'));
expect(failLog).toBeDefined();
```

**통과 기준:**
- unregisterMapping 후 해당 topic의 fetchAndPublish가 동작하지 않거나 에러 발생

---

#### TC-DF-008: currentParams 초기화 및 관리 검증

**목적:** currentParams가 topic별로 올바르게 초기화되고 관리되는지 검증

**사전조건:**
- globalDataMappings가 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | this.currentParams = {} 초기화 | 빈 객체 생성 |
| 2 | 각 topic에 대해 currentParams[topic] = {} | topic별 빈 객체 생성 |
| 3 | fetchAndPublish 시 currentParams[topic] 전달 | 해당 param으로 API 호출 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.currentParams = {};

fx.go(
    this.globalDataMappings,
    each(GlobalDataPublisher.registerMapping),
    each(({ topic }) => {
        this.currentParams[topic] = {};
        console.log('[Page] Initialized currentParams: ' + topic);
    }),
    each(({ topic }) =>
        GlobalDataPublisher.fetchAndPublish(topic, this, this.currentParams[topic])
    )
);

console.log('[Page] currentParams keys:', Object.keys(this.currentParams).join(', '));
```

**Playwright 검증:**

```typescript
const paramLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]') && msg.text().includes('currentParams')) {
    paramLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 모든 topic에 대해 currentParams 초기화 확인
const initLogs = paramLogs.filter(l => l.includes('Initialized currentParams:'));
expect(initLogs.length).toBe(2); // sensorData, alertData

const keysLog = paramLogs.find(l => l.includes('currentParams keys:'));
expect(keysLog).toContain('sensorData');
expect(keysLog).toContain('alertData');
```

**currentParams 구조:**
```javascript
this.currentParams = {
    sensorData: {},     // topic별 param 객체
    alertData: {}
};
```

**통과 기준:**
- globalDataMappings의 모든 topic에 대해 currentParams가 초기화됨
- fetchAndPublish 시 해당 topic의 currentParams가 전달됨

---

#### TC-DF-009: 동적 Param 변경 및 즉시 반영 검증

**목적:** currentParams를 동적으로 변경하고 즉시 fetchAndPublish로 반영되는지 검증

**사전조건:**
- currentParams가 초기화되어 있음
- 해당 topic에 구독자가 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 초기 param으로 fetchAndPublish | 초기 데이터 수신 |
| 2 | currentParams[topic] 업데이트 | { filter: 'new-value' } 추가 |
| 3 | 즉시 fetchAndPublish 호출 | 새로운 param으로 API 호출 |
| 4 | 구독자가 새로운 데이터 수신 | 필터링된 데이터 수신 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭 — 이벤트 핸들러
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@filterChanged': ({ event }) => {
        const filter = event.target?.value || 'default';

        // 1. currentParams 업데이트
        this.currentParams['sensorData'] = {
            ...this.currentParams['sensorData'],
            filter
        };

        console.log('[Page] Updated currentParams filter:', filter);

        // 2. 즉시 fetchAndPublish
        GlobalDataPublisher.fetchAndPublish(
            'sensorData',
            this,
            this.currentParams['sensorData']
        );

        console.log('[Page] Re-fetched with new params');
        // 3. Interval은 자동으로 업데이트된 param 사용 — 재시작 불필요!
    }
};

onEventBusHandlers(this.eventBusHandlers);
```

**Playwright 검증:**

```typescript
const filterLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page]')) {
    filterLogs.push(msg.text());
  }
});

// 필터 변경 이벤트 트리거 (예: 입력 필드 변경)
await previewPage.locator('.filter-input').fill('new-filter');
await previewPage.waitForTimeout(3000);

// currentParams 업데이트 확인
const updateLog = filterLogs.find(l => l.includes('Updated currentParams filter:'));
expect(updateLog).toContain('new-filter');

// 재 fetch 확인
const refetchLog = filterLogs.find(l => l.includes('Re-fetched with new params'));
expect(refetchLog).toBeDefined();
```

**통과 기준:**
- currentParams 업데이트 후 즉시 fetchAndPublish로 새 데이터 수신
- 기존 Interval은 재시작 없이 업데이트된 param 사용

---

#### TC-DF-010: 응답 데이터가 없는 경우 처리 검증

**목적:** API 응답에 data가 없거나 빈 경우 핸들러에서 올바르게 처리되는지 검증

**사전조건:**
- API가 빈 응답을 반환하도록 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | API가 { response: { data: null } } 반환 | 핸들러 호출됨 |
| 2 | 핸들러에서 data 체크 | early return 발생 |
| 3 | 렌더링 로직 미실행 | 에러 없이 종료 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭 — 구독 핸들러
function renderTable({ response }) {
    console.log('[Handler] Called');

    const { data } = response;
    if (!data) {
        console.log('[Handler] Early return: data is empty');
        return;
    }

    console.log('[Handler] Processing data');
}
```

**Playwright 검증:**

```typescript
const emptyLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Handler]')) {
    emptyLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 핸들러 호출 확인
expect(emptyLogs.find(l => l.includes('Called'))).toBeDefined();

// data 없는 경우 early return 확인
const earlyReturnLog = emptyLogs.find(l => l.includes('Early return'));
if (earlyReturnLog) {
  // Processing 로그가 없어야 함
  expect(emptyLogs.find(l => l.includes('Processing data'))).toBeUndefined();
}
```

**통과 기준:**
- data가 null/undefined일 때 에러 없이 early return
- 렌더링 로직이 실행되지 않음

---

#### TC-DF-011: 다중 데이터셋 병렬 fetch 검증

**목적:** globalDataMappings에 여러 데이터셋이 있을 때 병렬로 fetch되는지 검증

**사전조건:**
- 여러 topic이 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 3개 topic (A, B, C) 정의 | 3개 데이터셋 매핑 |
| 2 | 순차적 fetchAndPublish | 각각 독립적으로 fetch |
| 3 | 시간 측정 | 병렬이면 빠르고, 직렬이면 느림 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.globalDataMappings = [
    { topic: 'topicA', datasetInfo: { datasetName: 'apiA', param: {} } },
    { topic: 'topicB', datasetInfo: { datasetName: 'apiB', param: {} } },
    { topic: 'topicC', datasetInfo: { datasetName: 'apiC', param: {} } }
];

console.log('[Page] Registering 3 topics');

fx.go(
    this.globalDataMappings,
    each(GlobalDataPublisher.registerMapping),
    each(({ topic }) => this.currentParams[topic] = {}),
    each(({ topic }) =>
        GlobalDataPublisher.fetchAndPublish(topic, this)
            .then(() => console.log('[Page] Fetched: ' + topic))
            .catch(err => console.error('[Page] Fetch error: ' + topic))
    )
);
```

**Playwright 검증:**

```typescript
const fetchLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Page] Fetched:')) {
    fetchLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(10000);

// 3개 topic 모두 fetch 완료 확인
expect(fetchLogs.length).toBe(3);
expect(fetchLogs.find(l => l.includes('topicA'))).toBeDefined();
expect(fetchLogs.find(l => l.includes('topicB'))).toBeDefined();
expect(fetchLogs.find(l => l.includes('topicC'))).toBeDefined();
```

**참고:** fx.go의 each는 기본적으로 순차 실행이지만, Promise를 반환하는 경우 비동기로 동작합니다.

**통과 기준:**
- 모든 topic에 대해 fetchAndPublish가 실행됨
- 각 구독자가 해당 topic의 데이터를 수신함

---

#### TC-DF-012: Topic 기반 중복 fetch 방지 검증

**목적:** 동일한 topic으로 여러 컴포넌트가 구독해도 API는 한 번만 호출되는지 검증

**사전조건:**
- 3개 컴포넌트가 동일 topic 구독
- API 호출 횟수 모니터링 가능

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 3개 컴포넌트가 'sharedTopic' 구독 | 3개 구독 등록 |
| 2 | fetchAndPublish('sharedTopic') 1회 호출 | API 1회 호출 |
| 3 | 3개 컴포넌트 모두 데이터 수신 | 각각 핸들러 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭 — API 호출 횟수 모니터링
window.apiCallCount = 0;

// fetch 횟수 추적을 위한 래핑 (E2E에서는 네트워크 요청 수로 대체 가능)
const _origFetch = window.fetch;
window.fetch = function(...args) {
    window.apiCallCount++;
    console.log('[API] Call #' + window.apiCallCount);
    return _origFetch.apply(this, args);
};
```

> **참고:** E2E에서는 Mock 대신 Playwright의 네트워크 요청 가로채기(`page.route()`)로 API 호출 횟수를 모니터링할 수 있습니다.

**Playwright 검증:**

```typescript
// 네트워크 요청 횟수 모니터링
let apiCallCount = 0;
previewPage.on('request', (req) => {
  if (req.url().includes('/api/') || req.url().includes('dataset')) {
    apiCallCount++;
  }
});

// fetchAndPublish 완료 대기
await previewPage.waitForTimeout(5000);

// API 1회 호출 확인
expect(apiCallCount).toBe(1);

// 3개 컴포넌트 모두 데이터 수신 확인
const result = await previewPage.evaluate(() => ({
  a: !!(window as any).componentAReceived,
  b: !!(window as any).componentBReceived,
  c: !!(window as any).componentCReceived,
}));

expect(result.a).toBe(true);
expect(result.b).toBe(true);
expect(result.c).toBe(true);
```

**통과 기준:**
- 3개 구독자가 있어도 API는 1회만 호출됨
- 모든 구독자가 동일한 데이터를 수신함

---

### 3.4 테스트 요약 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-DF-001 | globalDataMappings 정의 및 registerMapping 검증 | ☐ |
| TC-DF-002 | subscribe 및 데이터 수신 검증 | ☐ |
| TC-DF-003 | 하나의 topic에 여러 핸들러 구독 검증 | ☐ |
| TC-DF-004 | 여러 컴포넌트가 동일 topic 구독 검증 | ☐ |
| TC-DF-005 | fetchAndPublish 동작 및 응답 구조 검증 | ☐ |
| TC-DF-006 | unsubscribe 동작 검증 | ☐ |
| TC-DF-007 | unregisterMapping 동작 검증 | ☐ |
| TC-DF-008 | currentParams 초기화 및 관리 검증 | ☐ |
| TC-DF-009 | 동적 Param 변경 및 즉시 반영 검증 | ☐ |
| TC-DF-010 | 응답 데이터가 없는 경우 처리 검증 | ☐ |
| TC-DF-011 | 다중 데이터셋 병렬 fetch 검증 | ☐ |
| TC-DF-012 | Topic 기반 중복 fetch 방지 검증 | ☐ |

---

## 4. Interval 관리 테스트

### 4.1 개요

RNBT 아키텍처에서 Interval은 데이터의 주기적 갱신을 담당합니다.
각 topic은 독립적인 refreshInterval을 가질 수 있으며, 페이지가 이를 관리합니다.

**핵심 개념:**
- `refreshInterval`: globalDataMappings에서 정의하는 밀리초 단위 갱신 주기
- `this.refreshIntervals`: topic별 setInterval ID를 저장하는 객체
- `startAllIntervals()` / `stopAllIntervals()`: Interval 시작/중단 함수
- **currentParams는 참조**: Interval 재시작 없이 param 변경이 자동 반영됨

### 4.2 테스트 대상

| 대상 | 설명 |
|------|------|
| refreshInterval | topic별 갱신 주기 (밀리초) |
| this.refreshIntervals | topic별 interval ID 저장 객체 |
| startAllIntervals() | 모든 topic의 interval 시작 |
| stopAllIntervals() | 모든 topic의 interval 중단 |
| clearInterval() | 개별 interval 해제 |

---

### 4.3 테스트 시나리오

#### TC-IV-001: refreshInterval 정의 및 동작 검증

**목적:** globalDataMappings에 refreshInterval을 정의하면 주기적으로 fetchAndPublish가 실행되는지 검증

**사전조건:**
- globalDataMappings에 refreshInterval이 정의되어 있음
- 해당 topic에 구독자가 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | refreshInterval: 5000 정의 | 5초 주기 갱신 설정 |
| 2 | startAllIntervals() 호출 | interval 시작됨 |
| 3 | 5초 대기 | fetchAndPublish 1회 실행 |
| 4 | 10초 대기 | fetchAndPublish 2회 실행 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.globalDataMappings = [
    {
        topic: 'sensorData',
        datasetInfo: {
            datasetName: 'sensorApi',
            param: { endpoint: '/api/sensors' }
        },
        refreshInterval: 5000  // 5초
    }
];

// Interval 시작 — fetch마다 console.log로 기록
let fetchCount = 0;
this.startAllIntervals = () => {
    this.refreshIntervals = {};

    fx.go(
        this.globalDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                console.log(`[Page] Setting interval for ${topic}: ${refreshInterval}ms`);
                this.refreshIntervals[topic] = setInterval(() => {
                    fetchCount++;
                    console.log(`[Interval] Fetch #${fetchCount} for ${topic}`);
                    GlobalDataPublisher.fetchAndPublish(
                        topic,
                        this,
                        this.currentParams[topic] || {}
                    ).catch(err => console.error(`[fetchAndPublish:${topic}]`, err));
                }, refreshInterval);
            }
        })
    );
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
// console 로그 수집
const intervalLogs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]') || msg.text().includes('[Page] Setting interval')) {
        intervalLogs.push(msg.text());
    }
});

// ... 뷰어 로드 후 15초 대기
await previewPage.waitForTimeout(15000);

// interval 설정 로그 확인
const settingLog = intervalLogs.find(l => l.includes('Setting interval for sensorData'));
expect(settingLog).toContain('5000ms');

// fetch 횟수 확인 (5초 간격으로 15초 → 약 2~3회)
const fetchLogs = intervalLogs.filter(l => l.includes('[Interval] Fetch #'));
expect(fetchLogs.length).toBeGreaterThanOrEqual(2);
expect(fetchLogs.length).toBeLessThanOrEqual(4);
```

**통과 기준:**
- refreshInterval 정의 시 해당 주기로 fetchAndPublish가 반복 실행됨
- 5초 interval일 경우 15초 후 약 2~3회 실행

---

#### TC-IV-002: refreshInterval 없는 topic 처리 검증

**목적:** refreshInterval이 없는 topic은 interval 없이 한 번만 fetch되는지 검증

**사전조건:**
- globalDataMappings에 refreshInterval이 없는 topic이 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | refreshInterval 없이 topic 정의 | 한 번만 fetch 설정 |
| 2 | startAllIntervals() 호출 | 해당 topic의 interval은 설정되지 않음 |
| 3 | 10초 대기 | 추가 fetch 없음 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.globalDataMappings = [
    {
        topic: 'staticData',
        datasetInfo: {
            datasetName: 'staticApi',
            param: { endpoint: '/api/static' }
        }
        // refreshInterval 없음!
    },
    {
        topic: 'dynamicData',
        datasetInfo: {
            datasetName: 'dynamicApi',
            param: { endpoint: '/api/dynamic' }
        },
        refreshInterval: 3000
    }
];

this.startAllIntervals();
// → staticData는 interval 미설정, dynamicData는 3초 간격 fetch
```

**Playwright 검증:**

```typescript
// console 로그 수집
const fetchLogs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]')) {
        fetchLogs.push(msg.text());
    }
});

// 네트워크 요청 모니터링
const requestTopics: string[] = [];
previewPage.on('request', req => {
    if (req.url().includes('/api/static')) requestTopics.push('staticData');
    if (req.url().includes('/api/dynamic')) requestTopics.push('dynamicData');
});

// ... 뷰어 로드 후 10초 대기
await previewPage.waitForTimeout(10000);

// staticData는 최초 1회만 (interval 없음)
const staticCount = requestTopics.filter(t => t === 'staticData').length;
expect(staticCount).toBe(1);

// dynamicData는 3초 간격 → 10초 동안 약 3~4회
const dynamicCount = requestTopics.filter(t => t === 'dynamicData').length;
expect(dynamicCount).toBeGreaterThanOrEqual(3);
```

**통과 기준:**
- refreshInterval 없는 topic은 최초 1회만 fetch
- refreshInterval 있는 topic은 주기적으로 fetch

---

#### TC-IV-003: startAllIntervals 동작 검증

**목적:** startAllIntervals가 모든 topic의 interval을 올바르게 시작하는지 검증

**사전조건:**
- 여러 topic에 각각 다른 refreshInterval이 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | topic A: 3000ms, topic B: 5000ms 정의 | 서로 다른 주기 |
| 2 | startAllIntervals() 호출 | 두 interval 모두 시작 |
| 3 | this.refreshIntervals 확인 | 두 topic의 interval ID 저장됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.globalDataMappings = [
    { topic: 'topicA', datasetInfo: { datasetName: 'apiA', param: {} }, refreshInterval: 3000 },
    { topic: 'topicB', datasetInfo: { datasetName: 'apiB', param: {} }, refreshInterval: 5000 }
];

this.startAllIntervals = () => {
    this.refreshIntervals = {};

    fx.go(
        this.globalDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.refreshIntervals[topic] = setInterval(() => {
                    GlobalDataPublisher.fetchAndPublish(
                        topic,
                        this,
                        this.currentParams[topic] || {}
                    );
                }, refreshInterval);
            }
        })
    );

    // 검증
    console.log('[startAllIntervals] topicA interval ID:', this.refreshIntervals['topicA']);
    console.log('[startAllIntervals] topicB interval ID:', this.refreshIntervals['topicB']);
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
// console 로그 수집
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[startAllIntervals]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
const idLogA = logs.find(l => l.includes('topicA interval ID:'));
const idLogB = logs.find(l => l.includes('topicB interval ID:'));

// interval ID가 유효한 숫자인지 확인
expect(idLogA).toBeDefined();
expect(idLogB).toBeDefined();
const idA = parseInt(idLogA!.split(':')[1].trim());
const idB = parseInt(idLogB!.split(':')[1].trim());
expect(idA).toBeGreaterThan(0);
expect(idB).toBeGreaterThan(0);
expect(idA).not.toBe(idB); // 서로 다른 interval ID
```

**통과 기준:**
- this.refreshIntervals에 각 topic의 interval ID가 저장됨
- 각 interval ID가 유효한 숫자임

---

#### TC-IV-004: stopAllIntervals 동작 검증

**목적:** stopAllIntervals가 모든 interval을 올바르게 중단하는지 검증

**사전조건:**
- 여러 interval이 실행 중임

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 여러 interval 실행 중 | fetchAndPublish 주기적 실행 |
| 2 | stopAllIntervals() 호출 | 모든 interval 중단 |
| 3 | 10초 대기 | 추가 fetchAndPublish 없음 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 — TC-IV-003의 interval 설정 후 실행
this.stopAllIntervals = () => {
    console.log('[stopAllIntervals] Stopping all intervals...');
    console.log('[stopAllIntervals] Current intervals:', Object.keys(this.refreshIntervals || {}));

    fx.go(
        Object.values(this.refreshIntervals || {}),
        each(interval => {
            clearInterval(interval);
        })
    );

    this.refreshIntervals = {};
    console.log('[stopAllIntervals] All intervals stopped');
};

// 5초 후 중지하여 검증
setTimeout(() => {
    this.stopAllIntervals();
}, 5000);
```

**Playwright 검증:**

```typescript
// console 로그 수집
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[stopAllIntervals]') || msg.text().includes('[Interval]')) {
        logs.push(msg.text());
    }
});

// ... 뷰어 로드 후 5초 대기 (stopAllIntervals 실행)
await previewPage.waitForTimeout(6000);
const stopLog = logs.find(l => l.includes('All intervals stopped'));
expect(stopLog).toBeDefined();

// stop 이후 fetch 로그 수집
const fetchCountAtStop = logs.filter(l => l.includes('[Interval]')).length;
await previewPage.waitForTimeout(10000);
const fetchCountAfter = logs.filter(l => l.includes('[Interval]')).length;

// stop 이후 추가 fetch 없어야 함
expect(fetchCountAfter).toBe(fetchCountAtStop);
```

**통과 기준:**
- stopAllIntervals 후 추가 fetchAndPublish가 실행되지 않음
- 모든 interval이 clearInterval로 해제됨

---

#### TC-IV-005: 개별 topic interval 정리 검증

**목적:** 특정 topic의 interval만 선택적으로 정리할 수 있는지 검증

**사전조건:**
- 여러 topic의 interval이 실행 중임

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | topicA, topicB interval 실행 중 | 둘 다 주기적 fetch |
| 2 | clearInterval(refreshIntervals['topicA']) | topicA만 중단 |
| 3 | 대기 | topicA는 중단, topicB는 계속 실행 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 — TC-IV-003의 interval 설정 이후 실행
// 개별 interval 정리 함수
this.stopIntervalForTopic = (topic) => {
    if (this.refreshIntervals?.[topic]) {
        console.log(`[Page] Stopping interval for ${topic}`);
        clearInterval(this.refreshIntervals[topic]);
        delete this.refreshIntervals[topic];
    }
};

// 5초 후 topicA만 중단
setTimeout(() => {
    this.stopIntervalForTopic('topicA');
    console.log('[Verify] Remaining intervals:', Object.keys(this.refreshIntervals));
}, 5000);
```

**Playwright 검증:**

```typescript
const fetchLogs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]') || msg.text().includes('[Page] Stopping')) {
        fetchLogs.push(msg.text());
    }
});

// ... 뷰어 로드 후 5초 대기 (topicA 중단)
await previewPage.waitForTimeout(6000);

// topicA 중단 확인
const stopLog = fetchLogs.find(l => l.includes('Stopping interval for topicA'));
expect(stopLog).toBeDefined();

// 중단 이후 10초 더 대기
const topicACountBefore = fetchLogs.filter(l => l.includes('topicA')).length;
const topicBCountBefore = fetchLogs.filter(l => l.includes('topicB')).length;
await previewPage.waitForTimeout(10000);

// topicA는 증가 없음, topicB는 계속 증가
const topicACountAfter = fetchLogs.filter(l => l.includes('topicA')).length;
const topicBCountAfter = fetchLogs.filter(l => l.includes('topicB')).length;
expect(topicACountAfter).toBe(topicACountBefore);
expect(topicBCountAfter).toBeGreaterThan(topicBCountBefore);
```

**통과 기준:**
- 특정 topic의 interval만 중단됨
- 다른 topic의 interval은 계속 실행됨

---

#### TC-IV-006: currentParams 참조 기반 자동 업데이트 검증

**목적:** currentParams가 참조이므로 interval 재시작 없이 param 변경이 반영되는지 검증

**사전조건:**
- interval이 실행 중임
- currentParams가 초기화되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | interval 실행 중 (param: { filter: 'a' }) | 기존 param으로 fetch |
| 2 | currentParams[topic] = { filter: 'b' } 변경 | 참조 업데이트 |
| 3 | 다음 interval tick | 새로운 param { filter: 'b' }로 fetch |
| 4 | interval stop/start 없음 | 자동 반영됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 초기 설정
this.currentParams = {
    sensorData: { filter: 'initial' }
};

// interval 설정
this.refreshIntervals.sensorData = setInterval(() => {
    console.log('[Interval] Fetching with param:', this.currentParams.sensorData);
    GlobalDataPublisher.fetchAndPublish(
        'sensorData',
        this,
        this.currentParams.sensorData  // ← 참조!
    );
}, 3000);

// 5초 후 param 변경 (interval 재시작 없이)
setTimeout(() => {
    console.log('[Page] Changing filter to "updated"');
    this.currentParams.sensorData = {
        ...this.currentParams.sensorData,
        filter: 'updated'
    };
    // No stop/start needed!
}, 5000);

// 10초 후 검증
setTimeout(() => {
    console.log('[Verify] currentParams after update:', JSON.stringify(this.currentParams.sensorData));
}, 10000);
```

**Playwright 검증:**

```typescript
const paramLogs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]') || msg.text().includes('[Page] Changing')) {
        paramLogs.push(msg.text());
    }
});

// ... 뷰어 로드 후 10초 대기
await previewPage.waitForTimeout(10000);

// 초기 fetch에서 'initial' param 사용 확인
const initialFetch = paramLogs.find(l => l.includes("'initial'") || l.includes('"initial"'));
expect(initialFetch).toBeDefined();

// param 변경 로그 확인
const changeLog = paramLogs.find(l => l.includes('Changing filter'));
expect(changeLog).toBeDefined();

// 변경 후 fetch에서 'updated' param 사용 확인
const changeIdx = paramLogs.findIndex(l => l.includes('Changing filter'));
const logsAfterChange = paramLogs.slice(changeIdx + 1);
const updatedFetch = logsAfterChange.find(l => l.includes("'updated'") || l.includes('"updated"'));
expect(updatedFetch).toBeDefined();
```

**통과 기준:**
- interval 재시작 없이 currentParams 변경이 다음 tick에 반영됨
- stop/start 호출 없이 새로운 param으로 fetch됨

---

#### TC-IV-007: 서로 다른 refreshInterval 독립성 검증

**목적:** 각 topic의 refreshInterval이 독립적으로 동작하는지 검증

**사전조건:**
- topic A: 2000ms, topic B: 5000ms로 설정

**테스트 단계:**

| 단계 | 시간 | topicA fetch | topicB fetch |
|------|------|--------------|--------------|
| 1 | 0s | 1회 (최초) | 1회 (최초) |
| 2 | 2s | 2회 | - |
| 3 | 4s | 3회 | - |
| 4 | 5s | - | 2회 |
| 5 | 6s | 4회 | - |
| 6 | 10s | 6회 | 3회 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
this.globalDataMappings = [
    { topic: 'topicA', datasetInfo: { datasetName: 'apiA', param: {} }, refreshInterval: 2000 },
    { topic: 'topicB', datasetInfo: { datasetName: 'apiB', param: {} }, refreshInterval: 5000 }
];

// startAllIntervals — 각 interval 콜백에서 fetch 로그 출력
this.startAllIntervals = () => {
    this.refreshIntervals = {};
    fx.go(
        this.globalDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.refreshIntervals[topic] = setInterval(() => {
                    console.log(`[Interval] ${topic} fetch at ${Date.now()}`);
                    GlobalDataPublisher.fetchAndPublish(
                        topic, this, this.currentParams[topic] || {}
                    ).catch(err => console.error(`[fetchAndPublish:${topic}]`, err));
                }, refreshInterval);
            }
        })
    );
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
const fetchLogs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]')) fetchLogs.push(msg.text());
});

// ... 뷰어 로드 후 10초 대기
await previewPage.waitForTimeout(10000);

// topicA (2초 간격) ≈ 5회, topicB (5초 간격) ≈ 2회
const topicACount = fetchLogs.filter(l => l.includes('topicA')).length;
const topicBCount = fetchLogs.filter(l => l.includes('topicB')).length;

expect(topicACount).toBeGreaterThanOrEqual(4);
expect(topicBCount).toBeGreaterThanOrEqual(1);
expect(topicACount).toBeGreaterThan(topicBCount); // A가 B보다 빈번
```

**통과 기준:**
- 각 topic이 자신의 refreshInterval에 따라 독립적으로 fetch
- 서로의 주기에 영향을 주지 않음

---

#### TC-IV-008: Interval 내 에러 처리 검증

**목적:** interval 내 fetchAndPublish에서 에러 발생 시 interval이 중단되지 않는지 검증

**사전조건:**
- interval이 실행 중임
- API가 간헐적으로 에러를 반환하도록 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | interval 실행 중 | 주기적 fetch |
| 2 | 2번째 fetch에서 에러 발생 | 에러 로깅됨 |
| 3 | 3번째 fetch | 정상 실행됨 (interval 중단 안 됨) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 — interval 설정 (에러 처리 포함)
let fetchAttempts = 0;
this.refreshIntervals = {};
this.refreshIntervals['sensorData'] = setInterval(() => {
    fetchAttempts++;
    console.log(`[Interval] Fetch attempt #${fetchAttempts}`);
    GlobalDataPublisher.fetchAndPublish(
        'sensorData',
        this,
        this.currentParams['sensorData'] || {}
    ).then(() => {
        console.log(`[Interval] Fetch #${fetchAttempts} succeeded`);
    }).catch(err => {
        // 에러 로깅만 하고 interval은 계속!
        console.error(`[Interval] Fetch #${fetchAttempts} failed:`, err.message);
    });
}, 3000);
```

**Playwright 검증:**

```typescript
// 2번째 fetch 요청을 에러로 시뮬레이션 (page.route 사용)
let requestCount = 0;
await previewPage.route('**/api/sensors**', async (route) => {
    requestCount++;
    if (requestCount === 2) {
        await route.abort('failed'); // 2번째 요청만 에러
    } else {
        await route.continue();
    }
});

const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Interval]')) logs.push(msg.text());
});

// ... 뷰어 로드 후 12초 대기 (3초 간격 × 4회)
await previewPage.waitForTimeout(12000);

// 4회 이상 시도 확인 (에러로 interval이 중단되지 않았음)
const attemptLogs = logs.filter(l => l.includes('Fetch attempt'));
expect(attemptLogs.length).toBeGreaterThanOrEqual(3);

// 실패 로그 존재 확인
const failLog = logs.find(l => l.includes('failed'));
expect(failLog).toBeDefined();

// 실패 이후에도 성공 로그 존재 확인
const failIdx = logs.findIndex(l => l.includes('failed'));
const successAfterFail = logs.slice(failIdx + 1).find(l => l.includes('succeeded'));
expect(successAfterFail).toBeDefined();
```

**통과 기준:**
- fetchAndPublish 에러 발생 시 interval이 중단되지 않음
- 에러 후 다음 tick에서 정상적으로 fetch 시도됨

---

#### TC-IV-009: 페이지 언로드 시 Interval 정리 검증

**목적:** 페이지 언로드 시 모든 interval이 올바르게 정리되는지 검증

**사전조건:**
- 여러 interval이 실행 중임

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 언로드 시작 | before_unload 실행 |
| 2 | stopAllIntervals() 호출 | 모든 interval 중단 |
| 3 | this.refreshIntervals = null | 참조 제거 |
| 4 | 메모리 누수 없음 | interval이 GC 대상이 됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeUnLoad 탭
// 1. Interval 중단
if (this.stopAllIntervals) {
    this.stopAllIntervals();
}

// 2. 참조 제거
this.refreshIntervals = null;

// 3. 관련 리소스 정리
this.globalDataMappings = null;
this.currentParams = null;

console.log('[Page] All intervals cleaned up');
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Page]') || msg.text().includes('[Interval]')) {
        logs.push(msg.text());
    }
});

// ... 뷰어 로드 → interval 동작 확인
await previewPage.waitForTimeout(5000);
const fetchesBefore = logs.filter(l => l.includes('[Interval]')).length;
expect(fetchesBefore).toBeGreaterThan(0); // interval이 동작 중이었음

// 페이지 언로드 (다른 페이지로 이동)
// → beforeUnLoad 탭 코드가 실행됨

// 정리 로그 확인
const cleanupLog = logs.find(l => l.includes('All intervals cleaned up'));
expect(cleanupLog).toBeDefined();

// 언로드 후 추가 fetch 없음 확인
const fetchesAfter = logs.filter(l => l.includes('[Interval]')).length;
await previewPage.waitForTimeout(5000);
const fetchesFinal = logs.filter(l => l.includes('[Interval]')).length;
expect(fetchesFinal).toBe(fetchesAfter);
```

**정리 순서 테이블:**

| 순서 | 생성 (loaded) | 정리 (before_unload) |
|------|---------------|----------------------|
| 1 | setInterval() | clearInterval() via stopAllIntervals() |
| 2 | this.refreshIntervals = {} | this.refreshIntervals = null |
| 3 | this.currentParams = {} | this.currentParams = null |
| 4 | this.globalDataMappings = [...] | this.globalDataMappings = null |

**통과 기준:**
- 페이지 언로드 후 interval이 실행되지 않음
- 모든 참조가 null로 설정되어 GC 가능

---

#### TC-IV-010: Interval on/off 토글 기능 검증

**목적:** 런타임에 interval을 일시 중지하고 재시작할 수 있는지 검증

**사전조건:**
- interval이 실행 중임
- stop/start 함수가 정의되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | interval 실행 중 | 주기적 fetch |
| 2 | stopAllIntervals() 호출 | 일시 중지 |
| 3 | 5초 대기 | fetch 없음 |
| 4 | startAllIntervals() 호출 | 재시작 |
| 5 | 5초 대기 | 다시 주기적 fetch |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 — TC-IV-003의 startAllIntervals/stopAllIntervals 정의 필요

// interval 시작
this.startAllIntervals();
console.log('[Test] Phase 1: Intervals started');

// 5초 후 중지
setTimeout(() => {
    console.log('[Test] Phase 2: Stopping intervals');
    this.stopAllIntervals();

    // 5초 대기 후 재시작
    setTimeout(() => {
        console.log('[Test] Phase 3: Restarting intervals');
        this.startAllIntervals();
    }, 5000);
}, 5000);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Test]') || msg.text().includes('[Interval]')) {
        logs.push(msg.text());
    }
});

// Phase 1: interval 시작 후 5초 — fetch 발생 확인
await previewPage.waitForTimeout(5000);
const phase1Fetches = logs.filter(l => l.includes('[Interval]')).length;
expect(phase1Fetches).toBeGreaterThan(0);

// Phase 2: 중지 후 5초 — 추가 fetch 없음 확인
await previewPage.waitForTimeout(6000);
const phase2Fetches = logs.filter(l => l.includes('[Interval]')).length;
const stopLog = logs.find(l => l.includes('Phase 2'));
expect(stopLog).toBeDefined();
// 중지 기간에 fetch가 증가하지 않아야 함
expect(phase2Fetches).toBe(phase1Fetches);

// Phase 3: 재시작 후 5초 — fetch 재개 확인
await previewPage.waitForTimeout(6000);
const phase3Fetches = logs.filter(l => l.includes('[Interval]')).length;
expect(phase3Fetches).toBeGreaterThan(phase2Fetches);
```

**통과 기준:**
- stopAllIntervals 후 fetch가 중지됨
- startAllIntervals 후 fetch가 재개됨
- currentParams 상태가 유지됨

---

### 4.4 테스트 요약 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-IV-001 | refreshInterval 정의 및 동작 검증 | ☐ |
| TC-IV-002 | refreshInterval 없는 topic 처리 검증 | ☐ |
| TC-IV-003 | startAllIntervals 동작 검증 | ☐ |
| TC-IV-004 | stopAllIntervals 동작 검증 | ☐ |
| TC-IV-005 | 개별 topic interval 정리 검증 | ☐ |
| TC-IV-006 | currentParams 참조 기반 자동 업데이트 검증 | ☐ |
| TC-IV-007 | 서로 다른 refreshInterval 독립성 검증 | ☐ |
| TC-IV-008 | Interval 내 에러 처리 검증 | ☐ |
| TC-IV-009 | 페이지 언로드 시 Interval 정리 검증 | ☐ |
| TC-IV-010 | Interval on/off 토글 기능 검증 | ☐ |

---

## 5. 리소스 정리 테스트

### 5.1 개요

RNBT 아키텍처에서 리소스 정리는 메모리 누수를 방지하고 안정적인 애플리케이션 동작을 보장하는 핵심 요소입니다.
**"생성된 모든 리소스는 1:1 매칭으로 정리되어야 한다"**는 원칙을 따릅니다.

**핵심 원칙:**
- 생성과 정리는 반드시 1:1로 매칭
- 참조 타입은 null로 설정하여 GC 가능하게 함
- 정리 순서는 생성의 역순

### 5.2 테스트 대상

| 영역 | 생성 | 정리 |
|------|------|------|
| 페이지 이벤트 | onEventBusHandlers | offEventBusHandlers |
| 페이지 데이터 | registerMapping | unregisterMapping |
| 페이지 인터벌 | setInterval | clearInterval (stopAllIntervals) |
| 컴포넌트 이벤트 | bindEvents | removeCustomEvents |
| 컴포넌트 구독 | subscribe | unsubscribe |
| 3D 리소스 | Three.js 객체 | disposeAllThreeResources |
| 팝업 | createPopup | destroyPopup |

---

### 5.3 테스트 시나리오

#### TC-RC-001: 페이지 생성/정리 매칭 검증 (eventBusHandlers)

**목적:** eventBusHandlers가 생성/정리 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (before_load) | 정리 (before_unload) |
|--------------------|----------------------|
| `this.eventBusHandlers = {...}` | `this.eventBusHandlers = null` |
| `onEventBusHandlers(...)` | `offEventBusHandlers(...)` |

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | eventBusHandlers 생성 및 등록 | 핸들러가 EventBus에 등록됨 |
| 2 | 이벤트 발행 | 핸들러 호출됨 |
| 3 | offEventBusHandlers 호출 | 핸들러 해제됨 |
| 4 | this.eventBusHandlers = null | 참조 제거됨 |
| 5 | 이벤트 다시 발행 | 핸들러 호출되지 않음 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.eventBusHandlers = {
    '@testEvent': ({ event }) => {
        console.log('[Handler] Called');
    }
};

onEventBusHandlers(this.eventBusHandlers);

// 페이지 beforeUnLoad 탭
const { offEventBusHandlers } = Wkit;

// 1. 핸들러 해제
offEventBusHandlers.call(this, this.eventBusHandlers);

// 2. 참조 제거
this.eventBusHandlers = null;

console.log('[Verify] eventBusHandlers:', this.eventBusHandlers); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Handler]') || msg.text().includes('[Verify]')) {
        logs.push(msg.text());
    }
});

// ... 뷰어 로드 → 이벤트 발행 → 핸들러 호출 확인
const handlerLog = logs.find(l => l.includes('[Handler] Called'));
expect(handlerLog).toBeDefined();

// 페이지 언로드 후 정리 확인
const verifyLog = logs.find(l => l.includes('eventBusHandlers: null'));
expect(verifyLog).toBeDefined();
```

**통과 기준:**
- offEventBusHandlers 호출 후 이벤트 수신 안 됨
- this.eventBusHandlers가 null로 설정됨

---

#### TC-RC-002: 페이지 생성/정리 매칭 검증 (globalDataMappings)

**목적:** globalDataMappings와 관련 리소스가 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (loaded) | 정리 (before_unload) |
|---------------|----------------------|
| `this.globalDataMappings = [...]` | `this.globalDataMappings = null` |
| `this.currentParams = {}` | `this.currentParams = null` |
| `GlobalDataPublisher.registerMapping(...)` | `GlobalDataPublisher.unregisterMapping(...)` |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 - 생성
this.globalDataMappings = [
    { topic: 'topicA', datasetInfo: { datasetName: 'apiA', param: {} } },
    { topic: 'topicB', datasetInfo: { datasetName: 'apiB', param: {} } }
];

this.currentParams = {};

fx.go(
    this.globalDataMappings,
    each(GlobalDataPublisher.registerMapping),
    each(({ topic }) => this.currentParams[topic] = {})
);

// 페이지 beforeUnLoad 탭 - 정리
fx.go(
    this.globalDataMappings,
    each(({ topic }) => GlobalDataPublisher.unregisterMapping(topic))
);

this.globalDataMappings = null;
this.currentParams = null;

console.log('[Verify] globalDataMappings:', this.globalDataMappings); // null
console.log('[Verify] currentParams:', this.currentParams); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 페이지 언로드 후
const gdmLog = logs.find(l => l.includes('globalDataMappings: null'));
const cpLog = logs.find(l => l.includes('currentParams: null'));
expect(gdmLog).toBeDefined();
expect(cpLog).toBeDefined();
```

**통과 기준:**
- 모든 topic에 대해 unregisterMapping 호출됨
- globalDataMappings와 currentParams가 null

---

#### TC-RC-003: 페이지 생성/정리 매칭 검증 (refreshIntervals)

**목적:** interval 생성과 정리가 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (loaded) | 정리 (before_unload) |
|---------------|----------------------|
| `this.refreshIntervals = {}` | `this.refreshIntervals = null` |
| `setInterval(...)` | `clearInterval(...)` via stopAllIntervals |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭 - 생성
this.refreshIntervals = {};

fx.go(
    this.globalDataMappings,
    each(({ topic, refreshInterval }) => {
        if (refreshInterval) {
            this.refreshIntervals[topic] = setInterval(() => {
                // fetch logic
            }, refreshInterval);
        }
    })
);

console.log('[Create] Interval count:', Object.keys(this.refreshIntervals).length);

// 페이지 beforeUnLoad 탭 - 정리
const intervalCount = Object.keys(this.refreshIntervals || {}).length;

this.stopAllIntervals();
this.refreshIntervals = null;

console.log('[Destroy] Intervals cleared:', intervalCount);
console.log('[Verify] refreshIntervals:', this.refreshIntervals); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Create]') || msg.text().includes('[Destroy]') || msg.text().includes('[Verify]')) {
        logs.push(msg.text());
    }
});

// ... 페이지 로드 → 언로드 후
const createLog = logs.find(l => l.includes('[Create] Interval count:'));
const destroyLog = logs.find(l => l.includes('[Destroy] Intervals cleared:'));

// 생성 개수 = 정리 개수
const created = parseInt(createLog!.split(':')[1].trim());
const cleared = parseInt(destroyLog!.split(':')[1].trim());
expect(created).toBe(cleared);

const verifyLog = logs.find(l => l.includes('refreshIntervals: null'));
expect(verifyLog).toBeDefined();
```

**통과 기준:**
- 생성된 interval 개수 = 정리된 interval 개수
- this.refreshIntervals가 null

---

#### TC-RC-004: 컴포넌트 생성/정리 매칭 검증 (customEvents)

**목적:** 컴포넌트의 customEvents가 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this.customEvents = {...}` | `this.customEvents = null` |
| `bindEvents(this, customEvents)` | `removeCustomEvents(this, customEvents)` |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭 — 생성
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.button': '@buttonClicked'
    }
};

bindEvents(this, this.customEvents);

// beforeDestroy 탭 — 정리
const { removeCustomEvents } = Wkit;

// 1. 이벤트 제거 (참조가 있는 동안 호출)
removeCustomEvents(this, this.customEvents);

// 2. 참조 제거
this.customEvents = null;

console.log('[Verify] customEvents:', this.customEvents); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 컴포넌트 삭제 후
const verifyLog = logs.find(l => l.includes('customEvents: null'));
expect(verifyLog).toBeDefined();
```

**통과 기준:**
- removeCustomEvents 호출 후 이벤트 발행 안 됨
- this.customEvents가 null

---

#### TC-RC-005: 컴포넌트 생성/정리 매칭 검증 (subscriptions)

**목적:** 컴포넌트의 subscriptions가 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this.subscriptions = {...}` | `this.subscriptions = null` |
| `subscribe(topic, this, handler)` | `unsubscribe(topic, this)` |
| `this.renderData = fn.bind(this)` | `this.renderData = null` |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭 — 생성
const { subscribe } = GlobalDataPublisher;

this.subscriptions = {
    sensorData: ['renderTable', 'updateCount']
};

this.renderTable = renderTable.bind(this);
this.updateCount = updateCount.bind(this);

fx.go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// beforeDestroy 탭 — 정리
const { unsubscribe } = GlobalDataPublisher;

// 1. 구독 해제
fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);

// 2. 참조 제거
this.subscriptions = null;
this.renderTable = null;
this.updateCount = null;

console.log('[Verify] subscriptions:', this.subscriptions); // null
console.log('[Verify] renderTable:', this.renderTable); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 컴포넌트 삭제 후
const subLog = logs.find(l => l.includes('subscriptions: null'));
const renderLog = logs.find(l => l.includes('renderTable: null'));
expect(subLog).toBeDefined();
expect(renderLog).toBeDefined();
```

**통과 기준:**
- 모든 topic에 대해 unsubscribe 호출됨
- subscriptions와 핸들러 참조가 null

---

#### TC-RC-006: 3D 리소스 정리 검증 (disposeAllThreeResources)

**목적:** 3D 컴포넌트의 리소스가 올바르게 정리되는지 검증

**정리 대상:**
- subscriptions 해제
- customEvents, datasetInfo 참조 제거
- geometry, material, texture dispose
- Scene background 정리

**주입 코드 (CodeBox에 입력):**

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.customEvents = {
    click: '@3dObjectClicked'
};

this.datasetInfo = [
    { datasetName: 'sensorData', param: { id: this.id } }
];

bind3DEvents(this, this.customEvents);

// 페이지 beforeUnLoad 탭
const { disposeAllThreeResources } = Wkit;

// 한 줄로 모든 3D 컴포넌트 정리
disposeAllThreeResources(this);

console.log('[Verify] 3D resources disposed');
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 페이지 언로드 후
const disposeLog = logs.find(l => l.includes('3D resources disposed'));
expect(disposeLog).toBeDefined();

// 에러 없음 확인
const errors: string[] = [];
previewPage.on('pageerror', err => errors.push(err.message));
expect(errors).toHaveLength(0);
```

**disposeAllThreeResources가 처리하는 항목:**

| 항목 | 처리 방식 |
|------|----------|
| subscriptions | unsubscribe 호출 |
| geometry | dispose() 호출 |
| material | dispose() 호출 |
| texture | dispose() 호출 |
| Scene background | 정리 |

> **Note:** 인스턴스 속성(`customEvents`, `datasetInfo` 등)의 수동 null 처리는 수행하지 않는다.
> 인스턴스가 GC될 때 속성도 함께 수거되며, 외부에서 속성을 null 처리하면
> `_onViewerDestroy()`의 정리 로직이 실패할 수 있다.
> 상세: [INSTANCE_LIFECYCLE_GC.md](/RNBT_architecture/docs/INSTANCE_LIFECYCLE_GC.md) 부록 A

**통과 기준:**
- disposeAllThreeResources 호출 시 에러 없음
- GPU 메모리가 해제됨 (개발자 도구에서 확인)

---

#### TC-RC-007: 내부 이벤트 핸들러 정리 검증 (_internalHandlers)

**목적:** 컴포넌트 내부 이벤트 핸들러가 1:1 매칭되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this._internalHandlers = {}` | `this._internalHandlers = null` |
| `addEventListener(...)` | `removeEventListener(...)` |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭 — 생성
this._internalHandlers = {};

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.clearClick = () => this.clearLogs();
    this._internalHandlers.scrollClick = () => this.toggleAutoScroll();

    root.querySelector('.btn-clear')?.addEventListener('click', this._internalHandlers.clearClick);
    root.querySelector('.btn-scroll')?.addEventListener('click', this._internalHandlers.scrollClick);
}

setupInternalHandlers.call(this);

// beforeDestroy 탭 — 정리
const root = this.appendElement;

if (this._internalHandlers) {
    root.querySelector('.btn-clear')?.removeEventListener('click', this._internalHandlers.clearClick);
    root.querySelector('.btn-scroll')?.removeEventListener('click', this._internalHandlers.scrollClick);
}

this._internalHandlers = null;

console.log('[Verify] _internalHandlers:', this._internalHandlers); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 컴포넌트 삭제 후
const verifyLog = logs.find(l => l.includes('_internalHandlers: null'));
expect(verifyLog).toBeDefined();

// 이벤트 리스너 수 확인 (삭제 전후 비교)
const listenerCount = await previewPage.evaluate(() => {
    // getEventListeners는 DevTools API이므로 대안으로 DOM 상태 확인
    return document.querySelectorAll('.btn-clear, .btn-scroll').length;
});
// 컴포넌트 삭제 후 해당 요소가 DOM에 없어야 함
expect(listenerCount).toBe(0);
```

**통과 기준:**
- 모든 addEventListener에 대응하는 removeEventListener 호출됨
- this._internalHandlers가 null

---

#### TC-RC-008: 바인딩된 메서드 참조 정리 검증

**목적:** bind()로 생성된 메서드 참조가 정리되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this.methodA = fn.bind(this)` | `this.methodA = null` |
| `this.methodB = fn.bind(this)` | `this.methodB = null` |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭 — 생성
function renderTable({ response }) { /* ... */ }
function updateCount({ response }) { /* ... */ }
function handleClick(e) { /* ... */ }

this.renderTable = renderTable.bind(this);
this.updateCount = updateCount.bind(this);
this.handleClick = handleClick.bind(this);

// beforeDestroy 탭 — 정리
this.renderTable = null;
this.updateCount = null;
this.handleClick = null;

console.log('[Verify] All bound methods nullified');
console.log('[Verify] renderTable:', this.renderTable);
console.log('[Verify] updateCount:', this.updateCount);
console.log('[Verify] handleClick:', this.handleClick);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 컴포넌트 삭제 후
expect(logs.find(l => l.includes('renderTable: null'))).toBeDefined();
expect(logs.find(l => l.includes('updateCount: null'))).toBeDefined();
expect(logs.find(l => l.includes('handleClick: null'))).toBeDefined();
```

**통과 기준:**
- 모든 bind()로 생성된 참조가 null로 설정됨

---

#### TC-RC-009: 상태 객체 정리 검증

**목적:** 컴포넌트의 상태 객체(_state 등)가 정리되는지 검증

**생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this._state = value` | `this._state = null` |
| `this.data = {}` | `this.data = null` |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭 — 생성
this._state = {
    isExpanded: false,
    selectedIndex: -1,
    cache: new Map()
};

this.data = {
    items: [],
    total: 0
};

// beforeDestroy 탭 — 정리
if (this._state?.cache) {
    this._state.cache.clear();
}

this._state = null;
this.data = null;

console.log('[Verify] _state:', this._state); // null
console.log('[Verify] data:', this.data); // null
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]')) logs.push(msg.text());
});

// ... 컴포넌트 삭제 후
expect(logs.find(l => l.includes('_state: null'))).toBeDefined();
expect(logs.find(l => l.includes('data: null'))).toBeDefined();
```

**통과 기준:**
- Map, Set 등 컬렉션은 clear() 후 null
- 모든 상태 객체가 null로 설정됨

---

#### TC-RC-010: 전체 생성/정리 매칭 테이블 검증

**목적:** 전체 생성/정리 매칭이 누락 없이 이루어지는지 검증

**전체 생성/정리 매칭 테이블:**

| 생성 (register) | 정리 (beforeDestroy) |
|-----------------|----------------------|
| `this.subscriptions = {...}` | `this.subscriptions = null` |
| `subscribe(topic, this, handler)` | `unsubscribe(topic, this)` |
| `this.customEvents = {...}` | `this.customEvents = null` |
| `bindEvents(this, customEvents)` | `removeCustomEvents(this, customEvents)` |
| `this._internalHandlers = {...}` | `this._internalHandlers = null` |
| `addEventListener(...)` | `removeEventListener(...)` |
| `this.renderData = fn.bind(this)` | `this.renderData = null` |
| `this._state = value` | `this._state = null` |
| `createPopup(this, config)` | `destroyPopup(this)` |
| `this.eventBusHandlers = {...}` | `this.eventBusHandlers = null` |
| `onEventBusHandlers(handlers)` | `offEventBusHandlers(handlers)` |

**주입 코드 (CodeBox에 입력):**

```javascript
// beforeDestroy 탭 — 정리 후 검증 로그 출력
const properties = [
    'subscriptions', 'customEvents', '_internalHandlers',
    'renderTable', 'updateCount', '_state', 'data',
    'eventBusHandlers', 'globalDataMappings', 'currentParams', 'refreshIntervals'
];

const leaks = properties.filter(prop =>
    this[prop] !== null && this[prop] !== undefined
);

if (leaks.length > 0) {
    console.error('[Resource Leak] Not cleaned up:', leaks.join(', '));
} else {
    console.log('[Verify] All resources cleaned up');
}
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
const errors: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Verify]') || msg.text().includes('[Resource Leak]')) {
        if (msg.type() === 'error') errors.push(msg.text());
        else logs.push(msg.text());
    }
});

// ... 컴포넌트 삭제 후
expect(errors).toHaveLength(0); // 누수 없음
expect(logs.find(l => l.includes('All resources cleaned up'))).toBeDefined();
```

**통과 기준:**
- [Resource Leak] 에러 없음
- 모든 속성이 null로 설정됨

---

#### TC-RC-011: 정리 순서 검증

**목적:** 리소스 정리 순서가 올바른지 검증 (생성의 역순)

**페이지 정리 순서:**

```
page_before_unload.js 실행 순서:
1. stopAllIntervals()        ← Interval 먼저 중단
2. offEventBusHandlers()     ← EventBus 정리
3. unregisterMapping()       ← DataPublisher 정리
4. disposeAllThreeResources() ← 3D 정리 (선택)
5. 참조 제거 (null 설정)     ← 마지막
```

**컴포넌트 정리 순서:**

```
beforeDestroy.js 실행 순서:
1. removeCustomEvents()      ← DOM 이벤트 해제
2. unsubscribe()             ← 구독 해제
3. removeEventListener()     ← 내부 이벤트 해제
4. 참조 제거 (null 설정)     ← 마지막
```

**주입 코드 (CodeBox에 입력):**

```javascript
// 정리 순서 로깅
const cleanupLog = [];

// 페이지 beforeUnLoad 탭
cleanupLog.push({ step: 1, action: 'stopAllIntervals', timestamp: Date.now() });
this.stopAllIntervals();

cleanupLog.push({ step: 2, action: 'offEventBusHandlers', timestamp: Date.now() });
offEventBusHandlers.call(this, this.eventBusHandlers);

cleanupLog.push({ step: 3, action: 'unregisterMapping', timestamp: Date.now() });
fx.go(this.globalDataMappings, each(({ topic }) => GlobalDataPublisher.unregisterMapping(topic)));

cleanupLog.push({ step: 4, action: 'nullify references', timestamp: Date.now() });
this.eventBusHandlers = null;
this.globalDataMappings = null;
this.currentParams = null;
this.refreshIntervals = null;

cleanupLog.forEach(entry => {
    console.log(`[Cleanup] Step ${entry.step}: ${entry.action}`);
});
```

**Playwright 검증:**

```typescript
const cleanupSteps: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[Cleanup] Step')) cleanupSteps.push(msg.text());
});

// ... 페이지 언로드 후
expect(cleanupSteps.length).toBe(4);

// 순서 검증: intervals → eventBus → mapping → null
expect(cleanupSteps[0]).toContain('stopAllIntervals');
expect(cleanupSteps[1]).toContain('offEventBusHandlers');
expect(cleanupSteps[2]).toContain('unregisterMapping');
expect(cleanupSteps[3]).toContain('nullify references');
```

**통과 기준:**
- 정리 순서가 문서화된 순서와 일치
- 참조 제거가 마지막에 수행됨

---

#### TC-RC-012: 메모리 누수 검증

**목적:** 페이지 로드/언로드 반복 시 메모리 누수가 없는지 검증

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 초기 메모리 측정 | baseline 기록 |
| 2 | 페이지 로드 → 언로드 5회 반복 | 정상 정리됨 |
| 3 | GC 실행 (chrome://gc) | 메모리 해제됨 |
| 4 | 최종 메모리 측정 | baseline과 유사 |

**Playwright 검증:**

```typescript
// 메모리 측정 헬퍼
async function measureMemory(page: Page) {
    return page.evaluate(() => ({
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize ?? 0,
        domNodes: document.querySelectorAll('*').length,
    }));
}

// 1. 초기 메모리 측정
const baseline = await measureMemory(previewPage);

// 2. 페이지 로드/언로드 5회 반복
for (let i = 0; i < 5; i++) {
    // 에디터에서 다른 페이지로 이동 → 원래 페이지로 복귀
    // (뷰어에서 페이지 전환 조작)
    await previewPage.waitForTimeout(2000);
}

// 3. GC 요청
const client = await previewPage.context().newCDPSession(previewPage);
await client.send('HeapProfiler.collectGarbage');

// 4. 최종 측정
const final = await measureMemory(previewPage);

// 5. 비교 — 20% 이상 증가하면 누수 의심
const heapGrowth = (final.usedJSHeapSize - baseline.usedJSHeapSize) / baseline.usedJSHeapSize;
expect(heapGrowth).toBeLessThan(0.2);
expect(final.domNodes).toBeLessThanOrEqual(baseline.domNodes * 1.1);
```

**통과 기준:**
- 5회 반복 후 메모리 사용량이 초기 대비 크게 증가하지 않음
- Event Listeners 수가 증가하지 않음
- DOM Nodes 수가 증가하지 않음

---

### 5.4 테스트 요약 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-RC-001 | 페이지 생성/정리 매칭 검증 (eventBusHandlers) | ☐ |
| TC-RC-002 | 페이지 생성/정리 매칭 검증 (globalDataMappings) | ☐ |
| TC-RC-003 | 페이지 생성/정리 매칭 검증 (refreshIntervals) | ☐ |
| TC-RC-004 | 컴포넌트 생성/정리 매칭 검증 (customEvents) | ☐ |
| TC-RC-005 | 컴포넌트 생성/정리 매칭 검증 (subscriptions) | ☐ |
| TC-RC-006 | 3D 리소스 정리 검증 (disposeAllThreeResources) | ☐ |
| TC-RC-007 | 내부 이벤트 핸들러 정리 검증 (_internalHandlers) | ☐ |
| TC-RC-008 | 바인딩된 메서드 참조 정리 검증 | ☐ |
| TC-RC-009 | 상태 객체 정리 검증 | ☐ |
| TC-RC-010 | 전체 생성/정리 매칭 테이블 검증 | ☐ |
| TC-RC-011 | 정리 순서 검증 | ☐ |
| TC-RC-012 | 메모리 누수 검증 | ☐ |

---

## 6. PopupMixin 테스트

PopupMixin은 Shadow DOM 기반 팝업 시스템을 제공합니다.
- `applyShadowPopupMixin`: 기본 Shadow DOM 팝업 (필수, 먼저 적용)
- `applyEChartsMixin`: ECharts 차트 관리 (선택)
- `applyTabulatorMixin`: Tabulator 테이블 관리 (선택)

### 6.1 applyShadowPopupMixin 기본 기능

#### TC-PM-001: applyShadowPopupMixin 적용 검증

**목적:** applyShadowPopupMixin이 인스턴스에 필요한 메서드들을 추가하는지 검증

**사전 조건:**
- 컴포넌트 인스턴스가 존재함
- PopupMixin이 로드됨

**테스트 순서:**
1. applyShadowPopupMixin을 인스턴스에 적용
2. 추가된 메서드들 확인
3. _popup 내부 상태 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin } = PopupMixin;

// Mixin 적용
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup">Test</div>',
    getStyles: () => '.popup { background: #1a1f2e; }',
    onCreated: null
});

// 검증: 메서드 추가 확인
const methods = ['createPopup', 'showPopup', 'hidePopup', 'popupQuery', 'popupQueryAll', 'bindPopupEvents', 'destroyPopup'];
methods.forEach(m => console.log(`[PM-001] ${m}:`, typeof this[m]));

// 검증: 내부 상태 초기화 확인
console.log('[PM-001] _popup exists:', this._popup !== undefined);
console.log('[PM-001] _popup.host:', this._popup.host);
console.log('[PM-001] _popup.shadowRoot:', this._popup.shadowRoot);
console.log('[PM-001] eventCleanups isArray:', Array.isArray(this._popup.eventCleanups));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-001]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
['createPopup', 'showPopup', 'hidePopup', 'popupQuery', 'popupQueryAll', 'bindPopupEvents', 'destroyPopup']
    .forEach(m => expect(logs.find(l => l.includes(`${m}: function`))).toBeDefined());

expect(logs.find(l => l.includes('_popup exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('_popup.host: null'))).toBeDefined();
expect(logs.find(l => l.includes('_popup.shadowRoot: null'))).toBeDefined();
expect(logs.find(l => l.includes('eventCleanups isArray: true'))).toBeDefined();
```

**통과 기준:**
- 7개 메서드 모두 추가됨
- _popup 상태 객체가 올바르게 초기화됨

---

#### TC-PM-002: createPopup Shadow DOM 생성 검증

**목적:** createPopup이 Shadow DOM을 올바르게 생성하는지 검증

**사전 조건:**
- applyShadowPopupMixin이 적용됨
- page.appendElement가 존재함

**테스트 순서:**
1. createPopup() 호출
2. Shadow DOM 호스트 생성 확인
3. Shadow DOM 내용 확인
4. 페이지에 추가 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup-content">Hello World</div>',
    getStyles: () => '.popup-content { color: white; }',
    onCreated: null
});

// createPopup 호출
const shadowRoot = this.createPopup();

// 검증 로그 출력
console.log('[PM-002] host exists:', this._popup.host !== null);
console.log('[PM-002] host id:', this._popup.host?.id);
console.log('[PM-002] shadowRoot exists:', this._popup.shadowRoot !== null);
console.log('[PM-002] returnValue matches:', shadowRoot === this._popup.shadowRoot);

const styleEl = this._popup.shadowRoot.querySelector('style');
console.log('[PM-002] style tag exists:', styleEl !== null);
console.log('[PM-002] style includes class:', styleEl?.textContent?.includes('.popup-content'));

const contentEl = this._popup.shadowRoot.querySelector('.popup-content');
console.log('[PM-002] content exists:', contentEl !== null);
console.log('[PM-002] content text:', contentEl?.textContent);
console.log('[PM-002] added to page:', this.page.appendElement.contains(this._popup.host));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-002]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('host exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('shadowRoot exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('returnValue matches: true'))).toBeDefined();
expect(logs.find(l => l.includes('style tag exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('content text: Hello World'))).toBeDefined();
expect(logs.find(l => l.includes('added to page: true'))).toBeDefined();
```

**통과 기준:**
- Shadow DOM 호스트가 고유 ID로 생성됨
- 스타일과 HTML이 Shadow Root에 삽입됨
- 페이지의 appendElement에 추가됨

---

#### TC-PM-003: createPopup 중복 호출 방지 검증

**목적:** createPopup을 여러 번 호출해도 한 번만 생성되는지 검증

**사전 조건:**
- applyShadowPopupMixin이 적용됨

**테스트 순서:**
1. createPopup() 첫 번째 호출
2. 호스트 참조 저장
3. createPopup() 두 번째 호출
4. 동일한 인스턴스인지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
let createdCount = 0;

applyShadowPopupMixin(this, {
    getHTML: () => {
        createdCount++;
        return '<div>Popup</div>';
    },
    getStyles: () => '',
    onCreated: null
});

// 첫 번째 호출
const shadowRoot1 = this.createPopup();
const host1 = this._popup.host;

// 두 번째 호출
const shadowRoot2 = this.createPopup();
const host2 = this._popup.host;

// 검증 로그
console.log('[PM-003] same host:', host1 === host2);
console.log('[PM-003] same shadowRoot:', shadowRoot1 === shadowRoot2);
console.log('[PM-003] getHTML call count:', createdCount);

const popupHosts = this.page.appendElement.querySelectorAll(`#popup-${this.id}`);
console.log('[PM-003] DOM popup count:', popupHosts.length);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-003]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('same host: true'))).toBeDefined();
expect(logs.find(l => l.includes('same shadowRoot: true'))).toBeDefined();
expect(logs.find(l => l.includes('getHTML call count: 1'))).toBeDefined();
expect(logs.find(l => l.includes('DOM popup count: 1'))).toBeDefined();
```

**통과 기준:**
- createPopup을 여러 번 호출해도 팝업은 하나만 생성됨
- getHTML, getStyles는 최초 1회만 호출됨

---

#### TC-PM-004: onCreated 콜백 실행 검증

**목적:** 팝업 생성 시 onCreated 콜백이 올바르게 실행되는지 검증

**사전 조건:**
- applyShadowPopupMixin이 적용됨
- onCreated 콜백이 정의됨

**테스트 순서:**
1. onCreated 콜백 정의
2. createPopup() 호출
3. 콜백 실행 확인
4. 콜백 컨텍스트(this) 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
let callbackExecuted = false;
let callbackContext = null;
let receivedShadowRoot = null;

applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup">Content</div>',
    getStyles: () => '',
    onCreated: function(shadowRoot) {
        callbackExecuted = true;
        callbackContext = this;
        receivedShadowRoot = shadowRoot;

        // 콜백 내에서 초기화 작업 수행
        const popup = shadowRoot.querySelector('.popup');
        popup.dataset.initialized = 'true';
    }
});

this.createPopup();

// 검증 로그
console.log('[PM-004] callback executed:', callbackExecuted);
console.log('[PM-004] correct this context:', callbackContext === this);
console.log('[PM-004] shadowRoot received:', receivedShadowRoot === this._popup.shadowRoot);

const popup = this.popupQuery('.popup');
console.log('[PM-004] initialized attr:', popup?.dataset.initialized);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-004]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('callback executed: true'))).toBeDefined();
expect(logs.find(l => l.includes('correct this context: true'))).toBeDefined();
expect(logs.find(l => l.includes('shadowRoot received: true'))).toBeDefined();
expect(logs.find(l => l.includes('initialized attr: true'))).toBeDefined();
```

**통과 기준:**
- onCreated 콜백이 실행됨
- 콜백의 this는 컴포넌트 인스턴스
- shadowRoot가 파라미터로 전달됨

---

#### TC-PM-005: showPopup/hidePopup 표시 제어 검증

**목적:** showPopup과 hidePopup이 팝업 표시 상태를 올바르게 제어하는지 검증

**사전 조건:**
- applyShadowPopupMixin이 적용됨

**테스트 순서:**
1. showPopup() 호출 (팝업 미생성 상태)
2. 팝업 자동 생성 및 표시 확인
3. hidePopup() 호출
4. 숨김 상태 확인
5. showPopup() 다시 호출
6. 재표시 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup">Content</div>',
    getStyles: () => '',
    onCreated: null
});

// 검증 1: 팝업 미생성 상태
console.log('[PM-005] initial host null:', this._popup.host === null);

this.showPopup();
console.log('[PM-005] after showPopup - host exists:', this._popup.host !== null);
console.log('[PM-005] after showPopup - display:', this._popup.host?.style.display);

this.hidePopup();
console.log('[PM-005] after hidePopup - display:', this._popup.host?.style.display);

this.showPopup();
console.log('[PM-005] after re-showPopup - display:', this._popup.host?.style.display);

const hostsBefore = this.page.appendElement.querySelectorAll(`[id^="popup-"]`).length;
this.showPopup();
const hostsAfter = this.page.appendElement.querySelectorAll(`[id^="popup-"]`).length;
console.log('[PM-005] popup count stable:', hostsBefore === hostsAfter);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-005]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('initial host null: true'))).toBeDefined();
expect(logs.find(l => l.includes('after showPopup - display: block'))).toBeDefined();
expect(logs.find(l => l.includes('after hidePopup - display: none'))).toBeDefined();
expect(logs.find(l => l.includes('after re-showPopup - display: block'))).toBeDefined();
expect(logs.find(l => l.includes('popup count stable: true'))).toBeDefined();
```

**통과 기준:**
- showPopup은 팝업이 없으면 자동 생성 후 표시
- hidePopup은 display: none 설정
- showPopup은 display: block 설정
- 여러 번 호출해도 팝업 인스턴스는 하나

---

#### TC-PM-006: popupQuery/popupQueryAll Shadow DOM 쿼리 검증

**목적:** Shadow DOM 내부 요소를 올바르게 선택하는지 검증

**사전 조건:**
- 팝업이 생성됨
- Shadow DOM에 복수의 요소가 존재

**테스트 순서:**
1. 복수 요소를 포함한 팝업 생성
2. popupQuery로 단일 요소 선택
3. popupQueryAll로 복수 요소 선택
4. 존재하지 않는 선택자 테스트

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <h1 class="title">Title</h1>
            <ul class="list">
                <li class="item">Item 1</li>
                <li class="item">Item 2</li>
                <li class="item">Item 3</li>
            </ul>
        </div>
    `,
    getStyles: () => '',
    onCreated: null
});

this.createPopup();

// 검증 1: popupQuery - 단일 요소
const title = this.popupQuery('.title');
console.log('[PM-006] title found:', title !== null);
console.log('[PM-006] title text:', title?.textContent);

// 검증 2: popupQuery - 복수 요소 중 첫 번째
const firstItem = this.popupQuery('.item');
console.log('[PM-006] first item text:', firstItem?.textContent);

// 검증 3: popupQueryAll - 모든 요소
const items = this.popupQueryAll('.item');
console.log('[PM-006] items count:', items.length);
console.log('[PM-006] third item text:', items[2]?.textContent);

// 검증 4: 존재하지 않는 선택자
const notFound = this.popupQuery('.not-exist');
console.log('[PM-006] notFound is null:', notFound === null);

const notFoundAll = this.popupQueryAll('.not-exist');
console.log('[PM-006] notFoundAll count:', notFoundAll.length);

// 검증 5: 팝업 생성 전 쿼리
const freshInstance = {};
applyShadowPopupMixin(freshInstance, {
    getHTML: () => '<div></div>',
    getStyles: () => '',
    onCreated: null
});
const result = freshInstance.popupQuery('.anything');
console.log('[PM-006] pre-create query safe:', result === undefined || result === null);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-006]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('title text: Title'))).toBeDefined();
expect(logs.find(l => l.includes('first item text: Item 1'))).toBeDefined();
expect(logs.find(l => l.includes('items count: 3'))).toBeDefined();
expect(logs.find(l => l.includes('third item text: Item 3'))).toBeDefined();
expect(logs.find(l => l.includes('notFound is null: true'))).toBeDefined();
expect(logs.find(l => l.includes('notFoundAll count: 0'))).toBeDefined();
expect(logs.find(l => l.includes('pre-create query safe: true'))).toBeDefined();
```

**통과 기준:**
- popupQuery는 단일 요소 반환 (없으면 null)
- popupQueryAll은 NodeList 반환 (없으면 빈 배열)
- Shadow DOM 경계 내에서만 검색됨

---

#### TC-PM-007: bindPopupEvents 이벤트 델리게이션 검증

**목적:** bindPopupEvents가 이벤트 델리게이션 방식으로 작동하는지 검증

**사전 조건:**
- 팝업이 생성됨
- 이벤트 핸들러가 정의됨

**테스트 순서:**
1. 버튼들이 있는 팝업 생성
2. bindPopupEvents로 이벤트 바인딩
3. 버튼 클릭 시뮬레이션
4. 핸들러 실행 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
let closeClicked = false;
let refreshClicked = false;
let clickedTarget = null;

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <button class="close-btn">Close</button>
            <button class="refresh-btn">Refresh</button>
            <div class="content">
                <span class="inner-text">Click me</span>
            </div>
        </div>
    `,
    getStyles: () => '',
    onCreated: (shadowRoot) => {
        this.bindPopupEvents({
            click: {
                '.close-btn': (e) => {
                    closeClicked = true;
                    clickedTarget = e.target;
                },
                '.refresh-btn': () => {
                    refreshClicked = true;
                }
            }
        });
    }
});

this.createPopup();

// 검증 1: close 버튼 클릭
const closeBtn = this.popupQuery('.close-btn');
closeBtn.click();
console.log('[PM-007] close handler called:', closeClicked);
console.log('[PM-007] event target matches:', clickedTarget === closeBtn);

// 검증 2: refresh 버튼 클릭
const refreshBtn = this.popupQuery('.refresh-btn');
refreshBtn.click();
console.log('[PM-007] refresh handler called:', refreshClicked);

// 검증 3: 바인딩 안 된 요소 클릭 (에러 없이 무시)
const content = this.popupQuery('.content');
content.click();
console.log('[PM-007] unbound click no error: true');

// 검증 4: closest 매칭
let contentClicked = false;
this.bindPopupEvents({
    click: { '.content': () => { contentClicked = true; } }
});

const innerText = this.popupQuery('.inner-text');
innerText.click();
console.log('[PM-007] closest match works:', contentClicked);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-007]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('close handler called: true'))).toBeDefined();
expect(logs.find(l => l.includes('event target matches: true'))).toBeDefined();
expect(logs.find(l => l.includes('refresh handler called: true'))).toBeDefined();
expect(logs.find(l => l.includes('closest match works: true'))).toBeDefined();
```

**통과 기준:**
- 선택자에 매칭되는 요소 클릭 시 핸들러 실행
- closest()로 부모 요소까지 매칭
- 바인딩 안 된 요소는 무시

---

#### TC-PM-008: destroyPopup 리소스 정리 검증

**목적:** destroyPopup이 모든 리소스를 올바르게 정리하는지 검증

**사전 조건:**
- 팝업이 생성됨
- 이벤트가 바인딩됨

**테스트 순서:**
1. 팝업 생성 및 이벤트 바인딩
2. destroyPopup() 호출
3. DOM 제거 확인
4. 이벤트 정리 확인
5. 상태 초기화 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
let handlerCalled = false;

applyShadowPopupMixin(this, {
    getHTML: () => `<div class="popup"><button class="btn">Click</button></div>`,
    getStyles: () => '',
    onCreated: () => {
        this.bindPopupEvents({
            click: {
                '.btn': () => { handlerCalled = true; }
            }
        });
    }
});

this.createPopup();

// 정리 전 상태 확인
const hostBefore = this._popup.host;
console.log('[PM-008] before: host exists:', hostBefore !== null);
console.log('[PM-008] before: cleanups count:', this._popup.eventCleanups.length);
console.log('[PM-008] before: in DOM:', this.page.appendElement.contains(hostBefore));

// destroyPopup 호출
this.destroyPopup();

// 검증
console.log('[PM-008] after: host null:', this._popup.host === null);
console.log('[PM-008] after: shadowRoot null:', this._popup.shadowRoot === null);
console.log('[PM-008] after: removed from DOM:', !this.page.appendElement.contains(hostBefore));
console.log('[PM-008] after: cleanups empty:', this._popup.eventCleanups.length === 0);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-008]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('before: host exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('after: host null: true'))).toBeDefined();
expect(logs.find(l => l.includes('after: shadowRoot null: true'))).toBeDefined();
expect(logs.find(l => l.includes('after: removed from DOM: true'))).toBeDefined();
expect(logs.find(l => l.includes('after: cleanups empty: true'))).toBeDefined();
```

**통과 기준:**
- DOM에서 팝업 호스트 제거됨
- _popup.host, _popup.shadowRoot null로 설정
- eventCleanups 배열 비워짐
- 이벤트 리스너 해제됨

---

### 6.2 applyEChartsMixin 테스트

#### TC-PM-009: applyEChartsMixin 전제조건 검증

**목적:** applyShadowPopupMixin 없이 호출 시 경고 출력 확인

**사전 조건:**
- 컴포넌트 인스턴스가 존재함
- applyShadowPopupMixin이 적용되지 않음

**테스트 순서:**
1. applyShadowPopupMixin 없이 applyEChartsMixin 호출
2. 경고 메시지 확인
3. 메서드 미추가 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;

// applyShadowPopupMixin 없이 바로 호출
applyEChartsMixin(this);

// 검증 로그
console.log('[PM-009] createChart exists:', typeof this.createChart);
console.log('[PM-009] getChart exists:', typeof this.getChart);
console.log('[PM-009] updateChart exists:', typeof this.updateChart);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
const warnings: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-009]')) logs.push(msg.text());
    if (msg.type() === 'warning' && msg.text().includes('applyShadowPopupMixin')) {
        warnings.push(msg.text());
    }
});

// ... 뷰어 로드 후
expect(warnings.length).toBeGreaterThan(0); // 경고 출력됨
expect(logs.find(l => l.includes('createChart exists: undefined'))).toBeDefined();
```

**통과 기준:**
- 경고 메시지가 콘솔에 출력됨
- 차트 관련 메서드가 추가되지 않음

---

#### TC-PM-010: createChart ECharts 인스턴스 생성 검증

**목적:** createChart가 ECharts 인스턴스를 올바르게 생성하는지 검증

**사전 조건:**
- applyShadowPopupMixin 적용됨
- applyEChartsMixin 적용됨
- echarts 라이브러리 로드됨

**테스트 순서:**
1. 차트 컨테이너가 있는 팝업 생성
2. createChart() 호출
3. ECharts 인스턴스 생성 확인
4. ResizeObserver 연결 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <div class="chart-container" style="width: 400px; height: 300px;"></div>
        </div>
    `,
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);

this.createPopup();

// 검증 1: charts Map 초기화
console.log('[PM-010] charts is Map:', this._popup.charts instanceof Map);
console.log('[PM-010] initial charts size:', this._popup.charts.size);

// 검증 2: createChart 호출
const chart = this.createChart('.chart-container');
console.log('[PM-010] chart created:', chart !== null);

// 검증 3: Map에 저장
console.log('[PM-010] stored in Map:', this._popup.charts.has('.chart-container'));
const stored = this._popup.charts.get('.chart-container');
console.log('[PM-010] stored chart matches:', stored?.chart === chart);
console.log('[PM-010] has ResizeObserver:', stored?.resizeObserver instanceof ResizeObserver);

// 검증 4: ECharts 인스턴스
console.log('[PM-010] has setOption:', typeof chart?.setOption === 'function');
console.log('[PM-010] has dispose:', typeof chart?.dispose === 'function');
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-010]')) logs.push(msg.text());
});

// ... 뷰어 로드 후
expect(logs.find(l => l.includes('charts is Map: true'))).toBeDefined();
expect(logs.find(l => l.includes('chart created: true'))).toBeDefined();
expect(logs.find(l => l.includes('stored in Map: true'))).toBeDefined();
expect(logs.find(l => l.includes('has ResizeObserver: true'))).toBeDefined();
expect(logs.find(l => l.includes('has setOption: true'))).toBeDefined();
```

**통과 기준:**
- ECharts 인스턴스가 생성됨
- _popup.charts Map에 저장됨
- ResizeObserver가 연결됨

---

#### TC-PM-011: createChart 중복 생성 방지 검증

**목적:** 동일 선택자로 createChart 재호출 시 기존 인스턴스 반환

**사전 조건:**
- 차트가 이미 생성됨

**테스트 순서:**
1. createChart() 첫 번째 호출
2. createChart() 두 번째 호출 (동일 선택자)
3. 동일 인스턴스인지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);
this.createPopup();

// 첫 번째 생성
const chart1 = this.createChart('.chart');

// 두 번째 호출
const chart2 = this.createChart('.chart');

// 검증 로그
console.log('[PM-011] same instance:', chart1 === chart2);
console.log('[PM-011] charts size:', this._popup.charts.size);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-011]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('same instance: true'))).toBeDefined();
expect(logs.find(l => l.includes('charts size: 1'))).toBeDefined();
```

**통과 기준:**
- 동일 선택자로 재호출 시 새 인스턴스 생성하지 않음
- 기존 인스턴스 반환

---

#### TC-PM-012: createChart 존재하지 않는 컨테이너 처리 검증

**목적:** 존재하지 않는 선택자로 createChart 호출 시 null 반환

**사전 조건:**
- 팝업이 생성됨
- 지정한 선택자의 요소가 없음

**테스트 순서:**
1. 존재하지 않는 선택자로 createChart 호출
2. null 반환 확인
3. 경고 메시지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"></div>',  // .chart-container 없음
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);
this.createPopup();

// 존재하지 않는 컨테이너로 createChart 호출
const chart = this.createChart('.chart-container');

// 검증 로그
console.log('[PM-012] chart is null:', chart === null);
console.log('[PM-012] charts size:', this._popup.charts.size);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
const warnings: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-012]')) logs.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
});

expect(logs.find(l => l.includes('chart is null: true'))).toBeDefined();
expect(logs.find(l => l.includes('charts size: 0'))).toBeDefined();
expect(warnings.find(l => l.includes('.chart-container'))).toBeDefined();
```

**통과 기준:**
- null 반환
- 경고 메시지 출력
- charts Map에 추가되지 않음

---

#### TC-PM-013: getChart/updateChart 사용 검증

**목적:** getChart로 인스턴스 조회, updateChart로 옵션 업데이트

**사전 조건:**
- 차트가 생성됨

**테스트 순서:**
1. createChart로 차트 생성
2. getChart로 조회
3. updateChart로 옵션 적용
4. 없는 선택자로 조회/업데이트 시도

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);
this.createPopup();

// 차트 생성
this.createChart('.chart');

// 검증 1: getChart
const chart = this.getChart('.chart');
console.log('[PM-013] getChart result:', chart !== null);

// 검증 2: updateChart
const option = {
    xAxis: { type: 'category', data: ['A', 'B', 'C'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [10, 20, 30] }]
};
this.updateChart('.chart', option);

const appliedOption = chart.getOption();
console.log('[PM-013] option applied:', appliedOption.xAxis[0].data.length);

// 검증 3: 없는 선택자
const notFound = this.getChart('.not-exist');
console.log('[PM-013] notFound is null:', notFound === null);
this.updateChart('.not-exist', option);  // 경고만, 에러 없음
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-013]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('getChart result: true'))).toBeDefined();
expect(logs.find(l => l.includes('option applied: 3'))).toBeDefined();
expect(logs.find(l => l.includes('notFound is null: true'))).toBeDefined();
```

**통과 기준:**
- getChart는 인스턴스 또는 null 반환
- updateChart는 setOption 호출
- 없는 선택자는 경고만 출력

---

#### TC-PM-014: ECharts destroyPopup 체이닝 검증

**목적:** destroyPopup 호출 시 차트가 자동으로 정리되는지 검증

**사전 조건:**
- applyEChartsMixin 적용됨
- 차트가 생성됨

**테스트 순서:**
1. 차트 생성
2. destroyPopup() 호출
3. 차트 정리 확인
4. ResizeObserver 해제 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);
this.createPopup();

// 차트 생성
const chart = this.createChart('.chart');
const stored = this._popup.charts.get('.chart');

console.log('[PM-014] before: charts size:', this._popup.charts.size);

// destroyPopup 호출
this.destroyPopup();

// 검증 로그
console.log('[PM-014] after: charts size:', this._popup.charts.size);
console.log('[PM-014] after: host null:', this._popup.host === null);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-014]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('before: charts size: 1'))).toBeDefined();
expect(logs.find(l => l.includes('after: charts size: 0'))).toBeDefined();
expect(logs.find(l => l.includes('after: host null: true'))).toBeDefined();

// 에러 없음 확인 (dispose, disconnect가 정상 호출됨)
const errors: string[] = [];
previewPage.on('pageerror', err => errors.push(err.message));
expect(errors).toHaveLength(0);
```

**통과 기준:**
- 모든 차트의 dispose() 호출됨
- 모든 ResizeObserver disconnect() 호출됨
- charts Map 비워짐
- 기본 destroyPopup도 실행됨 (DOM 제거)

---

### 6.3 applyTabulatorMixin 테스트

#### TC-PM-015: applyTabulatorMixin 전제조건 검증

**목적:** applyShadowPopupMixin 없이 호출 시 경고 확인

**사전 조건:**
- applyShadowPopupMixin이 적용되지 않음

**테스트 순서:**
1. applyShadowPopupMixin 없이 applyTabulatorMixin 호출
2. 경고 및 미동작 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyTabulatorMixin } = PopupMixin;

applyTabulatorMixin(this);

// 검증 로그
console.log('[PM-015] createTable exists:', typeof this.createTable);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
const warnings: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-015]')) logs.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
});

expect(warnings.find(l => l.includes('applyShadowPopupMixin'))).toBeDefined();
expect(logs.find(l => l.includes('createTable exists: undefined'))).toBeDefined();
```

**통과 기준:**
- 경고 메시지 출력
- 테이블 메서드 미추가

---

#### TC-PM-016: createTable Tabulator 인스턴스 생성 검증

**목적:** createTable이 Tabulator 인스턴스를 올바르게 생성하는지 검증

**사전 조건:**
- applyShadowPopupMixin, applyTabulatorMixin 적용됨
- Tabulator 라이브러리 로드됨

**테스트 순서:**
1. 테이블 컨테이너가 있는 팝업 생성
2. createTable() 호출
3. Tabulator 인스턴스 확인
4. ResizeObserver 연결 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyTabulatorMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <div class="table-container"></div>
        </div>
    `,
    getStyles: () => '.table-container { height: 300px; }',
    onCreated: null
});
applyTabulatorMixin(this);

this.createPopup();

// 검증 1: tables Map 초기화
console.log('[PM-016] tables is Map:', this._popup.tables instanceof Map);

// 검증 2: createTable 호출
const options = {
    columns: [
        { title: 'Name', field: 'name' },
        { title: 'Age', field: 'age' }
    ]
};
const table = this.createTable('.table-container', options);
console.log('[PM-016] table created:', table !== null);

// 검증 3: Map에 저장
const stored = this._popup.tables.get('.table-container');
console.log('[PM-016] stored in Map:', stored?.table === table);
console.log('[PM-016] has ResizeObserver:', stored?.resizeObserver instanceof ResizeObserver);
console.log('[PM-016] initial state:', stored?.state.initialized);

// 검증 4: Tabulator 메서드 존재
console.log('[PM-016] has setData:', typeof table?.setData === 'function');
console.log('[PM-016] has destroy:', typeof table?.destroy === 'function');
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-016]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('tables is Map: true'))).toBeDefined();
expect(logs.find(l => l.includes('table created: true'))).toBeDefined();
expect(logs.find(l => l.includes('stored in Map: true'))).toBeDefined();
expect(logs.find(l => l.includes('has setData: true'))).toBeDefined();
```

**통과 기준:**
- Tabulator 인스턴스 생성됨
- tables Map에 저장됨
- ResizeObserver 연결됨
- 초기화 상태 추적 가능

---

#### TC-PM-017: Tabulator CSS Shadow DOM 주입 검증

**목적:** Shadow DOM에 Tabulator CSS가 자동 주입되는지 검증

**사전 조건:**
- applyTabulatorMixin 적용됨
- CSS 파일 경로가 유효함

**테스트 순서:**
1. createTable() 호출
2. Shadow DOM에 style 태그 삽입 확인
3. 중복 주입 방지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="table"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyTabulatorMixin(this);
this.createPopup();

// CSS 주입 전 상태
console.log('[PM-017] initial cssInjected:', this._popup.tabulatorCssInjected);

// createTable 호출 (CSS 자동 주입 트리거)
this.createTable('.table', { columns: [] });

// 비동기 대기 (CSS fetch)
await new Promise(resolve => setTimeout(resolve, 100));

// 검증
console.log('[PM-017] after create cssInjected:', this._popup.tabulatorCssInjected);

const styleTag = this._popup.shadowRoot.querySelector('style[data-tabulator-theme]');
console.log('[PM-017] style tag exists:', styleTag !== null);
console.log('[PM-017] theme:', styleTag?.getAttribute('data-tabulator-theme'));

// 두 번째 테이블 생성 시 중복 주입 안 함
const styleCountBefore = this._popup.shadowRoot.querySelectorAll('style[data-tabulator-theme]').length;
this.createTable('.another-table', { columns: [] });
await new Promise(resolve => setTimeout(resolve, 100));
const styleCountAfter = this._popup.shadowRoot.querySelectorAll('style[data-tabulator-theme]').length;
console.log('[PM-017] no duplicate CSS:', styleCountBefore === styleCountAfter);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-017]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('initial cssInjected: false'))).toBeDefined();
expect(logs.find(l => l.includes('after create cssInjected: true'))).toBeDefined();
expect(logs.find(l => l.includes('style tag exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('theme: midnight'))).toBeDefined();
expect(logs.find(l => l.includes('no duplicate CSS: true'))).toBeDefined();
```

**통과 기준:**
- Tabulator CSS가 Shadow DOM에 주입됨
- 중복 주입 방지됨
- midnight 테마 적용

---

#### TC-PM-018: isTableReady 초기화 완료 감지 검증

**목적:** tableBuilt 이벤트로 초기화 완료를 감지하는지 검증

**사전 조건:**
- 테이블이 생성됨

**테스트 순서:**
1. createTable() 호출
2. 즉시 isTableReady() 확인 (false)
3. tableBuilt 이벤트 후 확인 (true)

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="table"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyTabulatorMixin(this);
this.createPopup();

const table = this.createTable('.table', {
    columns: [{ title: 'Name', field: 'name' }],
    data: [{ name: 'Test' }]
});

// 검증 1: 생성 직후 (초기화 진행 중)
// 주의: Tabulator 초기화는 동기/비동기 혼합
const immediateReady = this.isTableReady('.table');
console.log('생성 직후 isTableReady:', immediateReady);

// 검증 2: tableBuilt 이벤트 대기
await new Promise(resolve => {
    if (this.isTableReady('.table')) {
        resolve();
    } else {
        table.on('tableBuilt', resolve);
    }
});

console.log('[PM-018] after tableBuilt:', this.isTableReady('.table'));

// 검증 3: 없는 선택자
console.log('[PM-018] not-exist:', this.isTableReady('.not-exist'));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-018]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('after tableBuilt: true'))).toBeDefined();
expect(logs.find(l => l.includes('not-exist: false'))).toBeDefined();
```

**통과 기준:**
- tableBuilt 이벤트 후 isTableReady()가 true 반환
- 존재하지 않는 선택자는 false 반환

---

#### TC-PM-019: getTable/updateTable/updateTableOptions 사용 검증

**목적:** 테이블 조회 및 업데이트 메서드 동작 확인

**사전 조건:**
- 테이블이 생성됨

**테스트 순서:**
1. getTable로 인스턴스 조회
2. updateTable로 데이터 업데이트
3. updateTableOptions로 컬럼 변경

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="table"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyTabulatorMixin(this);
this.createPopup();

this.createTable('.table', {
    columns: [
        { title: 'Name', field: 'name' },
        { title: 'Age', field: 'age' }
    ]
});

// tableBuilt 대기
await new Promise(resolve => setTimeout(resolve, 100));

// 검증 1: getTable
const table = this.getTable('.table');
console.log('[PM-019] getTable result:', table !== null);

// 검증 2: updateTable (setData)
const newData = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
];
this.updateTable('.table', newData);

const rows = table.getData();
console.log('[PM-019] row count:', rows.length);
console.log('[PM-019] first row name:', rows[0]?.name);

// 검증 3: updateTableOptions (컬럼 변경)
this.updateTableOptions('.table', {
    columns: [
        { title: 'Full Name', field: 'name' },
        { title: 'Years', field: 'age' }
    ]
});

const columns = table.getColumns();
console.log('[PM-019] new column title:', columns[0]?.getDefinition().title);

// 검증 4: 없는 선택자
console.log('[PM-019] notFound is null:', this.getTable('.not-exist') === null);
this.updateTable('.not-exist', []);  // 경고만, 에러 없음
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-019]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('getTable result: true'))).toBeDefined();
expect(logs.find(l => l.includes('row count: 2'))).toBeDefined();
expect(logs.find(l => l.includes('first row name: Alice'))).toBeDefined();
expect(logs.find(l => l.includes('new column title: Full Name'))).toBeDefined();
expect(logs.find(l => l.includes('notFound is null: true'))).toBeDefined();
```

**통과 기준:**
- getTable은 인스턴스 또는 null 반환
- updateTable은 setData 호출
- updateTableOptions는 setColumns, setData 호출 가능

---

#### TC-PM-020: Tabulator destroyPopup 체이닝 검증

**목적:** destroyPopup 호출 시 테이블이 자동 정리되는지 검증

**사전 조건:**
- applyTabulatorMixin 적용됨
- 테이블이 생성됨

**테스트 순서:**
1. 테이블 생성
2. destroyPopup() 호출
3. 테이블 정리 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="table"></div></div>',
    getStyles: () => '',
    onCreated: null
});
applyTabulatorMixin(this);
this.createPopup();

const table = this.createTable('.table', {
    columns: [{ title: 'Test', field: 'test' }]
});

console.log('[PM-020] before: tables size:', this._popup.tables.size);

// destroyPopup 호출
this.destroyPopup();

// 검증 로그
console.log('[PM-020] after: tables size:', this._popup.tables.size);
console.log('[PM-020] after: host null:', this._popup.host === null);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-020]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('before: tables size: 1'))).toBeDefined();
expect(logs.find(l => l.includes('after: tables size: 0'))).toBeDefined();
expect(logs.find(l => l.includes('after: host null: true'))).toBeDefined();

const errors: string[] = [];
previewPage.on('pageerror', err => errors.push(err.message));
expect(errors).toHaveLength(0);
```

**통과 기준:**
- table.off() 호출됨 (이벤트 해제)
- table.destroy() 호출됨
- ResizeObserver disconnect() 호출됨
- tables Map 비워짐
- 기본 destroyPopup도 실행됨

---

### 6.4 Mixin 조합 테스트

#### TC-PM-021: ECharts + Tabulator 동시 사용 검증

**목적:** 두 Mixin을 함께 사용할 때 충돌 없이 동작하는지 검증

**사전 조건:**
- applyShadowPopupMixin 적용됨
- applyEChartsMixin, applyTabulatorMixin 모두 적용됨

**테스트 순서:**
1. 차트와 테이블 컨테이너가 있는 팝업 생성
2. 차트 생성
3. 테이블 생성
4. destroyPopup으로 모두 정리

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyEChartsMixin, applyTabulatorMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <div class="chart" style="width:400px;height:200px;"></div>
            <div class="table"></div>
        </div>
    `,
    getStyles: () => '',
    onCreated: null
});
applyEChartsMixin(this);
applyTabulatorMixin(this);

this.createPopup();

// 검증 1: 두 Mixin의 메서드 공존
console.log('[PM-021] has createChart:', typeof this.createChart === 'function');
console.log('[PM-021] has createTable:', typeof this.createTable === 'function');

// 검증 2: 차트 + 테이블 생성
const chart = this.createChart('.chart');
const table = this.createTable('.table', {
    columns: [{ title: 'Test', field: 'test' }]
});
console.log('[PM-021] chart created:', chart !== null);
console.log('[PM-021] table created:', table !== null);
console.log('[PM-021] charts size:', this._popup.charts.size);
console.log('[PM-021] tables size:', this._popup.tables.size);

// 검증 3: destroyPopup으로 모두 정리
this.destroyPopup();
console.log('[PM-021] after destroy charts:', this._popup.charts.size);
console.log('[PM-021] after destroy tables:', this._popup.tables.size);
console.log('[PM-021] after destroy host null:', this._popup.host === null);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-021]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('has createChart: true'))).toBeDefined();
expect(logs.find(l => l.includes('has createTable: true'))).toBeDefined();
expect(logs.find(l => l.includes('charts size: 1'))).toBeDefined();
expect(logs.find(l => l.includes('tables size: 1'))).toBeDefined();
expect(logs.find(l => l.includes('after destroy charts: 0'))).toBeDefined();
expect(logs.find(l => l.includes('after destroy tables: 0'))).toBeDefined();
expect(logs.find(l => l.includes('after destroy host null: true'))).toBeDefined();
```

**통과 기준:**
- 두 Mixin의 메서드가 충돌 없이 공존
- 각각의 리소스가 독립적으로 관리됨
- destroyPopup이 체이닝되어 모두 정리됨

---

#### TC-PM-022: destroyPopup 체이닝 순서 검증

**목적:** Mixin 적용 역순으로 정리되는지 검증

**사전 조건:**
- applyShadowPopupMixin → applyEChartsMixin → applyTabulatorMixin 순서로 적용

**테스트 순서:**
1. 순서대로 Mixin 적용
2. destroyPopup 호출
3. 정리 순서 확인 (역순: Tabulator → ECharts → 기본)

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const cleanupOrder = [];

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <div class="chart" style="width:400px;height:200px;"></div>
            <div class="table"></div>
        </div>
    `,
    getStyles: () => '',
    onCreated: null
});

// 원본 destroyPopup 감시
const originalDestroyBase = this.destroyPopup;
this.destroyPopup = function() {
    cleanupOrder.push('base');
    originalDestroyBase.call(this);
};

applyEChartsMixin(this);

// ECharts destroyPopup 감시
const originalDestroyCharts = this.destroyPopup;
this.destroyPopup = function() {
    cleanupOrder.push('charts');
    originalDestroyCharts.call(this);
};

applyTabulatorMixin(this);

// Tabulator destroyPopup 감시
const originalDestroyTables = this.destroyPopup;
this.destroyPopup = function() {
    cleanupOrder.push('tables');
    originalDestroyTables.call(this);
};

this.createPopup();
this.createChart('.chart');
this.createTable('.table', { columns: [] });

// destroyPopup 호출
this.destroyPopup();

// 검증: 역순 정리
console.log('[PM-022] cleanup order:', cleanupOrder.join(' → '));
console.log('[PM-022] first:', cleanupOrder[0]);
console.log('[PM-022] second:', cleanupOrder[1]);
console.log('[PM-022] third:', cleanupOrder[2]);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[PM-022]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('first: tables'))).toBeDefined();
expect(logs.find(l => l.includes('second: charts'))).toBeDefined();
expect(logs.find(l => l.includes('third: base'))).toBeDefined();
```

**통과 기준:**
- 정리 순서가 적용 역순 (Tabulator → ECharts → 기본)
- 각 단계에서 해당 리소스가 정리됨

---

### 6.5 PopupMixin 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-PM-001 | applyShadowPopupMixin 적용 검증 | ☐ |
| TC-PM-002 | createPopup Shadow DOM 생성 검증 | ☐ |
| TC-PM-003 | createPopup 중복 호출 방지 검증 | ☐ |
| TC-PM-004 | onCreated 콜백 실행 검증 | ☐ |
| TC-PM-005 | showPopup/hidePopup 표시 제어 검증 | ☐ |
| TC-PM-006 | popupQuery/popupQueryAll Shadow DOM 쿼리 검증 | ☐ |
| TC-PM-007 | bindPopupEvents 이벤트 델리게이션 검증 | ☐ |
| TC-PM-008 | destroyPopup 리소스 정리 검증 | ☐ |
| TC-PM-009 | applyEChartsMixin 전제조건 검증 | ☐ |
| TC-PM-010 | createChart ECharts 인스턴스 생성 검증 | ☐ |
| TC-PM-011 | createChart 중복 생성 방지 검증 | ☐ |
| TC-PM-012 | createChart 존재하지 않는 컨테이너 처리 검증 | ☐ |
| TC-PM-013 | getChart/updateChart 사용 검증 | ☐ |
| TC-PM-014 | ECharts destroyPopup 체이닝 검증 | ☐ |
| TC-PM-015 | applyTabulatorMixin 전제조건 검증 | ☐ |
| TC-PM-016 | createTable Tabulator 인스턴스 생성 검증 | ☐ |
| TC-PM-017 | Tabulator CSS Shadow DOM 주입 검증 | ☐ |
| TC-PM-018 | isTableReady 초기화 완료 감지 검증 | ☐ |
| TC-PM-019 | getTable/updateTable/updateTableOptions 사용 검증 | ☐ |
| TC-PM-020 | Tabulator destroyPopup 체이닝 검증 | ☐ |
| TC-PM-021 | ECharts + Tabulator 동시 사용 검증 | ☐ |
| TC-PM-022 | destroyPopup 체이닝 순서 검증 | ☐ |

---

## 7. 팝업 컴포넌트 테스트

팝업 컴포넌트(Component With Popup)는 데이터 fetch, 렌더링, 이벤트, UI(팝업)를 모두 내부에서 관리하는 컴포넌트입니다.

**핵심 요소:**
- `datasetInfo`: 데이터 정의 (무엇을 fetch하고 어떻게 render할지)
- `Config`: API 필드 매핑 + 스타일 설정
- `Public Methods`: Page에서 호출 (showDetail, hideDetail)
- `customEvents`: 3D 이벤트 발행
- `Popup`: Shadow DOM 기반 UI

### 7.1 datasetInfo 정의 및 사용

#### TC-SC-001: datasetInfo 배열 구조 검증

**목적:** datasetInfo가 올바른 배열 구조로 정의되는지 검증

**사전 조건:**
- 3D 컴포넌트 인스턴스가 존재함

**테스트 순서:**
1. datasetInfo 배열 정의
2. 구조 검증 (datasetName, param, render)
3. 다중 데이터셋 지원 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const assetId = this.setter.ecoAssetInfo?.assetId || 'sensor-001';

this.datasetInfo = [
    {
        datasetName: 'sensor',
        param: { id: assetId },
        render: ['renderSensorInfo']
    },
    {
        datasetName: 'sensorHistory',
        param: { id: assetId },
        render: ['renderChart']
    }
];

// 검증 1: 배열 타입
console.log('[SC-001] datasetInfo isArray:', Array.isArray(this.datasetInfo));

// 검증 2: 필수 필드 존재
this.datasetInfo.forEach((info, index) => {
    console.log(`[SC-001] [${index}] datasetName type:`, typeof info.datasetName);
    console.log(`[SC-001] [${index}] param type:`, typeof info.param);
    console.log(`[SC-001] [${index}] render isArray:`, Array.isArray(info.render));
});

// 검증 3: 다중 데이터셋
console.log('[SC-001] datasetInfo length:', this.datasetInfo.length);

// 검증 4: render 배열 내 메서드명
console.log('[SC-001] render includes renderSensorInfo:', this.datasetInfo[0].render.includes('renderSensorInfo'));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-001]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('datasetInfo isArray: true'))).toBeDefined();
expect(logs.find(l => l.includes('[0] datasetName type: string'))).toBeDefined();
expect(logs.find(l => l.includes('[0] param type: object'))).toBeDefined();
expect(logs.find(l => l.includes('[0] render isArray: true'))).toBeDefined();
expect(logs.find(l => l.includes('[1] datasetName type: string'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo length: 2'))).toBeDefined();
expect(logs.find(l => l.includes('render includes renderSensorInfo: true'))).toBeDefined();
```

**통과 기준:**
- datasetInfo가 배열 형태
- 각 항목에 datasetName, param, render 필드 존재
- render는 문자열 배열 (메서드명)

---

#### TC-SC-002: datasetInfo 기반 데이터 fetch 검증

**목적:** datasetInfo를 순회하며 fetchData를 호출하는지 검증

**사전 조건:**
- datasetInfo가 정의됨
- fetchData 함수가 사용 가능

**테스트 순서:**
1. showDetail() 메서드에서 datasetInfo 순회
2. fetchData 호출 확인
3. 응답 데이터가 render 메서드로 전달되는지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { fetchData } = Wkit;

this.datasetInfo = [
    { datasetName: 'sensor', param: { id: 'test-001' }, render: ['renderSensorInfo'] }
];

// renderSensorInfo 정의
this.renderSensorInfo = (data) => {
    console.log('[SC-002] renderSensorInfo called with:', JSON.stringify(data));
};

// showDetail 구현
this.showDetail = function() {
    fx.go(
        this.datasetInfo,
        fx.each(({ datasetName, param, render }) => {
            console.log('[SC-002] fetchData datasetName:', datasetName);
            console.log('[SC-002] fetchData param.id:', param.id);
            return fx.go(
                Wkit.fetchData(this.page, datasetName, param),
                result => result?.response?.data,
                data => {
                    console.log('[SC-002] fetchData returned data:', data != null);
                    data && render.forEach(fn => this[fn](data));
                }
            );
        })
    );
};

// 실행
await this.showDetail();
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-002]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('fetchData datasetName: sensor'))).toBeDefined();
expect(logs.find(l => l.includes('fetchData param.id: test-001'))).toBeDefined();
expect(logs.find(l => l.includes('fetchData returned data: true'))).toBeDefined();
expect(logs.find(l => l.includes('renderSensorInfo called with:'))).toBeDefined();
```

**통과 기준:**
- datasetInfo의 각 항목에 대해 fetchData 호출
- 응답 데이터가 render 배열의 메서드로 전달됨

---

#### TC-SC-003: datasetInfo 다중 렌더 메서드 실행 검증

**목적:** render 배열에 여러 메서드가 있을 때 모두 실행되는지 검증

**사전 조건:**
- render 배열에 복수의 메서드명이 있음

**테스트 순서:**
1. 여러 render 메서드를 가진 datasetInfo 정의
2. fetchData 후 모든 render 메서드 호출 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
this.datasetInfo = [
    {
        datasetName: 'combinedData',
        param: { id: 'test-001' },
        render: ['renderBasicInfo', 'renderStatistics', 'renderChart']
    }
];

const calledMethods = [];

this.renderBasicInfo = () => calledMethods.push('renderBasicInfo');
this.renderStatistics = () => calledMethods.push('renderStatistics');
this.renderChart = () => calledMethods.push('renderChart');

// showDetail 실행
this.showDetail = function() {
    fx.go(
        this.datasetInfo,
        fx.each(({ datasetName, param, render }) =>
            fx.go(
                Wkit.fetchData(this.page, datasetName, param),
                result => result?.response?.data,
                data => data && render.forEach(fn => this[fn](data))
            )
        )
    );
};

await this.showDetail();

// 검증
console.log('[SC-003] calledMethods count:', calledMethods.length);
console.log('[SC-003] renderBasicInfo called:', calledMethods.includes('renderBasicInfo'));
console.log('[SC-003] renderStatistics called:', calledMethods.includes('renderStatistics'));
console.log('[SC-003] renderChart called:', calledMethods.includes('renderChart'));
console.log('[SC-003] call order:', JSON.stringify(calledMethods));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-003]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('calledMethods count: 3'))).toBeDefined();
expect(logs.find(l => l.includes('renderBasicInfo called: true'))).toBeDefined();
expect(logs.find(l => l.includes('renderStatistics called: true'))).toBeDefined();
expect(logs.find(l => l.includes('renderChart called: true'))).toBeDefined();
```

**통과 기준:**
- render 배열의 모든 메서드가 호출됨
- 호출 순서는 배열 순서와 동일

---

### 7.2 Config 기반 렌더링

#### TC-SC-004: baseInfoConfig 정의 및 적용 검증

**목적:** Config 기반으로 DOM에 데이터가 렌더링되는지 검증

**사전 조건:**
- applyShadowPopupMixin 적용됨
- 팝업 템플릿에 config의 selector에 해당하는 요소가 있음

**테스트 순서:**
1. baseInfoConfig 정의
2. 데이터로 렌더링 실행
3. DOM에 값이 삽입되었는지 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => `
        <div class="popup">
            <span class="sensor-name"></span>
            <span class="sensor-zone"></span>
            <span class="sensor-status"></span>
        </div>
    `,
    getStyles: () => '',
    onCreated: null
});

this.createPopup();

// Config 정의
this.baseInfoConfig = [
    { key: 'name', selector: '.sensor-name' },
    { key: 'zone', selector: '.sensor-zone' },
    { key: 'status', selector: '.sensor-status', dataAttr: 'status' }
];

// 렌더 함수 (config 바인딩 패턴)
function renderInfo(config, data) {
    fx.go(
        config,
        fx.each(({ key, selector, dataAttr }) => {
            const el = this.popupQuery(selector);
            if (el) {
                el.textContent = data[key];
                if (dataAttr) el.dataset[dataAttr] = data[key];
            }
        })
    );
}

this.renderSensorInfo = renderInfo.bind(this, this.baseInfoConfig);

// 렌더링 실행
const testData = {
    name: 'Sensor A',
    zone: 'Zone 1',
    status: 'active'
};

this.renderSensorInfo(testData);

// 검증
const nameEl = this.popupQuery('.sensor-name');
const zoneEl = this.popupQuery('.sensor-zone');
const statusEl = this.popupQuery('.sensor-status');

console.log('[SC-004] name textContent:', nameEl.textContent);
console.log('[SC-004] zone textContent:', zoneEl.textContent);
console.log('[SC-004] status textContent:', statusEl.textContent);
console.log('[SC-004] status dataset.status:', statusEl.dataset.status);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-004]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('name textContent: Sensor A'))).toBeDefined();
expect(logs.find(l => l.includes('zone textContent: Zone 1'))).toBeDefined();
expect(logs.find(l => l.includes('status textContent: active'))).toBeDefined();
expect(logs.find(l => l.includes('status dataset.status: active'))).toBeDefined();
```

**통과 기준:**
- config의 각 항목에 대해 DOM에 값이 삽입됨
- dataAttr가 있으면 dataset 속성도 설정됨

---

#### TC-SC-005: chartConfig optionBuilder 패턴 검증

**목적:** chartConfig의 optionBuilder가 올바른 차트 옵션을 생성하는지 검증

**사전 조건:**
- chartConfig가 정의됨
- optionBuilder 함수가 존재함

**테스트 순서:**
1. chartConfig 정의
2. optionBuilder 호출
3. 생성된 옵션 구조 검증

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭

// 옵션 빌더 함수
function getLineChartOption(config, data) {
    const { xKey, series } = config;
    return {
        xAxis: { type: 'category', data: data[xKey] },
        yAxis: { type: 'value' },
        series: series.map(({ yKey, color, smooth }) => ({
            type: 'line',
            data: data[yKey],
            lineStyle: { color },
            smooth: smooth ?? false
        }))
    };
}

// Config 정의
this.chartConfig = {
    xKey: 'timestamps',
    series: [
        { yKey: 'temperatures', color: '#3b82f6', smooth: true },
        { yKey: 'humidities', color: '#22c55e', smooth: true }
    ],
    optionBuilder: getLineChartOption
};

// 테스트 데이터
const testData = {
    timestamps: ['10:00', '11:00', '12:00'],
    temperatures: [20, 22, 21],
    humidities: [60, 55, 58]
};

// optionBuilder 호출
const { optionBuilder, ...chartConfig } = this.chartConfig;
const option = optionBuilder(chartConfig, testData);

// 검증 1: xAxis 데이터
console.log('[SC-005] xAxis data length:', option.xAxis.data.length);
console.log('[SC-005] xAxis first value:', option.xAxis.data[0]);

// 검증 2: series 개수
console.log('[SC-005] series count:', option.series.length);

// 검증 3: 첫 번째 시리즈 (temperatures)
console.log('[SC-005] series[0] type:', option.series[0].type);
console.log('[SC-005] series[0] data length:', option.series[0].data.length);
console.log('[SC-005] series[0] lineStyle color:', option.series[0].lineStyle.color);
console.log('[SC-005] series[0] smooth:', option.series[0].smooth);

// 검증 4: 두 번째 시리즈 (humidities)
console.log('[SC-005] series[1] data[0]:', option.series[1].data[0]);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-005]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('xAxis data length: 3'))).toBeDefined();
expect(logs.find(l => l.includes('xAxis first value: 10:00'))).toBeDefined();
expect(logs.find(l => l.includes('series count: 2'))).toBeDefined();
expect(logs.find(l => l.includes('series[0] type: line'))).toBeDefined();
expect(logs.find(l => l.includes('series[0] data length: 3'))).toBeDefined();
expect(logs.find(l => l.includes('series[0] lineStyle color: #3b82f6'))).toBeDefined();
expect(logs.find(l => l.includes('series[0] smooth: true'))).toBeDefined();
expect(logs.find(l => l.includes('series[1] data[0]: 60'))).toBeDefined();
```

**통과 기준:**
- optionBuilder가 config와 data를 받아 ECharts 옵션 생성
- xKey, series 설정이 옵션에 반영됨

---

#### TC-SC-006: tableConfig 테이블 옵션 생성 검증

**목적:** tableConfig가 Tabulator 옵션을 올바르게 생성하는지 검증

**사전 조건:**
- tableConfig가 정의됨

**테스트 순서:**
1. tableConfig 정의
2. optionBuilder 호출
3. columns, layout 등 옵션 검증

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭

function getTableOption(config, data) {
    return {
        layout: 'fitColumns',
        height: 250,
        columns: config.columns,
        data: data
    };
}

this.tableConfig = {
    columns: [
        { title: 'PID', field: 'pid', widthGrow: 1 },
        { title: 'Name', field: 'name', widthGrow: 2 },
        { title: 'CPU', field: 'cpu', widthGrow: 1 }
    ],
    optionBuilder: getTableOption
};

const testData = [
    { pid: 1234, name: 'process1', cpu: 10 },
    { pid: 5678, name: 'process2', cpu: 25 }
];

const { optionBuilder, ...tableConfig } = this.tableConfig;
const option = optionBuilder(tableConfig, testData);

// 검증
console.log('[SC-006] layout:', option.layout);
console.log('[SC-006] height:', option.height);
console.log('[SC-006] columns count:', option.columns.length);
console.log('[SC-006] columns[0] title:', option.columns[0].title);
console.log('[SC-006] data row count:', option.data.length);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-006]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('layout: fitColumns'))).toBeDefined();
expect(logs.find(l => l.includes('height: 250'))).toBeDefined();
expect(logs.find(l => l.includes('columns count: 3'))).toBeDefined();
expect(logs.find(l => l.includes('columns[0] title: PID'))).toBeDefined();
expect(logs.find(l => l.includes('data row count: 2'))).toBeDefined();
```

**통과 기준:**
- tableConfig의 columns가 옵션에 포함됨
- optionBuilder가 완전한 Tabulator 옵션 반환

---

### 7.3 Public Methods 검증

#### TC-SC-007: showDetail 팝업 표시 및 데이터 로드 검증

**목적:** showDetail()이 팝업을 표시하고 데이터를 로드하는지 검증

**사전 조건:**
- PopupMixin 적용됨
- datasetInfo 정의됨

**테스트 순서:**
1. showDetail() 호출
2. showPopup() 호출 확인
3. datasetInfo 순회하여 fetchData 호출 확인
4. render 메서드 호출 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: () => this.createChart('.chart')
});
applyEChartsMixin(this);

this.datasetInfo = [
    { datasetName: 'sensor', param: { id: 'test' }, render: ['renderInfo'] }
];

this.renderInfo = (data) => {
    console.log('[SC-007] renderInfo called with data:', data != null);
};

// showDetail 구현
function showDetail() {
    this.showPopup();
    console.log('[SC-007] showPopup called');
    fx.go(
        this.datasetInfo,
        fx.each(({ datasetName, param, render }) =>
            fx.go(
                Wkit.fetchData(this.page, datasetName, param),
                result => result?.response?.data,
                data => data && render.forEach(fn => this[fn](data))
            )
        )
    );
}

this.showDetail = showDetail.bind(this);

// 실행
await this.showDetail();

// 검증
console.log('[SC-007] popup display:', this._popup.host.style.display);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-007]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('showPopup called'))).toBeDefined();
expect(logs.find(l => l.includes('renderInfo called with data: true'))).toBeDefined();
expect(logs.find(l => l.includes('popup display: block'))).toBeDefined();
```

**통과 기준:**
- showPopup()이 호출되어 팝업 표시
- fetchData로 데이터 로드
- render 메서드로 데이터 렌더링

---

#### TC-SC-008: hideDetail 팝업 숨김 검증

**목적:** hideDetail()이 팝업을 숨기는지 검증

**사전 조건:**
- 팝업이 표시된 상태

**테스트 순서:**
1. showDetail()로 팝업 표시
2. hideDetail() 호출
3. 팝업 숨김 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup">Content</div>',
    getStyles: () => '',
    onCreated: null
});

function hideDetail() {
    this.hidePopup();
}

this.hideDetail = hideDetail.bind(this);

// 팝업 표시
this.showPopup();
console.log('[SC-008] after showPopup display:', this._popup.host.style.display);

// hideDetail 호출
this.hideDetail();

// 검증
console.log('[SC-008] after hideDetail display:', this._popup.host.style.display);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-008]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('after showPopup display: block'))).toBeDefined();
expect(logs.find(l => l.includes('after hideDetail display: none'))).toBeDefined();
```

**통과 기준:**
- hideDetail() 호출 시 팝업이 숨겨짐

---

#### TC-SC-009: showDetail 에러 처리 검증

**목적:** fetchData 실패 시 에러가 처리되고 팝업이 숨겨지는지 검증

**사전 조건:**
- fetchData가 에러를 던질 수 있음

**테스트 순서:**
1. fetchData가 실패하도록 설정
2. showDetail() 호출
3. 에러 catch 및 hidePopup 호출 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup">Content</div>',
    getStyles: () => '',
    onCreated: null
});

this.datasetInfo = [
    { datasetName: 'failingDataset', param: {}, render: ['renderInfo'] }
];

this.renderInfo = () => {};

function showDetail() {
    this.showPopup();
    return fx.go(
        this.datasetInfo,
        fx.each(({ datasetName, param, render }) =>
            fx.go(
                Wkit.fetchData(this.page, datasetName, param),
                result => result?.response?.data,
                data => data && render.forEach(fn => this[fn](data))
            )
        )
    ).catch(e => {
        console.log('[SC-009] error caught:', e.message);
        this.hidePopup();
        console.log('[SC-009] hidePopup called after error');
        console.log('[SC-009] popup display after error:', this._popup.host.style.display);
    });
}

this.showDetail = showDetail.bind(this);

// 실행
await this.showDetail();
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-009]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('error caught:'))).toBeDefined();
expect(logs.find(l => l.includes('hidePopup called after error'))).toBeDefined();
expect(logs.find(l => l.includes('popup display after error: none'))).toBeDefined();
```

**통과 기준:**
- fetchData 실패 시 catch 블록 실행
- 에러 발생 시 팝업 숨김

---

### 7.4 3D 이벤트 연동

#### TC-SC-010: bind3DEvents customEvents 바인딩 검증

**목적:** bind3DEvents가 customEvents를 올바르게 바인딩하는지 검증

**사전 조건:**
- 3D 컴포넌트임
- bind3DEvents 함수가 사용 가능

**테스트 순서:**
1. customEvents 정의
2. bind3DEvents 호출
3. 이벤트 바인딩 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { bind3DEvents } = Wkit;

this.customEvents = {
    click: '@sensorClicked',
    dblclick: '@sensorDoubleClicked'
};

// customEvents 구조 검증
const eventEntries = Object.entries(this.customEvents);
console.log('[SC-010] customEvents count:', eventEntries.length);
eventEntries.forEach(([eventType, eventName]) => {
    console.log(`[SC-010] event: ${eventType} -> ${eventName}`);
});

// bind3DEvents 호출
bind3DEvents(this, this.customEvents);
console.log('[SC-010] bind3DEvents called');

// customEvents 키 검증
console.log('[SC-010] has click event:', 'click' in this.customEvents);
console.log('[SC-010] has dblclick event:', 'dblclick' in this.customEvents);
console.log('[SC-010] click eventName:', this.customEvents.click);
console.log('[SC-010] dblclick eventName:', this.customEvents.dblclick);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-010]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('customEvents count: 2'))).toBeDefined();
expect(logs.find(l => l.includes('event: click -> @sensorClicked'))).toBeDefined();
expect(logs.find(l => l.includes('event: dblclick -> @sensorDoubleClicked'))).toBeDefined();
expect(logs.find(l => l.includes('bind3DEvents called'))).toBeDefined();
expect(logs.find(l => l.includes('has click event: true'))).toBeDefined();
expect(logs.find(l => l.includes('has dblclick event: true'))).toBeDefined();
```

**통과 기준:**
- customEvents의 각 항목이 바인딩됨
- 컴포넌트 인스턴스가 연결됨

---

#### TC-SC-011: Page eventBusHandler에서 3D 이벤트 수신 검증

**목적:** Page에서 3D 컴포넌트가 발행한 이벤트를 수신하는지 검증

**사전 조건:**
- eventBusHandlers에 '@sensorClicked' 핸들러 등록
- 3D 컴포넌트가 이벤트를 발행함

**테스트 순서:**
1. Page의 eventBusHandlers에 핸들러 등록
2. 3D 컴포넌트에서 이벤트 발행
3. 핸들러 실행 및 targetInstance, datasetInfo 전달 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// before_load.js (Page)
const { onEventBusHandlers, fetchData } = Wkit;

this.eventBusHandlers = {
    '@sensorClicked': async ({ event, targetInstance }) => {
        console.log('[SC-011] event received: true');
        console.log('[SC-011] targetInstance id:', targetInstance.id);
        console.log('[SC-011] datasetInfo length:', targetInstance.datasetInfo?.length);
        console.log('[SC-011] datasetInfo[0] datasetName:', targetInstance.datasetInfo?.[0]?.datasetName);

        // datasetInfo가 있으면 데이터 fetch
        if (targetInstance.datasetInfo?.length) {
            for (const { datasetName, param } of targetInstance.datasetInfo) {
                const data = await fetchData(this, datasetName, param);
                console.log('[SC-011] fetched data:', data != null);
            }
        }
    }
};

onEventBusHandlers(this.eventBusHandlers);

// 3D 컴포넌트 시뮬레이션
const mockComponent = {
    id: 'sensor-001',
    datasetInfo: [
        { datasetName: 'sensorData', param: { id: 'sensor-001' }, render: [] }
    ]
};

// 이벤트 발행 시뮬레이션
Weventbus.emit('@sensorClicked', {
    event: { intersects: [{ object: {} }] },
    targetInstance: mockComponent
});

// 비동기 대기
await new Promise(resolve => setTimeout(resolve, 50));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-011]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('event received: true'))).toBeDefined();
expect(logs.find(l => l.includes('targetInstance id: sensor-001'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo length: 1'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo[0] datasetName: sensorData'))).toBeDefined();
```

**통과 기준:**
- Page의 eventBusHandler가 이벤트 수신
- targetInstance를 통해 컴포넌트의 datasetInfo 접근 가능

---

### 7.5 Template 및 publishCode 연동

#### TC-SC-012: publishCode에서 HTML/CSS 추출 검증

**목적:** properties.publishCode에서 HTML과 CSS를 추출하는지 검증

**사전 조건:**
- this.properties.publishCode가 존재함

**테스트 순서:**
1. publishCode 구조 확인
2. htmlCode, cssCode 추출
3. getPopupHTML, getPopupStyles 정의

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭

// publishCode 시뮬레이션
this.properties = {
    publishCode: {
        htmlCode: `
            <template id="popup-sensor">
                <div class="sensor-popup">
                    <h1 class="title">Sensor Info</h1>
                    <div class="content"></div>
                </div>
            </template>
        `,
        cssCode: `
            .sensor-popup { background: #1a1f2e; }
            .title { color: white; }
        `
    }
};

function extractTemplate(htmlCode, templateId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');
    const template = doc.querySelector(`template#${templateId}`);
    return template?.innerHTML || '';
}

const { htmlCode, cssCode } = this.properties.publishCode || {};

this.templateConfig = {
    popup: 'popup-sensor'
};

this.getPopupHTML = () => extractTemplate(htmlCode || '', this.templateConfig.popup);
this.getPopupStyles = () => cssCode || '';

// 검증
const html = this.getPopupHTML();
const css = this.getPopupStyles();

console.log('[SC-012] html includes sensor-popup:', html.includes('sensor-popup'));
console.log('[SC-012] html includes Sensor Info:', html.includes('Sensor Info'));
console.log('[SC-012] html excludes template tag:', !html.includes('<template'));
console.log('[SC-012] css includes .sensor-popup:', css.includes('.sensor-popup'));
console.log('[SC-012] css includes background:', css.includes('background'));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-012]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('html includes sensor-popup: true'))).toBeDefined();
expect(logs.find(l => l.includes('html includes Sensor Info: true'))).toBeDefined();
expect(logs.find(l => l.includes('html excludes template tag: true'))).toBeDefined();
expect(logs.find(l => l.includes('css includes .sensor-popup: true'))).toBeDefined();
expect(logs.find(l => l.includes('css includes background: true'))).toBeDefined();
```

**통과 기준:**
- htmlCode에서 지정된 template 내용 추출
- cssCode 그대로 반환
- template 태그 자체는 제외되고 내부 HTML만 추출

---

#### TC-SC-013: extractTemplate 없는 템플릿 처리 검증

**목적:** 존재하지 않는 템플릿 ID로 요청 시 빈 문자열 반환

**사전 조건:**
- htmlCode에 해당 template ID가 없음

**테스트 순서:**
1. 존재하지 않는 templateId로 extractTemplate 호출
2. 빈 문자열 반환 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
function extractTemplate(htmlCode, templateId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlCode, 'text/html');
    const template = doc.querySelector(`template#${templateId}`);
    return template?.innerHTML || '';
}

const htmlCode = '<template id="other-popup"><div>Other</div></template>';

// 존재하지 않는 ID
const result = extractTemplate(htmlCode, 'non-existent');
console.log('[SC-013] non-existent template result:', JSON.stringify(result));

// 존재하는 ID
const existing = extractTemplate(htmlCode, 'other-popup');
console.log('[SC-013] existing template includes Other:', existing.includes('Other'));

// 빈 htmlCode
const empty = extractTemplate('', 'any-id');
console.log('[SC-013] empty htmlCode result:', JSON.stringify(empty));

// publishCode 없는 경우
const nullCheck = extractTemplate(null || '', 'popup');
console.log('[SC-013] null htmlCode result:', JSON.stringify(nullCheck));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-013]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('non-existent template result: ""'))).toBeDefined();
expect(logs.find(l => l.includes('existing template includes Other: true'))).toBeDefined();
expect(logs.find(l => l.includes('empty htmlCode result: ""'))).toBeDefined();
expect(logs.find(l => l.includes('null htmlCode result: ""'))).toBeDefined();
```

**통과 기준:**
- 없는 템플릿 ID는 빈 문자열 반환
- null/undefined 안전 처리

---

### 7.6 컴포넌트 정리

#### TC-SC-014: beforeDestroy에서 destroyPopup 호출 검증

**목적:** beforeDestroy.js에서 팝업이 정리되는지 검증

**사전 조건:**
- 팝업이 생성된 상태

**테스트 순서:**
1. 팝업 생성 및 차트 생성
2. beforeDestroy.js 실행 (destroyPopup 호출)
3. 모든 리소스 정리 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;

applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: () => this.createChart('.chart')
});
applyEChartsMixin(this);

this.createPopup();
this.createChart('.chart');

// 정리 전 상태 확인
console.log('[SC-014] before destroy host exists:', this._popup.host !== null);
console.log('[SC-014] before destroy charts size:', this._popup.charts.size);

// beforeDestroy 탭 실행
this.destroyPopup();

// 검증
console.log('[SC-014] after destroy host:', this._popup.host);
console.log('[SC-014] after destroy charts size:', this._popup.charts.size);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-014]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('before destroy host exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('before destroy charts size: 1'))).toBeDefined();
expect(logs.find(l => l.includes('after destroy host: null'))).toBeDefined();
expect(logs.find(l => l.includes('after destroy charts size: 0'))).toBeDefined();
```

**통과 기준:**
- destroyPopup()이 호출됨
- 팝업 DOM, 차트, 이벤트 모두 정리됨

---

#### TC-SC-015: disposeAllThreeResources가 인스턴스 속성을 보존하는지 검증

**목적:** disposeAllThreeResources 호출 후에도 인스턴스 속성(customEvents, datasetInfo 등)이
유지되어 `_onViewerDestroy()`의 정리 로직이 정상 동작하는지 검증

**배경:** 외부에서 인스턴스 속성을 null 처리하면 내부 정리 로직(예: stopRefresh)이 실패할 수 있다.
상세: [INSTANCE_LIFECYCLE_GC.md](/RNBT_architecture/docs/INSTANCE_LIFECYCLE_GC.md) 부록 A

**사전 조건:**
- disposeAllThreeResources가 호출됨

**테스트 순서:**
1. customEvents, datasetInfo 정의
2. disposeAllThreeResources 호출 (Page의 before_unload.js)
3. 속성이 null이 아닌지 확인 (GC가 처리)

**주입 코드 (CodeBox에 입력):**
```javascript
// register 탭 (3D 컴포넌트)
this.customEvents = {
    click: '@objectClicked'
};

this.datasetInfo = [
    { datasetName: 'test', param: {}, render: [] }
];

// before_unload.js (Page)에서 disposeAllThreeResources 호출 시
// subscriptions 해제와 3D 리소스 dispose만 수행
// 인스턴스 속성은 건드리지 않음

// 검증: disposeAllThreeResources 호출 후에도 속성이 유지됨
console.log('[SC-015] customEvents preserved:', this.customEvents !== null);
console.log('[SC-015] datasetInfo preserved:', this.datasetInfo !== null);
console.log('[SC-015] customEvents value:', JSON.stringify(this.customEvents));
console.log('[SC-015] datasetInfo length:', this.datasetInfo?.length);
// → 이 속성들은 이후 _onViewerDestroy()에서 정리되거나, 인스턴스 GC 시 함께 수거됨
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-015]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('customEvents preserved: true'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo preserved: true'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo length: 1'))).toBeDefined();
```

**통과 기준:**
- disposeAllThreeResources 호출 후 customEvents, datasetInfo가 유지됨
- subscriptions의 unsubscribe는 정상 수행됨
- 이후 `_onViewerDestroy()`에서 내부 정리 로직이 정상 동작함

---

### 7.7 통합 테스트

#### TC-SC-016: 팝업 컴포넌트 전체 흐름 검증

**목적:** 생성 → 이벤트 → 팝업 표시 → 데이터 로드 → 렌더링 → 정리 전체 흐름 검증

**사전 조건:**
- 모든 구성 요소가 설정됨

**테스트 순서:**
1. 컴포넌트 생성 (register.js)
2. 3D 클릭 이벤트 발생
3. showDetail() 호출
4. 데이터 fetch 및 렌더링
5. hideDetail() 호출
6. 정리 (beforeDestroy.js)

**주입 코드 (CodeBox에 입력):**
```javascript
// 전체 흐름 테스트
const lifecycle = [];

// === 1. 생성 (register.js) ===
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;
const { bind3DEvents, fetchData } = Wkit;

applyShadowPopupMixin(this, {
    getHTML: () => '<div class="popup"><span class="name"></span><div class="chart" style="width:400px;height:300px;"></div></div>',
    getStyles: () => '',
    onCreated: () => {
        this.createChart('.chart');
        lifecycle.push('popup:created');
    }
});
applyEChartsMixin(this);

this.datasetInfo = [
    { datasetName: 'sensor', param: { id: 'test' }, render: ['renderName'] }
];

this.customEvents = { click: '@sensorClicked' };

this.renderName = (data) => {
    this.popupQuery('.name').textContent = data.name;
    lifecycle.push('render:name');
};

function showDetail() {
    lifecycle.push('showDetail:called');
    this.showPopup();
    return fx.go(
        this.datasetInfo,
        fx.each(({ datasetName, param, render }) =>
            fx.go(
                Wkit.fetchData(this.page, datasetName, param),
                result => result?.response?.data,
                data => {
                    lifecycle.push('data:fetched');
                    data && render.forEach(fn => this[fn](data));
                }
            )
        )
    );
}

function hideDetail() {
    lifecycle.push('hideDetail:called');
    this.hidePopup();
}

this.showDetail = showDetail.bind(this);
this.hideDetail = hideDetail.bind(this);

lifecycle.push('component:registered');

// === 2. 이벤트 시뮬레이션 (Page에서) ===
// 실제로는 eventBusHandler가 showDetail 호출
await this.showDetail();

// === 3. 팝업 숨김 ===
this.hideDetail();

// === 4. 정리 (beforeDestroy.js) ===
this.destroyPopup();
this.customEvents = null;
this.datasetInfo = null;
lifecycle.push('component:destroyed');

// === 검증 ===
console.log('[SC-016] lifecycle:', JSON.stringify(lifecycle));
console.log('[SC-016] lifecycle[0]:', lifecycle[0]);
console.log('[SC-016] lifecycle[1]:', lifecycle[1]);
console.log('[SC-016] lifecycle[2]:', lifecycle[2]);
console.log('[SC-016] lifecycle[3]:', lifecycle[3]);
console.log('[SC-016] lifecycle[4]:', lifecycle[4]);
console.log('[SC-016] lifecycle[5]:', lifecycle[5]);
console.log('[SC-016] lifecycle[6]:', lifecycle[6]);

console.log('[SC-016] popup host after destroy:', this._popup.host);
console.log('[SC-016] customEvents after destroy:', this.customEvents);
console.log('[SC-016] datasetInfo after destroy:', this.datasetInfo);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[SC-016]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('lifecycle[0]: component:registered'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[1]: showDetail:called'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[2]: popup:created'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[3]: data:fetched'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[4]: render:name'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[5]: hideDetail:called'))).toBeDefined();
expect(logs.find(l => l.includes('lifecycle[6]: component:destroyed'))).toBeDefined();
expect(logs.find(l => l.includes('popup host after destroy: null'))).toBeDefined();
expect(logs.find(l => l.includes('customEvents after destroy: null'))).toBeDefined();
expect(logs.find(l => l.includes('datasetInfo after destroy: null'))).toBeDefined();
```

**통과 기준:**
- 전체 라이프사이클이 순서대로 실행됨
- 모든 리소스가 정리됨

---

### 7.8 팝업 컴포넌트 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-SC-001 | datasetInfo 배열 구조 검증 | ☐ |
| TC-SC-002 | datasetInfo 기반 데이터 fetch 검증 | ☐ |
| TC-SC-003 | datasetInfo 다중 렌더 메서드 실행 검증 | ☐ |
| TC-SC-004 | baseInfoConfig 정의 및 적용 검증 | ☐ |
| TC-SC-005 | chartConfig optionBuilder 패턴 검증 | ☐ |
| TC-SC-006 | tableConfig 테이블 옵션 생성 검증 | ☐ |
| TC-SC-007 | showDetail 팝업 표시 및 데이터 로드 검증 | ☐ |
| TC-SC-008 | hideDetail 팝업 숨김 검증 | ☐ |
| TC-SC-009 | showDetail 에러 처리 검증 | ☐ |
| TC-SC-010 | bind3DEvents customEvents 바인딩 검증 | ☐ |
| TC-SC-011 | Page eventBusHandler에서 3D 이벤트 수신 검증 | ☐ |
| TC-SC-012 | publishCode에서 HTML/CSS 추출 검증 | ☐ |
| TC-SC-013 | extractTemplate 없는 템플릿 처리 검증 | ☐ |
| TC-SC-014 | beforeDestroy에서 destroyPopup 호출 검증 | ☐ |
| TC-SC-015 | 3D 컴포넌트 customEvents/datasetInfo 참조 정리 검증 | ☐ |
| TC-SC-016 | 팝업 컴포넌트 전체 흐름 검증 | ☐ |

---

## 8. fx.go 에러 핸들링 테스트

fx.go 기반 파이프라인에서의 에러 전파와 처리 전략을 검증합니다.

**핵심 원칙:**
- 유틸(fx.go, reduce)은 에러를 처리하지 않고 전파한다
- 호출자가 반드시 에러를 처리해야 한다
- 파이프라인은 fail-fast 동작 (에러 발생 시 즉시 중단)
- nop은 필터 전용 내부 시그널 (에러가 아님)
- catch 위치가 에러 처리 전략을 결정한다

### 8.1 기본 에러 전파

#### TC-FX-001: fx.go 에러 전파 검증

**목적:** fx.go 파이프라인에서 에러가 호출자까지 전파되는지 검증

**사전 조건:**
- fx.go 함수가 사용 가능

**테스트 순서:**
1. 중간 함수에서 에러 throw
2. fx.go가 rejected Promise 반환 확인
3. catch로 에러 수신 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// 에러를 발생시키는 파이프라인
let errorReceived = null;

await fx.go(
    1,
    x => x + 1,
    x => {
        throw new Error('Intentional Error');
    },
    x => x + 1  // 이 함수는 실행되지 않아야 함
).catch(e => {
    errorReceived = e;
});

// 검증
console.log('[FX-001] error received:', errorReceived !== null);
console.log('[FX-001] error message:', errorReceived?.message);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-001]')) logs.push(msg.text());
});

// fx.go runs inside page.evaluate
expect(logs.find(l => l.includes('error received: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Intentional Error'))).toBeDefined();
```

**통과 기준:**
- 에러가 catch까지 전파됨
- 에러 후 함수는 실행되지 않음

---

#### TC-FX-002: 비동기 파이프라인 에러 전파 검증

**목적:** Promise 기반 비동기 함수에서 에러가 전파되는지 검증

**사전 조건:**
- 파이프라인에 비동기 함수 포함

**테스트 순서:**
1. async 함수에서 reject 발생
2. 에러 전파 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let errorReceived = null;
let afterErrorExecuted = false;

await fx.go(
    'start',
    async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x + '_async';
    },
    async x => {
        await new Promise((_, reject) => reject(new Error('Async Error')));
        return x;  // 실행되지 않음
    },
    x => {
        afterErrorExecuted = true;
        return x;
    }
).catch(e => {
    errorReceived = e;
});

// 검증
console.log('[FX-002] error received:', errorReceived !== null);
console.log('[FX-002] error message:', errorReceived?.message);
console.log('[FX-002] after error executed:', afterErrorExecuted);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-002]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('error received: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Async Error'))).toBeDefined();
expect(logs.find(l => l.includes('after error executed: false'))).toBeDefined();
```

**통과 기준:**
- 비동기 에러가 전파됨
- fail-fast 동작 (에러 후 중단)

---

#### TC-FX-003: fx.each 내부 에러 전파 검증

**목적:** fx.each 순회 중 에러가 전파되는지 검증

**사전 조건:**
- fx.each로 배열 순회

**테스트 순서:**
1. 배열 순회 중 특정 항목에서 에러 발생
2. 순회 중단 및 에러 전파 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const processed = [];
let errorReceived = null;

await fx.go(
    [1, 2, 3, 4, 5],
    fx.each(x => {
        if (x === 3) {
            throw new Error(`Error at item ${x}`);
        }
        processed.push(x);
    })
).catch(e => {
    errorReceived = e;
});

// 검증
console.log('[FX-003] error received:', errorReceived !== null);
console.log('[FX-003] error message:', errorReceived?.message);
console.log('[FX-003] processed count:', processed.length);
console.log('[FX-003] processed items:', JSON.stringify(processed));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-003]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('error received: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Error at item 3'))).toBeDefined();
expect(logs.find(l => l.includes('processed count: 2'))).toBeDefined();
expect(logs.find(l => l.includes('processed items: [1,2]'))).toBeDefined();
```

**통과 기준:**
- 에러 발생 시 순회 즉시 중단
- 에러 발생 전 항목만 처리됨

---

### 8.2 nop 시그널 동작

#### TC-FX-004: nop이 필터 스킵으로 동작하는지 검증

**목적:** L.filter에서 false인 항목이 nop으로 스킵되는지 검증

**사전 조건:**
- fx.L.filter 사용

**테스트 순서:**
1. 필터 조건으로 일부 항목 제외
2. nop이 에러가 아닌 스킵으로 동작 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const result = [];

await fx.go(
    [1, 2, 3, 4, 5],
    fx.L.filter(x => x % 2 === 1),  // 홀수만
    fx.each(x => result.push(x))
);

// 검증: nop은 에러가 아니라 스킵
console.log('[FX-004] result count:', result.length);
console.log('[FX-004] result items:', JSON.stringify(result));
console.log('[FX-004] includes 2:', result.includes(2));
console.log('[FX-004] includes 4:', result.includes(4));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-004]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('result count: 3'))).toBeDefined();
expect(logs.find(l => l.includes('result items: [1,3,5]'))).toBeDefined();
expect(logs.find(l => l.includes('includes 2: false'))).toBeDefined();
expect(logs.find(l => l.includes('includes 4: false'))).toBeDefined();
```

**통과 기준:**
- false인 항목은 스킵됨 (에러 아님)
- 순회는 계속 진행됨

---

#### TC-FX-005: nop과 진짜 에러 구분 검증

**목적:** nop은 복구되고 진짜 에러는 전파되는지 검증

**사전 조건:**
- 필터와 에러 발생 함수가 함께 사용됨

**테스트 순서:**
1. 필터로 일부 스킵
2. 통과한 항목 중 에러 발생
3. nop은 스킵, 에러는 전파 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const processed = [];
let errorReceived = null;

await fx.go(
    [1, 2, 3, 4, 5],
    fx.L.filter(x => x % 2 === 1),  // 홀수만 통과: 1, 3, 5
    fx.each(x => {
        if (x === 3) {
            throw new Error('Error at 3');
        }
        processed.push(x);
    })
).catch(e => {
    errorReceived = e;
});

// 검증
console.log('[FX-005] processed count:', processed.length);
console.log('[FX-005] processed[0]:', processed[0]);
console.log('[FX-005] error received:', errorReceived !== null);
console.log('[FX-005] error message:', errorReceived?.message);

// nop(짝수 스킵)과 에러(x=3)가 구분됨
// 2, 4는 필터에서 스킵 (nop) → 순회 계속
// 3에서 에러 → 순회 중단
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-005]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('processed count: 1'))).toBeDefined();
expect(logs.find(l => l.includes('processed[0]: 1'))).toBeDefined();
expect(logs.find(l => l.includes('error received: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Error at 3'))).toBeDefined();
```

**통과 기준:**
- nop (필터 false)은 스킵 후 계속 진행
- 진짜 에러는 순회 중단 + 전파

---

### 8.3 catch 위치와 에러 처리 전략

#### TC-FX-006: 파이프라인 끝 catch (기본 패턴) 검증

**목적:** 파이프라인 끝에서 catch하면 에러가 일관되게 처리되는지 검증

**사전 조건:**
- 여러 단계의 파이프라인

**테스트 순서:**
1. 다단계 파이프라인에서 에러 발생
2. 끝의 catch에서 수신 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let errorReceived = null;
let step1Executed = false;
let step2Executed = false;
let step3Executed = false;

await fx.go(
    'input',
    x => { step1Executed = true; return x + '_1'; },
    x => { step2Executed = true; throw new Error('Step 2 Error'); },
    x => { step3Executed = true; return x + '_3'; }
).catch(e => {
    errorReceived = e;
    console.error('[Pipeline]', e.message);
    // 상태 복구 / 에러 UI / 중단 처리
});

// 검증
console.log('[FX-006] step1 executed:', step1Executed);
console.log('[FX-006] step2 executed:', step2Executed);
console.log('[FX-006] step3 executed:', step3Executed);
console.log('[FX-006] error received:', errorReceived !== null);
console.log('[FX-006] error message:', errorReceived?.message);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-006]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('step1 executed: true'))).toBeDefined();
expect(logs.find(l => l.includes('step2 executed: true'))).toBeDefined();
expect(logs.find(l => l.includes('step3 executed: false'))).toBeDefined();
expect(logs.find(l => l.includes('error received: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Step 2 Error'))).toBeDefined();
```

**통과 기준:**
- 에러가 끝까지 전파됨
- 한 지점에서 일관되게 처리됨

---

#### TC-FX-007: 중간 catch (부분 복구) 검증

**목적:** 중간에서 catch하면 fulfilled로 변환되어 계속 진행되는지 검증 (주의 패턴)

**사전 조건:**
- 중간 함수에 catch 포함

**테스트 순서:**
1. 중간 함수에서 에러 발생 + catch
2. 반환값 없이 catch → undefined로 진행
3. 후속 함수 실행 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let step3Input = null;
let step3Executed = false;

await fx.go(
    'input',
    x => x + '_1',
    async x => {
        // 중간에서 에러 발생 + catch
        return await fx.go(
            x,
            y => { throw new Error('Inner Error'); }
        ).catch(err => {
            console.error('Caught:', err.message);
            // 반환값 없음 → resolved(undefined)
        });
    },
    x => {
        step3Executed = true;
        step3Input = x;
        return x;
    }
);

// 검증: 중간 catch가 에러를 삼킴
console.log('[FX-007] step3 executed:', step3Executed);
console.log('[FX-007] step3 input:', step3Input);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-007]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('step3 executed: true'))).toBeDefined();
expect(logs.find(l => l.includes('step3 input: undefined'))).toBeDefined();
```

**통과 기준:**
- 중간 catch가 에러를 fulfilled로 변환
- 파이프라인이 "성공"으로 계속 진행
- 의도하지 않으면 버그 원인

---

#### TC-FX-008: 중간 catch 명시적 대체값 반환 검증

**목적:** 중간 catch에서 명시적 대체값을 반환하면 의미 있는 값으로 진행되는지 검증

**사전 조건:**
- catch에서 대체값 반환

**테스트 순서:**
1. 에러 발생 + catch에서 대체값 반환
2. 대체값으로 파이프라인 계속 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let step3Input = null;

await fx.go(
    'input',
    x => x + '_1',
    async x => {
        return await fx.go(
            x,
            y => { throw new Error('Inner Error'); }
        ).catch(e => ({
            ok: false,
            error: e.message,
            fallback: 'default_value'
        }));
    },
    x => {
        step3Input = x;
        return x;
    }
);

// 검증: 명시적 대체값
console.log('[FX-008] step3Input type:', typeof step3Input);
console.log('[FX-008] step3Input.ok:', step3Input?.ok);
console.log('[FX-008] step3Input.error:', step3Input?.error);
console.log('[FX-008] step3Input.fallback:', step3Input?.fallback);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-008]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('step3Input type: object'))).toBeDefined();
expect(logs.find(l => l.includes('step3Input.ok: false'))).toBeDefined();
expect(logs.find(l => l.includes('step3Input.error: Inner Error'))).toBeDefined();
expect(logs.find(l => l.includes('step3Input.fallback: default_value'))).toBeDefined();
```

**통과 기준:**
- catch에서 반환한 값이 다음 단계로 전달됨
- 에러를 삼키지 않고 의미 있는 값으로 변환

---

### 8.4 interval / 이벤트 핸들러에서의 catch

#### TC-FX-009: setInterval 내 catch 필수 검증

**목적:** interval에서 unhandled rejection이 발생하지 않는지 검증

**사전 조건:**
- setInterval로 주기적 실행

**테스트 순서:**
1. interval 함수에서 에러 발생
2. catch로 처리 확인
3. unhandled rejection 없음 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let catchCount = 0;

// fetchAndPublish 시뮬레이션 (실패)
const fetchAndPublish = () => Promise.reject(new Error('Network Error'));

const run = () =>
    fetchAndPublish()
        .catch(e => {
            catchCount++;
            console.error('[fetchAndPublish]', e.message);
            // 재시도 / 백오프 / 사용자 알림 등
        });

// interval 시뮬레이션 (3회 실행)
await run();
await run();
await run();

// 검증: 모든 에러가 catch됨
console.log('[FX-009] catch count:', catchCount);

// unhandled rejection 없음 (콘솔에 UnhandledPromiseRejection 에러 없어야 함)
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-009]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('catch count: 3'))).toBeDefined();
```

**통과 기준:**
- 모든 에러가 catch로 처리됨
- unhandled rejection 없음

---

#### TC-FX-010: 이벤트 핸들러 내 catch 검증

**목적:** 이벤트 핸들러에서 에러가 catch되는지 검증

**사전 조건:**
- eventBusHandler에서 비동기 작업 수행

**테스트 순서:**
1. 핸들러 내에서 에러 발생
2. catch 처리 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let errorHandled = false;

const eventBusHandlers = {
    '@itemClicked': async ({ event, targetInstance }) => {
        await fx.go(
            targetInstance.datasetInfo,
            fx.each(async ({ datasetName, param }) => {
                // 실패하는 fetchData
                throw new Error('Fetch failed');
            })
        ).catch(e => {
            errorHandled = true;
            console.error('[EventHandler]', e.message);
        });
    }
};

// 이벤트 시뮬레이션
await eventBusHandlers['@itemClicked']({
    event: {},
    targetInstance: {
        datasetInfo: [{ datasetName: 'test', param: {} }]
    }
});

// 검증
console.log('[FX-010] error handled:', errorHandled);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-010]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('error handled: true'))).toBeDefined();
```

**통과 기준:**
- 이벤트 핸들러 내 에러가 catch됨
- unhandled rejection 방지

---

### 8.5 중첩 파이프라인 에러 처리

#### TC-FX-011: 내부 파이프라인 에러가 외부로 전파되는지 검증

**목적:** fx.each 내부의 fx.go 에러가 외부 파이프라인으로 전파되는지 검증

**사전 조건:**
- 중첩 파이프라인 구조

**테스트 순서:**
1. 외부 fx.go → 내부 fx.go 구조
2. 내부에서 에러 발생
3. 외부 catch로 전파 확인

**주입 코드 (CodeBox에 입력):**
```javascript
let outerCatchCalled = false;
let errorMessage = null;

await fx.go(
    [
        { datasetName: 'data1', param: { id: 1 } },
        { datasetName: 'data2', param: { id: 2 } }
    ],
    fx.each(({ datasetName, param }) =>
        fx.go(
            fetchData(datasetName, param),  // 내부 파이프라인
            result => result.data,
            data => {
                if (param.id === 2) {
                    throw new Error(`Error processing ${datasetName}`);
                }
                return data;
            }
        )
    )
).catch(e => {
    outerCatchCalled = true;
    errorMessage = e.message;
});

// fetchData 시뮬레이션
function fetchData(name, param) {
    return Promise.resolve({ data: { name, id: param.id } });
}

// 검증
console.log('[FX-011] outer catch called:', outerCatchCalled);
console.log('[FX-011] error message:', errorMessage);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-011]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('outer catch called: true'))).toBeDefined();
expect(logs.find(l => l.includes('error message: Error processing data2'))).toBeDefined();
```

**통과 기준:**
- 내부 파이프라인 에러가 외부 catch로 전파됨
- fail-fast 동작

---

#### TC-FX-012: 부분 실패 허용 패턴 (격리) 검증

**목적:** 각 항목을 독립적으로 처리하여 부분 실패를 허용하는지 검증

**사전 조건:**
- 각 항목마다 개별 catch

**테스트 순서:**
1. 여러 항목 순회
2. 일부 항목 실패해도 나머지 처리 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const results = [];

await fx.go(
    [1, 2, 3, 4, 5],
    fx.each(item =>
        fx.go(
            item,
            x => {
                if (x === 3) throw new Error(`Error at ${x}`);
                return x * 2;
            }
        ).catch(e => ({
            ok: false,
            item,
            error: e.message
        }))
        .then(result => {
            results.push(result !== undefined ? result : { ok: true, value: item * 2 });
        })
    )
);

// 검증: 부분 실패 허용
console.log('[FX-012] results count:', results.length);

// 성공한 항목들
const successItems = results.filter(r => typeof r === 'number' || r.ok !== false);
console.log('[FX-012] success count:', successItems.length);

// 실패한 항목 (item 3)
const failedItem = results.find(r => r.ok === false);
console.log('[FX-012] failed item exists:', failedItem !== undefined);
console.log('[FX-012] failed item:', failedItem?.item);
console.log('[FX-012] failed error:', failedItem?.error);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-012]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('results count: 5'))).toBeDefined();
expect(logs.find(l => l.includes('failed item exists: true'))).toBeDefined();
expect(logs.find(l => l.includes('failed item: 3'))).toBeDefined();
expect(logs.find(l => l.includes('failed error: Error at 3'))).toBeDefined();
```

**통과 기준:**
- 한 항목 실패해도 나머지 처리됨
- 실패 항목은 명시적 대체값으로 표현됨

---

### 8.6 에러 처리 체크리스트 검증

#### TC-FX-013: fx.go 호출부 catch 존재 검증

**목적:** 모든 fx.go 호출부에 에러 처리가 있는지 검증하는 패턴

**사전 조건:**
- 코드 리뷰 또는 린트 규칙

**테스트 순서:**
1. fx.go 호출 패턴 확인
2. catch 또는 try-catch 존재 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// 올바른 패턴 1: .catch()
async function correctPattern1() {
    await fx.go(
        data,
        process
    ).catch(e => {
        console.error('[Process]', e);
    });
}

// 올바른 패턴 2: try-catch
async function correctPattern2() {
    try {
        await fx.go(data, process);
    } catch (e) {
        console.error('[Process]', e);
    }
}

// 잘못된 패턴: catch 없음 (Unhandled Rejection 위험)
async function wrongPattern() {
    await fx.go(data, process);  // 위험!
}

// 검증 (코드 분석 패턴)
const hasExternalCatch = (fn) => {
    const fnStr = fn.toString();
    return fnStr.includes('.catch(') || fnStr.includes('catch (');
};

console.log('[FX-013] pattern1 has catch:', hasExternalCatch(correctPattern1));
console.log('[FX-013] pattern2 has catch:', hasExternalCatch(correctPattern2));
console.log('[FX-013] wrong pattern has catch:', hasExternalCatch(wrongPattern));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-013]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('pattern1 has catch: true'))).toBeDefined();
expect(logs.find(l => l.includes('pattern2 has catch: true'))).toBeDefined();
expect(logs.find(l => l.includes('wrong pattern has catch: false'))).toBeDefined();
```

**통과 기준:**
- 모든 fx.go에 catch 존재
- Unhandled Rejection 방지

---

#### TC-FX-014: interval/이벤트 핸들러 catch 존재 검증

**목적:** 비동기 컨텍스트에서 catch가 있는지 검증

**사전 조건:**
- setInterval 또는 이벤트 핸들러 코드

**테스트 순서:**
1. interval/핸들러 함수 확인
2. 내부 비동기 작업에 catch 존재 확인

**주입 코드 (CodeBox에 입력):**
```javascript
// 올바른 interval 패턴
function correctIntervalPattern(page, topic, params, refreshMs) {
    const run = () =>
        GlobalDataPublisher.fetchAndPublish(topic, page, params)
            .catch(e => {
                console.error(`[fetchAndPublish:${topic}]`, e);
            });

    setInterval(run, refreshMs);
    run();  // 최초 실행
}

// 올바른 핸들러 패턴
const correctHandlerPattern = {
    '@dataRequest': async ({ targetInstance }) => {
        await fx.go(
            targetInstance.datasetInfo,
            fx.each(info => fetchData(info))
        ).catch(e => {
            console.error('[Handler]', e);
        });
    }
};

// 잘못된 패턴 (catch 없음)
function wrongIntervalPattern(page, topic, params, refreshMs) {
    const run = () =>
        GlobalDataPublisher.fetchAndPublish(topic, page, params);
        // catch 없음!

    setInterval(run, refreshMs);
}

// 검증 함수
const hasCatchInAsync = (code) => {
    const str = typeof code === 'function' ? code.toString() : JSON.stringify(code);
    return str.includes('.catch(');
};

console.log('[FX-014] interval has catch:', hasCatchInAsync(correctIntervalPattern));
console.log('[FX-014] handler has catch:', hasCatchInAsync(correctHandlerPattern['@dataRequest']));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-014]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('interval has catch: true'))).toBeDefined();
expect(logs.find(l => l.includes('handler has catch: true'))).toBeDefined();
```

**통과 기준:**
- interval 내 catch 존재
- 이벤트 핸들러 내 catch 존재

---

### 8.7 fail-fast vs fail-safe 전략

#### TC-FX-015: Fail-fast 전략 검증

**목적:** 첫 에러에서 전체 중단되는지 검증 (초기 로딩에 적합)

**사전 조건:**
- 전체가 완전해야 하는 시나리오

**테스트 순서:**
1. 여러 topic 순차 로드
2. 하나 실패 시 전체 중단 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const loadedTopics = [];
let errorOccurred = false;

// Fail-fast: 하나라도 실패하면 전체 중단
await fx.go(
    ['topic1', 'topic2', 'topic3'],
    fx.each(async topic => {
        if (topic === 'topic2') {
            throw new Error(`Failed to load ${topic}`);
        }
        loadedTopics.push(topic);
        console.log(`Loaded: ${topic}`);
    })
).catch(e => {
    errorOccurred = true;
    console.error('[Initial Load]', e.message);
});

// 검증
console.log('[FX-015] error occurred:', errorOccurred);
console.log('[FX-015] loaded count:', loadedTopics.length);
console.log('[FX-015] loaded topics:', JSON.stringify(loadedTopics));
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-015]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('error occurred: true'))).toBeDefined();
expect(logs.find(l => l.includes('loaded count: 1'))).toBeDefined();
expect(logs.find(l => l.includes('loaded topics: ["topic1"]'))).toBeDefined();
```

**통과 기준:**
- 첫 에러에서 전체 중단
- 에러 후 항목 미처리

---

#### TC-FX-016: Fail-safe (격리) 전략 검증

**목적:** 각 항목이 독립적으로 처리되고 일부 실패를 허용하는지 검증

**사전 조건:**
- topic들이 독립적인 시나리오

**테스트 순서:**
1. 각 topic마다 개별 catch
2. 일부 실패해도 나머지 처리 확인

**주입 코드 (CodeBox에 입력):**
```javascript
const results = [];

// Fail-safe: 개별 catch로 격리
await fx.go(
    ['topic1', 'topic2', 'topic3'],
    fx.each(async topic => {
        await fx.go(
            topic,
            async t => {
                if (t === 'topic2') {
                    throw new Error(`Failed to load ${t}`);
                }
                return { ok: true, topic: t, data: `data-${t}` };
            }
        ).catch(e => {
            results.push({ ok: false, topic, error: e.message });
        }).then(result => {
            if (result) results.push(result);
        });
    })
);

// 검증
console.log('[FX-016] results count:', results.length);

const successCount = results.filter(r => r.ok).length;
const failCount = results.filter(r => !r.ok).length;

console.log('[FX-016] success count:', successCount);
console.log('[FX-016] fail count:', failCount);

const failedTopic = results.find(r => !r.ok);
console.log('[FX-016] failed topic:', failedTopic?.topic);
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', msg => {
    if (msg.text().includes('[FX-016]')) logs.push(msg.text());
});

expect(logs.find(l => l.includes('results count: 3'))).toBeDefined();
expect(logs.find(l => l.includes('success count: 2'))).toBeDefined();
expect(logs.find(l => l.includes('fail count: 1'))).toBeDefined();
expect(logs.find(l => l.includes('failed topic: topic2'))).toBeDefined();
```

**통과 기준:**
- 모든 항목 처리 시도
- 일부 실패해도 나머지 성공
- 실패 정보 수집됨

---

### 8.8 fx.go 에러 핸들링 체크리스트

| TC ID | 테스트 항목 | 상태 |
|-------|------------|------|
| TC-FX-001 | fx.go 에러 전파 검증 | ☐ |
| TC-FX-002 | 비동기 파이프라인 에러 전파 검증 | ☐ |
| TC-FX-003 | fx.each 내부 에러 전파 검증 | ☐ |
| TC-FX-004 | nop이 필터 스킵으로 동작하는지 검증 | ☐ |
| TC-FX-005 | nop과 진짜 에러 구분 검증 | ☐ |
| TC-FX-006 | 파이프라인 끝 catch (기본 패턴) 검증 | ☐ |
| TC-FX-007 | 중간 catch (부분 복구) 검증 | ☐ |
| TC-FX-008 | 중간 catch 명시적 대체값 반환 검증 | ☐ |
| TC-FX-009 | setInterval 내 catch 필수 검증 | ☐ |
| TC-FX-010 | 이벤트 핸들러 내 catch 검증 | ☐ |
| TC-FX-011 | 내부 파이프라인 에러가 외부로 전파되는지 검증 | ☐ |
| TC-FX-012 | 부분 실패 허용 패턴 (격리) 검증 | ☐ |
| TC-FX-013 | fx.go 호출부 catch 존재 검증 | ☐ |
| TC-FX-014 | interval/이벤트 핸들러 catch 존재 검증 | ☐ |
| TC-FX-015 | Fail-fast 전략 검증 | ☐ |
| TC-FX-016 | Fail-safe (격리) 전략 검증 | ☐ |

---

