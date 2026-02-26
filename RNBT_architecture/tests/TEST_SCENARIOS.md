# RNBT Architecture 핵심 테스트 시나리오

이 문서는 RNBT_architecture [README.md](/RNBT_architecture/README.md) **본문(부록 제외)**의 핵심 아키텍처를 기반으로 작성된 테스트 시나리오입니다.

> **범위:** README.md 본문 7개 섹션 중 테스트 가능한 6개 영역, 총 55개 TC
> **제외:** 부록 A~F (PopupMixin, 내부 이벤트, Configuration 등)

---

## 관련 문서

| 문서 | 역할 | 내용 |
|------|------|------|
| **이 문서 (TEST_SCENARIOS.md)** | 테스트 명세서 (What) | 무엇을 테스트해야 하는가 — 테스트 케이스 목록과 검증 기준 |
| [tests/README.md](/RNBT_architecture/tests/README.md) | 테스트 실행 가이드 (How) | Playwright 환경 설정, 설치, 실행 방법 |
| [README.md](/RNBT_architecture/README.md) | 아키텍처 설계 문서 | 이 테스트 시나리오의 근거 문서 |

```
TEST_SCENARIOS.md          tests/README.md
(무엇을 테스트?)     →     (어떻게 실행?)
                              ↓
                         tests/*.spec.ts
                         (Playwright E2E 테스트 코드)
```

---

## 목차

1. [라이프사이클 테스트](#1-라이프사이클-테스트) (8 TC)
2. [이벤트 시스템 테스트](#2-이벤트-시스템-테스트) (10 TC)
3. [데이터 흐름 테스트](#3-데이터-흐름-테스트) (9 TC)
4. [Interval 관리 테스트](#4-interval-관리-테스트) (7 TC)
5. [리소스 정리 테스트](#5-리소스-정리-테스트) (9 TC)
6. [fx.go 에러 핸들링 테스트](#6-fxgo-에러-핸들링-테스트) (12 TC)

---

## 1. 라이프사이클 테스트

### 1.1 개요

RNBT 아키텍처에서 라이프사이클은 페이지와 컴포넌트가 생성되고 소멸되는 순서를 정의합니다.
올바른 순서가 보장되어야 리소스 정리와 이벤트 바인딩이 정상 동작합니다.

**README 근거:** lines 60-93, 102-125, 128-194

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

// 페이지 이동으로 Before Unload 트리거 후
const beforeUnloadIdx = consoleLogs.findIndex(l => l.includes('Before Unload'));
expect(beforeUnloadIdx).toBeGreaterThanOrEqual(0);
expect(loadedIdx).toBeLessThan(beforeUnloadIdx);
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
console.log('[Component] appendElement tagName:', this.appendElement?.tagName);

// beforeDestroy 탭
console.log('[Component] beforeDestroy');
console.log('[Component] appendElement still accessible:', !!this.appendElement);
```

**Playwright 검증:**

```typescript
const componentLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Component]')) {
    componentLogs.push(msg.text());
  }
});

await previewPage.locator('.component_1').waitFor({ state: 'visible', timeout: 30000 });

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
- register가 beforeDestroy보다 먼저 실행됨

---

#### TC-LC-003: 뷰어 전용 훅 실행 순서 검증

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
const hookLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[TestComponent]')) {
    hookLogs.push(msg.text());
  }
});

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

**통과 기준:**
- 등록 시점: _onViewerReady → WScript REGISTER 순서
- 소멸 시점: WScript BEFORE_DESTROY → _onViewerDestroy → WScript DESTROY 순서

---

#### TC-LC-004: appendElement 시점별 접근성 검증

**목적:** 각 라이프사이클 시점에서 this.appendElement 접근 가능 여부를 검증

**사전조건:**
- TC-LC-003의 커스텀 컴포넌트가 준비되어 있음

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

// beforeDestroy 탭
console.log('[BEFORE_DESTROY] appendElement accessible:', !!this.appendElement);

// destroy 탭
console.log('[DESTROY] appendElement accessible:', !!this.appendElement);
console.log('[DESTROY] appendElement value:', this.appendElement);
```

> **참고:** `_onViewerReady`/`_onViewerDestroy` 시점의 접근성은 TC-LC-003의 커스텀 컴포넌트 코드에서 검증합니다.

**Playwright 검증:**

```typescript
const accessLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().match(/\[(REGISTER|BEFORE_DESTROY|DESTROY)\]/)) {
    accessLogs.push(msg.text());
  }
});

await previewPage.locator('.test_component_1').waitFor({ state: 'visible', timeout: 30000 });

// REGISTER 시점: 접근 가능
const registerLog = accessLogs.find(l => l.includes('[REGISTER] appendElement accessible:'));
expect(registerLog).toContain('true');

// 페이지 이동으로 소멸 트리거 후

// BEFORE_DESTROY 시점: 접근 가능
const beforeDestroyLog = accessLogs.find(l => l.includes('[BEFORE_DESTROY] appendElement accessible:'));
expect(beforeDestroyLog).toContain('true');

// DESTROY 시점: 접근 불가
const destroyLog = accessLogs.find(l => l.includes('[DESTROY] appendElement accessible:'));
expect(destroyLog).toContain('false');
```

**통과 기준:**
- REGISTER ~ _onViewerDestroy: this.appendElement 접근 가능 (true)
- DESTROY: this.appendElement 접근 불가 (false, 이미 제거됨)

---

#### TC-LC-005: 다중 컴포넌트 라이프사이클 순서 검증

**목적:** 페이지에 여러 컴포넌트가 있을 때 전체 라이프사이클 순서가 올바른지 검증

**사전조건:**
- 페이지에 2개 이상의 컴포넌트가 배치되어 있음
- 페이지와 각 컴포넌트에 라이프사이클 로그가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 로드 | `[Page] Before Load` 출력 |
| 2 | 컴포넌트 A register | `[CompA] register` 출력 (Before Load 이후) |
| 3 | 컴포넌트 B register | `[CompB] register` 출력 (Before Load 이후) |
| 4 | 모든 컴포넌트 completed | `[Page] Loaded` 출력 |
| 5 | 페이지 언로드 | `[Page] Before Unload` 출력 |
| 6 | 컴포넌트 A beforeDestroy | `[CompA] beforeDestroy` 출력 (Before Unload 이후) |
| 7 | 컴포넌트 B beforeDestroy | `[CompB] beforeDestroy` 출력 (Before Unload 이후) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
console.log('[Page] Before Load');

// 페이지 loaded 탭
console.log('[Page] Loaded');

// 페이지 beforeUnLoad 탭
console.log('[Page] Before Unload');

// 컴포넌트 A register 탭
console.log('[CompA] register');

// 컴포넌트 A beforeDestroy 탭
console.log('[CompA] beforeDestroy');

// 컴포넌트 B register 탭
console.log('[CompB] register');

// 컴포넌트 B beforeDestroy 탭
console.log('[CompB] beforeDestroy');
```

**Playwright 검증:**

```typescript
const logs: string[] = [];
previewPage.on('console', (msg) => {
  const text = msg.text();
  if (text.match(/\[(Page|CompA|CompB)\]/)) {
    logs.push(text);
  }
});

await previewPage.waitForTimeout(3000);

// Before Load → 모든 register → Loaded
const beforeLoadIdx = logs.findIndex(l => l.includes('[Page] Before Load'));
const compARegIdx = logs.findIndex(l => l.includes('[CompA] register'));
const compBRegIdx = logs.findIndex(l => l.includes('[CompB] register'));
const loadedIdx = logs.findIndex(l => l.includes('[Page] Loaded'));

expect(beforeLoadIdx).toBeLessThan(compARegIdx);
expect(beforeLoadIdx).toBeLessThan(compBRegIdx);
expect(compARegIdx).toBeLessThan(loadedIdx);
expect(compBRegIdx).toBeLessThan(loadedIdx);

// 페이지 이동 후: Before Unload → 모든 beforeDestroy
const beforeUnloadIdx = logs.findIndex(l => l.includes('[Page] Before Unload'));
const compADestroyIdx = logs.findIndex(l => l.includes('[CompA] beforeDestroy'));
const compBDestroyIdx = logs.findIndex(l => l.includes('[CompB] beforeDestroy'));

expect(beforeUnloadIdx).toBeLessThan(compADestroyIdx);
expect(beforeUnloadIdx).toBeLessThan(compBDestroyIdx);
```

**통과 기준:**
- Page Before Load → 모든 컴포넌트 register → Page Loaded 순서
- Page Before Unload → 모든 컴포넌트 beforeDestroy 순서

---

#### TC-LC-006: 2D vs 3D appendElement 타입 검증

**목적:** 2D 컴포넌트와 3D 컴포넌트의 appendElement가 각각 올바른 타입인지 검증

**사전조건:**
- 2D 컴포넌트와 3D 컴포넌트가 각각 배치되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 2D 컴포넌트 register에서 appendElement 확인 | HTMLElement(div), id = 인스턴스 id |
| 2 | 3D 컴포넌트 register에서 appendElement 확인 | THREE.Object3D, name = "MainGroup" |

**주입 코드 (CodeBox에 입력):**

```javascript
// 2D 컴포넌트 register 탭
console.log('[2D] appendElement tagName:', this.appendElement?.tagName);
console.log('[2D] appendElement id:', this.appendElement?.id);
console.log('[2D] instance id:', this.id);
console.log('[2D] id matches:', this.appendElement?.id === this.id);

// 3D 컴포넌트 register 탭
console.log('[3D] appendElement type:', this.appendElement?.constructor?.name);
console.log('[3D] appendElement name:', this.appendElement?.name);
console.log('[3D] is MainGroup:', this.appendElement?.name === 'MainGroup');
```

**Playwright 검증:**

```typescript
const typeLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().match(/\[(2D|3D)\]/)) {
    typeLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 2D: HTMLElement(div) with instance id
const tagLog = typeLogs.find(l => l.includes('[2D] appendElement tagName:'));
expect(tagLog).toContain('DIV');

const idMatchLog = typeLogs.find(l => l.includes('[2D] id matches:'));
expect(idMatchLog).toContain('true');

// 3D: THREE.Object3D with "MainGroup" name
const mainGroupLog = typeLogs.find(l => l.includes('[3D] is MainGroup:'));
expect(mainGroupLog).toContain('true');
```

**통과 기준:**
- 2D: appendElement가 HTMLElement(div)이고 id가 인스턴스 id와 일치
- 3D: appendElement가 THREE.Object3D이고 name이 "MainGroup"

---

#### TC-LC-007: this.name 접근성 검증

**목적:** 컴포넌트에서 this.name으로 인스턴스 이름에 접근 가능한지 검증

**사전조건:**
- 테스트용 컴포넌트가 배치되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | register에서 this.name 확인 | 인스턴스 이름 문자열 반환 |
| 2 | this.name이 비어 있지 않은지 확인 | 유효한 문자열 |

**주입 코드 (CodeBox에 입력):**

```javascript
// register 탭
console.log('[Name] this.name:', this.name);
console.log('[Name] typeof:', typeof this.name);
console.log('[Name] is valid:', typeof this.name === 'string' && this.name.length > 0);
```

**Playwright 검증:**

```typescript
const nameLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Name]')) {
    nameLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// this.name이 유효한 문자열인지 확인
const validLog = nameLogs.find(l => l.includes('[Name] is valid:'));
expect(validLog).toContain('true');

const typeLog = nameLogs.find(l => l.includes('[Name] typeof:'));
expect(typeLog).toContain('string');
```

**통과 기준:**
- this.name이 유효한 문자열로 인스턴스 이름을 반환함

---

#### TC-LC-008: 마스터 페이지 스킵 검증

**목적:** 같은 마스터를 사용하는 페이지 간 전환 시 마스터 스크립트가 스킵되는지 검증

**사전조건:**
- 같은 마스터를 사용하는 페이지 A, B가 준비되어 있음
- 마스터 스크립트에 라이프사이클 로그가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 A 로드 | `[Master] before_load` 출력 (최초) |
| 2 | 페이지 A → B 이동 (같은 마스터) | 마스터 스크립트 재실행 없음 |
| 3 | PAGE before_load만 실행 | `[PageB] Before Load` 출력 |
| 4 | MASTER before_load 미실행 확인 | 마스터 로그 개수 불변 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 마스터 beforeLoad 탭
console.log('[Master] before_load - timestamp:', Date.now());

// 페이지 A beforeLoad 탭
console.log('[PageA] Before Load');

// 페이지 B beforeLoad 탭
console.log('[PageB] Before Load');
```

**Playwright 검증:**

```typescript
const masterLogs: string[] = [];
const pageLogs: string[] = [];

previewPage.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[Master]')) masterLogs.push(text);
  if (text.match(/\[Page[AB]\]/)) pageLogs.push(text);
});

// 페이지 A 로드
await previewPage.waitForTimeout(3000);
const masterCountAfterA = masterLogs.length;
expect(masterCountAfterA).toBeGreaterThan(0); // 최초 실행

// 같은 마스터의 페이지 B로 이동
// (네비게이션 동작 수행)
await previewPage.waitForTimeout(3000);

// 마스터 스크립트는 재실행되지 않음
expect(masterLogs.length).toBe(masterCountAfterA);

// 페이지 B의 스크립트는 실행됨
const pageBLog = pageLogs.find(l => l.includes('[PageB] Before Load'));
expect(pageBLog).toBeDefined();
```

**통과 기준:**
- 같은 마스터 간 페이지 전환 시 마스터 스크립트가 재실행되지 않음
- 페이지 스크립트는 정상 실행됨

---

## 2. 이벤트 시스템 테스트

### 2.1 개요

이벤트 시스템은 컴포넌트 간 통신의 핵심입니다. DOM 이벤트 → Weventbus → 페이지 핸들러의
흐름을 따르며, 2D와 3D 각각 다른 이벤트 바인딩 구조를 가집니다.

**README 근거:** lines 80-81, 338, 384-419, 464-493

### 2.2 테스트 대상

| 대상 | 핵심 API |
|------|----------|
| EventBus | onEventBusHandlers, offEventBusHandlers, Weventbus.emit |
| 2D 이벤트 | customEvents, bindEvents, removeCustomEvents |
| 3D 이벤트 | bind3DEvents |
| 데이터 조회 | datasetInfo, fetchData |

---

### 2.3 테스트 시나리오

#### TC-EV-001: EventBus 핸들러 등록 및 호출 검증

**목적:** onEventBusHandlers로 등록한 핸들러가 Weventbus.emit 시 정상 호출되는지 검증

**사전조건:**
- 페이지 before_load에 EventBus 핸들러가 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | onEventBusHandlers로 핸들러 등록 | 핸들러 등록 완료 |
| 2 | Weventbus.emit으로 이벤트 발행 | 등록된 핸들러 호출됨 |
| 3 | 핸들러에서 받은 데이터 확인 | 이벤트 데이터가 정상 전달됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@testEvent': ({ event, targetInstance }) => {
        console.log('[EventBus] handler called');
        console.log('[EventBus] event received:', JSON.stringify(event));
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
console.log('[EventBus] handlers registered');
```

```javascript
// 컴포넌트 register 탭 — 이벤트 발행 테스트
setTimeout(() => {
    Weventbus.emit('@testEvent', { event: { type: 'test' }, targetInstance: this });
    console.log('[EventBus] event emitted');
}, 2000);
```

**Playwright 검증:**

```typescript
const busLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[EventBus]')) {
    busLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 핸들러 등록 확인
expect(busLogs.some(l => l.includes('handlers registered'))).toBe(true);

// 이벤트 발행 확인
expect(busLogs.some(l => l.includes('event emitted'))).toBe(true);

// 핸들러 호출 확인
expect(busLogs.some(l => l.includes('handler called'))).toBe(true);
```

**통과 기준:**
- onEventBusHandlers로 등록한 핸들러가 Weventbus.emit 시 호출됨
- 핸들러에 이벤트 데이터가 정상 전달됨

---

#### TC-EV-002: EventBus 핸들러 해제 검증

**목적:** offEventBusHandlers로 해제한 핸들러가 이후 이벤트에 반응하지 않는지 검증

**사전조건:**
- TC-EV-001에서 핸들러가 등록된 상태

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 이벤트 발행 → 핸들러 호출 | 핸들러 정상 호출됨 |
| 2 | offEventBusHandlers로 해제 | 핸들러 해제 완료 |
| 3 | 동일 이벤트 재발행 | 핸들러 호출 안 됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers, offEventBusHandlers } = Wkit;

let callCount = 0;
this.pageEventBusHandlers = {
    '@testOff': () => {
        callCount++;
        console.log('[OffTest] handler called, count:', callCount);
    }
};

onEventBusHandlers(this.pageEventBusHandlers);

// 1차 발행 (핸들러 호출됨)
setTimeout(() => {
    Weventbus.emit('@testOff', {});
    console.log('[OffTest] after 1st emit, count:', callCount);
}, 1000);

// 해제 후 2차 발행 (핸들러 호출 안 됨)
setTimeout(() => {
    offEventBusHandlers(this.pageEventBusHandlers);
    console.log('[OffTest] handlers removed');
    Weventbus.emit('@testOff', {});
    console.log('[OffTest] after 2nd emit, count:', callCount);
}, 3000);
```

**Playwright 검증:**

```typescript
const offLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[OffTest]')) {
    offLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 1차 발행 시 핸들러 호출됨
const afterFirst = offLogs.find(l => l.includes('after 1st emit'));
expect(afterFirst).toContain('count: 1');

// 해제 후 2차 발행 시 핸들러 미호출
const afterSecond = offLogs.find(l => l.includes('after 2nd emit'));
expect(afterSecond).toContain('count: 1'); // 카운트 불변
```

**통과 기준:**
- offEventBusHandlers 호출 후 이벤트를 발행해도 핸들러가 호출되지 않음

---

#### TC-EV-003: customEvents + bindEvents (2D) 검증

**목적:** customEvents 정의 + bindEvents로 이벤트 위임이 동작하고, @ 접두사로 Weventbus 이벤트가 발행되는지 검증

**사전조건:**
- 2D 컴포넌트에 버튼 요소가 존재함

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | customEvents 정의 | `{ click: { '.my-button': '@myButtonClicked' } }` 구조 |
| 2 | bindEvents 호출 | 이벤트 위임 등록됨 |
| 3 | .my-button 클릭 | '@myButtonClicked' 이벤트가 Weventbus로 발행됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.my-button': '@myButtonClicked'
    }
};

bindEvents(this, this.customEvents);
console.log('[BindEvents] events bound');
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@myButtonClicked': ({ event, targetInstance }) => {
        console.log('[BindEvents] @myButtonClicked received');
        console.log('[BindEvents] targetInstance name:', targetInstance?.name);
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const bindLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[BindEvents]')) {
    bindLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(2000);

// 이벤트 바인딩 확인
expect(bindLogs.some(l => l.includes('events bound'))).toBe(true);

// .my-button 클릭
await previewPage.locator('.my-button').click();
await previewPage.waitForTimeout(1000);

// @ 접두사 이벤트가 Weventbus를 통해 페이지 핸들러에 전달됨
expect(bindLogs.some(l => l.includes('@myButtonClicked received'))).toBe(true);
```

**통과 기준:**
- bindEvents로 이벤트 위임이 등록됨
- 대상 요소 클릭 시 @ 접두사 이벤트가 Weventbus를 통해 페이지 핸들러에 전달됨

---

#### TC-EV-004: 이벤트 위임 (동적 요소) 검증

**목적:** bindEvents로 바인딩된 이벤트가 나중에 추가된 동적 DOM 요소에도 동작하는지 검증

**사전조건:**
- 컴포넌트에 customEvents가 설정됨
- bindEvents 호출 후 새 요소가 추가됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | bindEvents 호출 | 이벤트 위임 등록 |
| 2 | 동적으로 .my-button 요소 추가 | DOM에 새 버튼 삽입 |
| 3 | 동적 버튼 클릭 | 이벤트 핸들러 호출됨 (위임) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.dynamic-btn': '@dynamicClicked'
    }
};

bindEvents(this, this.customEvents);

// bindEvents 후 동적 요소 추가
setTimeout(() => {
    const btn = document.createElement('button');
    btn.className = 'dynamic-btn';
    btn.textContent = 'Dynamic Button';
    this.appendElement.appendChild(btn);
    console.log('[Delegation] dynamic button added');
}, 1000);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@dynamicClicked': () => {
        console.log('[Delegation] dynamic event received');
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const delegateLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Delegation]')) {
    delegateLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(2000);

// 동적 요소가 추가되었는지 확인
expect(delegateLogs.some(l => l.includes('dynamic button added'))).toBe(true);

// 동적 버튼 클릭
await previewPage.locator('.dynamic-btn').click();
await previewPage.waitForTimeout(1000);

// 이벤트 위임으로 핸들러 호출됨
expect(delegateLogs.some(l => l.includes('dynamic event received'))).toBe(true);
```

**통과 기준:**
- bindEvents 이후 추가된 동적 DOM 요소에서도 이벤트 위임이 동작함

---

#### TC-EV-005: removeCustomEvents 검증

**목적:** removeCustomEvents로 해제한 후 이벤트가 더 이상 발행되지 않는지 검증

**사전조건:**
- customEvents가 bindEvents로 바인딩된 상태

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | .my-button 클릭 | 이벤트 발행됨 |
| 2 | removeCustomEvents 호출 | 이벤트 해제 |
| 3 | .my-button 재클릭 | 이벤트 미발행 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents, removeCustomEvents } = Wkit;

let eventCount = 0;

this.customEvents = {
    click: {
        '.my-button': '@removeTest'
    }
};

bindEvents(this, this.customEvents);

// 3초 후 이벤트 해제
setTimeout(() => {
    removeCustomEvents(this, this.customEvents);
    console.log('[RemoveEvents] events removed');
}, 3000);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

let removeTestCount = 0;
this.pageEventBusHandlers = {
    '@removeTest': () => {
        removeTestCount++;
        console.log('[RemoveEvents] event fired, count:', removeTestCount);
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const removeLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RemoveEvents]')) {
    removeLogs.push(msg.text());
  }
});

// 1차 클릭 — 이벤트 발행됨
await previewPage.locator('.my-button').click();
await previewPage.waitForTimeout(1000);
expect(removeLogs.some(l => l.includes('count: 1'))).toBe(true);

// removeCustomEvents 대기 (3초)
await previewPage.waitForTimeout(3000);
expect(removeLogs.some(l => l.includes('events removed'))).toBe(true);

// 2차 클릭 — 이벤트 미발행
await previewPage.locator('.my-button').click();
await previewPage.waitForTimeout(1000);

// count가 여전히 1 (증가하지 않음)
const lastCountLog = removeLogs.filter(l => l.includes('event fired')).pop();
expect(lastCountLog).toContain('count: 1');
```

**통과 기준:**
- removeCustomEvents 호출 후 동일 요소를 클릭해도 이벤트가 발행되지 않음

---

#### TC-EV-006: bind3DEvents (3D) 검증

**목적:** 3D 컴포넌트에서 bind3DEvents로 이벤트가 올바르게 바인딩되는지 검증

**사전조건:**
- 3D 컴포넌트가 배치되어 있음
- canvas 요소가 존재함

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | customEvents 정의 | `{ click: '@3dObjectClicked' }` 구조 |
| 2 | bind3DEvents 호출 | 3D 이벤트 바인딩 등록 |
| 3 | 3D 객체 클릭 | '@3dObjectClicked' 이벤트 발행 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.customEvents = {
    click: '@3dObjectClicked'
};

bind3DEvents(this, this.customEvents);
console.log('[3DEvents] events bound');
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@3dObjectClicked': ({ event, targetInstance }) => {
        console.log('[3DEvents] 3D click received');
        console.log('[3DEvents] intersects:', event.intersects?.length);
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const threeDLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[3DEvents]')) {
    threeDLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(2000);

// 3D 이벤트 바인딩 확인
expect(threeDLogs.some(l => l.includes('events bound'))).toBe(true);

// 3D canvas 클릭 (raycasting 연동)
await previewPage.locator('canvas').click();
await previewPage.waitForTimeout(1000);

// 3D 클릭 이벤트 수신 확인
expect(threeDLogs.some(l => l.includes('3D click received'))).toBe(true);
```

**통과 기준:**
- bind3DEvents로 3D 이벤트가 바인딩됨
- 3D 객체 클릭 시 @ 접두사 이벤트가 페이지 핸들러에 전달됨

---

#### TC-EV-007: 2D vs 3D 이벤트 구조 차이 검증

**목적:** 2D와 3D의 customEvents 구조가 올바르게 구분되는지 검증

**사전조건:**
- 2D 컴포넌트와 3D 컴포넌트가 각각 존재함

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 2D customEvents 구조 확인 | `{ click: { '.selector': '@event' } }` (셀렉터 기반) |
| 2 | 3D customEvents 구조 확인 | `{ click: '@event' }` (셀렉터 없음) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 2D 컴포넌트 register 탭
this.customEvents = {
    click: {
        '.item': '@itemClicked'
    }
};
console.log('[Structure] 2D customEvents:', JSON.stringify(this.customEvents));
console.log('[Structure] 2D click type:', typeof this.customEvents.click); // object

// 3D 컴포넌트 register 탭
this.customEvents = {
    click: '@3dClicked'
};
console.log('[Structure] 3D customEvents:', JSON.stringify(this.customEvents));
console.log('[Structure] 3D click type:', typeof this.customEvents.click); // string
```

**Playwright 검증:**

```typescript
const structLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Structure]')) {
    structLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 2D: click 값이 object (셀렉터 매핑)
const twoDType = structLogs.find(l => l.includes('2D click type:'));
expect(twoDType).toContain('object');

// 3D: click 값이 string (직접 이벤트명)
const threeDType = structLogs.find(l => l.includes('3D click type:'));
expect(threeDType).toContain('string');
```

**통과 기준:**
- 2D: `{ click: { '.selector': '@event' } }` — 셀렉터 기반 이벤트 위임
- 3D: `{ click: '@event' }` — 직접 이벤트 매핑

---

#### TC-EV-008: datasetInfo + fetchData 흐름 검증

**목적:** 3D 이벤트 핸들러에서 targetInstance.datasetInfo를 순회하고 fetchData를 호출하는 흐름을 검증

**사전조건:**
- 3D 컴포넌트에 datasetInfo가 정의되어 있음
- 페이지에 '@3dObjectClicked' 핸들러가 등록되어 있음

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 3D 컴포넌트에 datasetInfo 정의 | 배열 형태로 데이터셋 정보 설정 |
| 2 | 3D 객체 클릭 → 이벤트 핸들러 | targetInstance.datasetInfo 접근 가능 |
| 3 | datasetInfo 순회 → fetchData 호출 | 각 데이터셋에 대해 fetchData 호출 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 3D 컴포넌트 register 탭
const { bind3DEvents } = Wkit;

this.datasetInfo = [
    {
        datasetName: 'myDataset',
        param: { type: 'geometry', id: this.id }
    }
];

this.customEvents = {
    click: '@3dObjectClicked'
};

bind3DEvents(this, this.customEvents);
console.log('[DatasetInfo] registered, datasetInfo length:', this.datasetInfo.length);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers, fetchData } = Wkit;

this.pageEventBusHandlers = {
    '@3dObjectClicked': async ({ event, targetInstance }) => {
        const { datasetInfo } = targetInstance;
        console.log('[DatasetInfo] datasetInfo exists:', !!datasetInfo);
        console.log('[DatasetInfo] datasetInfo length:', datasetInfo?.length);

        if (datasetInfo?.length) {
            for (const { datasetName, param } of datasetInfo) {
                console.log('[DatasetInfo] fetching:', datasetName);
                try {
                    const data = await fetchData(this, datasetName, param);
                    console.log('[DatasetInfo] data received:', !!data);
                } catch (e) {
                    console.log('[DatasetInfo] fetch error:', e.message);
                }
            }
        }
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const datasetLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[DatasetInfo]')) {
    datasetLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(2000);

// datasetInfo 등록 확인
expect(datasetLogs.some(l => l.includes('datasetInfo length: 1'))).toBe(true);

// 3D 객체 클릭
await previewPage.locator('canvas').click();
await previewPage.waitForTimeout(2000);

// targetInstance.datasetInfo 접근 확인
expect(datasetLogs.some(l => l.includes('datasetInfo exists: true'))).toBe(true);

// fetchData 호출 확인
expect(datasetLogs.some(l => l.includes('fetching: myDataset'))).toBe(true);
```

**통과 기준:**
- targetInstance.datasetInfo가 배열로 접근 가능
- datasetInfo 순회하며 fetchData 호출이 실행됨

---

#### TC-EV-009: event vs targetInstance 구분 검증

**목적:** 이벤트 핸들러의 { event, targetInstance } 파라미터에서 event는 DOM 정보, targetInstance는 인스턴스 메타 정보를 제공하는지 검증

**사전조건:**
- 컴포넌트에 customEvents가 설정됨
- 페이지에 이벤트 핸들러가 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 이벤트 발생 | 핸들러에 { event, targetInstance } 전달 |
| 2 | event 확인 | DOM 이벤트 정보 (target, type 등) |
| 3 | targetInstance 확인 | 컴포넌트 인스턴스 정보 (name, id 등) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: {
        '.test-elem': '@testClicked'
    }
};

bindEvents(this, this.customEvents);
```

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@testClicked': ({ event, targetInstance }) => {
        // event: DOM 정보
        console.log('[Params] event type:', event?.type || typeof event);
        console.log('[Params] event target:', event?.target?.className || 'N/A');

        // targetInstance: 인스턴스 메타 정보
        console.log('[Params] targetInstance name:', targetInstance?.name);
        console.log('[Params] targetInstance has appendElement:', !!targetInstance?.appendElement);
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

**Playwright 검증:**

```typescript
const paramLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Params]')) {
    paramLogs.push(msg.text());
  }
});

// 요소 클릭
await previewPage.locator('.test-elem').click();
await previewPage.waitForTimeout(1000);

// event: DOM 정보
const eventTypeLog = paramLogs.find(l => l.includes('event type:'));
expect(eventTypeLog).toBeDefined();

// targetInstance: 인스턴스 정보
const instanceNameLog = paramLogs.find(l => l.includes('targetInstance name:'));
expect(instanceNameLog).toBeDefined();

const hasAppendLog = paramLogs.find(l => l.includes('has appendElement:'));
expect(hasAppendLog).toContain('true');
```

**통과 기준:**
- event: DOM 이벤트 정보를 포함 (type, target 등)
- targetInstance: 컴포넌트 인스턴스 메타 정보를 포함 (name, appendElement 등)

---

#### TC-EV-010: 비동기 이벤트 핸들러 검증

**목적:** async 이벤트 핸들러에서 try-catch가 정상 동작하는지 검증

**사전조건:**
- 페이지에 async EventBus 핸들러가 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | async 핸들러 등록 | onEventBusHandlers로 등록 |
| 2 | 이벤트 발행 (정상 케이스) | await 후 정상 처리 |
| 3 | 이벤트 발행 (에러 케이스) | catch 블록에서 에러 처리 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers, fetchData } = Wkit;

this.pageEventBusHandlers = {
    '@asyncTest': async ({ event, targetInstance }) => {
        try {
            console.log('[Async] handler start');
            // 비동기 작업 시뮬레이션
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[Async] async work done');
        } catch (e) {
            console.log('[Async] error caught:', e.message);
        }
    },

    '@asyncError': async () => {
        try {
            console.log('[Async] error handler start');
            await Promise.reject(new Error('test error'));
        } catch (e) {
            console.log('[Async] error caught:', e.message);
        }
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

```javascript
// 컴포넌트 register 탭
// 정상 케이스 발행
setTimeout(() => {
    Weventbus.emit('@asyncTest', { event: {}, targetInstance: this });
}, 1000);

// 에러 케이스 발행
setTimeout(() => {
    Weventbus.emit('@asyncError', { event: {}, targetInstance: this });
}, 3000);
```

**Playwright 검증:**

```typescript
const asyncLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Async]')) {
    asyncLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 정상 케이스: async 작업 완료
expect(asyncLogs.some(l => l.includes('handler start'))).toBe(true);
expect(asyncLogs.some(l => l.includes('async work done'))).toBe(true);

// 에러 케이스: catch에서 처리됨
expect(asyncLogs.some(l => l.includes('error caught: test error'))).toBe(true);
```

**통과 기준:**
- async 핸들러가 정상 동작하고 await이 완료됨
- 에러 발생 시 try-catch에서 정상 포착됨

---

## 3. 데이터 흐름 테스트

### 3.1 개요

데이터 흐름은 Topic 기반 pub-sub 구조로 동작합니다. 페이지가 pageDataMappings를 정의하고
GlobalDataPublisher를 통해 데이터를 발행하면, 컴포넌트는 subscribe로 데이터를 수신합니다.

**README 근거:** lines 45-58, 235-278, 339, 544-611

### 3.2 테스트 대상

| 대상 | 핵심 API |
|------|----------|
| 데이터 등록 | pageDataMappings, registerMapping |
| 구독/발행 | subscribe, fetchAndPublish, unsubscribe |
| Param 관리 | pageParams |

---

### 3.3 테스트 시나리오

#### TC-DF-001: pageDataMappings + registerMapping 검증

**목적:** pageDataMappings 배열 정의 후 registerMapping으로 등록이 정상 동작하는지 검증

**사전조건:**
- 테스트 페이지에 loaded 스크립트가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | pageDataMappings 정의 | topic, datasetInfo, refreshInterval 구조 |
| 2 | registerMapping 호출 | 각 mapping 등록 완료 |
| 3 | 등록 후 fetchAndPublish 가능 | 데이터 발행 가능 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

this.pageDataMappings = [
    {
        topic: 'testTopic',
        datasetInfo: {
            datasetName: 'testApi',
            param: { endpoint: '/api/test' }
        },
        refreshInterval: 5000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(mapping => {
        registerMapping(mapping);
        console.log('[Mapping] registered:', mapping.topic);
    }),
    each(({ topic }) => this.pageParams[topic] = {}),
    each(({ topic }) =>
        fetchAndPublish(topic, this)
            .then(() => console.log('[Mapping] fetchAndPublish done:', topic))
            .catch(err => console.log('[Mapping] fetchAndPublish error:', err.message))
    )
);
```

**Playwright 검증:**

```typescript
const mappingLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Mapping]')) {
    mappingLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// registerMapping 호출 확인
expect(mappingLogs.some(l => l.includes('registered: testTopic'))).toBe(true);

// fetchAndPublish 호출 확인
expect(mappingLogs.some(l =>
  l.includes('fetchAndPublish done: testTopic') ||
  l.includes('fetchAndPublish error:')
)).toBe(true);
```

**통과 기준:**
- pageDataMappings의 각 항목이 registerMapping으로 등록됨
- 등록 후 fetchAndPublish가 실행 가능함

---

#### TC-DF-002: subscribe + 데이터 수신 검증

**목적:** 컴포넌트가 subscribe로 topic을 구독하고 { response } 구조로 데이터를 수신하는지 검증

**사전조건:**
- 페이지에 topic이 registerMapping으로 등록됨
- 컴포넌트에 subscribe가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | subscribe(topic, this, handler) 호출 | 구독 등록 |
| 2 | fetchAndPublish 실행 | 핸들러 호출됨 |
| 3 | 핸들러에서 { response } 확인 | response 객체 수신 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = {
    'testTopic': ['renderData']
};

this.renderData = function({ response }) {
    console.log('[Subscribe] data received');
    console.log('[Subscribe] response exists:', !!response);
    console.log('[Subscribe] response type:', typeof response);
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

console.log('[Subscribe] subscribed to testTopic');
```

**Playwright 검증:**

```typescript
const subLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Subscribe]')) {
    subLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 구독 확인
expect(subLogs.some(l => l.includes('subscribed to testTopic'))).toBe(true);

// 데이터 수신 확인 ({ response } 구조)
expect(subLogs.some(l => l.includes('data received'))).toBe(true);
expect(subLogs.some(l => l.includes('response exists: true'))).toBe(true);
```

**통과 기준:**
- subscribe로 등록한 핸들러가 fetchAndPublish 시 호출됨
- 핸들러의 파라미터가 { response } 구조임

---

#### TC-DF-003: 하나의 topic 다중 핸들러 검증

**목적:** 하나의 topic에 여러 핸들러를 등록할 수 있는지 검증

**사전조건:**
- 컴포넌트에 하나의 topic에 2개 이상의 핸들러가 매핑됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | subscriptions = { topic: ['fn1', 'fn2'] } 정의 | 다중 핸들러 매핑 |
| 2 | 각 핸들러를 subscribe로 등록 | 2개 핸들러 등록 |
| 3 | fetchAndPublish 실행 | 두 핸들러 모두 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = {
    'testTopic': ['renderChart', 'renderTable']
};

this.renderChart = function({ response }) {
    console.log('[MultiHandler] renderChart called');
}.bind(this);

this.renderTable = function({ response }) {
    console.log('[MultiHandler] renderTable called');
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

console.log('[MultiHandler] registered 2 handlers for testTopic');
```

**Playwright 검증:**

```typescript
const multiLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[MultiHandler]')) {
    multiLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 두 핸들러 모두 호출됨
expect(multiLogs.some(l => l.includes('renderChart called'))).toBe(true);
expect(multiLogs.some(l => l.includes('renderTable called'))).toBe(true);
```

**통과 기준:**
- 하나의 topic에 여러 핸들러를 등록하면 fetchAndPublish 시 모두 호출됨

---

#### TC-DF-004: 여러 컴포넌트 동일 topic 구독 검증

**목적:** 여러 컴포넌트가 같은 topic을 구독할 때 중복 fetch 없이 한 번의 API로 모두 전달되는지 검증

**사전조건:**
- 2개 이상의 컴포넌트가 같은 topic을 subscribe
- 페이지에서 해당 topic의 fetchAndPublish를 1회 호출

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 컴포넌트 A, B 모두 같은 topic 구독 | 각각 subscribe 등록 |
| 2 | fetchAndPublish 1회 호출 | 컴포넌트 A, B 핸들러 모두 호출됨 |
| 3 | API 호출 횟수 확인 | 1회만 fetch (중복 fetch 방지) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 A register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = { 'sharedTopic': ['renderData'] };
this.renderData = function({ response }) {
    console.log('[SharedTopic] CompA received data');
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// 컴포넌트 B register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = { 'sharedTopic': ['renderData'] };
this.renderData = function({ response }) {
    console.log('[SharedTopic] CompB received data');
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);
```

**Playwright 검증:**

```typescript
const sharedLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[SharedTopic]')) {
    sharedLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 두 컴포넌트 모두 데이터 수신
expect(sharedLogs.some(l => l.includes('CompA received data'))).toBe(true);
expect(sharedLogs.some(l => l.includes('CompB received data'))).toBe(true);
```

**통과 기준:**
- 여러 컴포넌트가 같은 topic을 구독하면 1회 fetchAndPublish로 모두에게 데이터 전달됨
- 중복 fetch가 발생하지 않음 (Topic 기반 pub-sub)

---

#### TC-DF-005: fetchAndPublish 동작 검증

**목적:** fetchAndPublish가 fetch 후 구독자에게 데이터를 발행하는지 검증

**사전조건:**
- topic이 registerMapping으로 등록됨
- 구독자가 subscribe로 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | fetchAndPublish(topic, this) 호출 | API fetch 실행 |
| 2 | fetch 완료 후 | 등록된 모든 구독자 핸들러에 데이터 전달 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;

this.pageDataMappings = [
    {
        topic: 'fetchTest',
        datasetInfo: {
            datasetName: 'testApi',
            param: {}
        }
    }
];

this.pageParams = {};

const { each, go } = fx;
go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {}),
    each(({ topic }) =>
        fetchAndPublish(topic, this)
            .then(() => console.log('[FetchPub] publish complete for:', topic))
            .catch(err => console.log('[FetchPub] error:', err.message))
    )
);
```

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = { 'fetchTest': ['onData'] };
this.onData = function({ response }) {
    console.log('[FetchPub] subscriber received data');
    console.log('[FetchPub] response:', JSON.stringify(response).substring(0, 100));
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);
```

**Playwright 검증:**

```typescript
const fetchPubLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FetchPub]')) {
    fetchPubLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// fetchAndPublish 완료 확인
expect(fetchPubLogs.some(l => l.includes('publish complete for: fetchTest'))).toBe(true);

// 구독자에게 데이터 전달 확인
expect(fetchPubLogs.some(l => l.includes('subscriber received data'))).toBe(true);
```

**통과 기준:**
- fetchAndPublish가 fetch 실행 후 구독자에게 데이터를 발행함

---

#### TC-DF-006: unsubscribe / unregisterMapping 검증

**목적:** unsubscribe와 unregisterMapping으로 구독 및 등록이 해제되는지 검증

**사전조건:**
- subscribe와 registerMapping이 완료된 상태

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 데이터 수신 확인 | 구독자 핸들러 호출됨 |
| 2 | unsubscribe(topic, this) 호출 | 구독 해제 |
| 3 | fetchAndPublish 재호출 | 핸들러 미호출 |
| 4 | unregisterMapping(topic) 호출 | 등록 해제 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe, unsubscribe } = GlobalDataPublisher;

let receiveCount = 0;
this.subscriptions = { 'unsubTest': ['onData'] };
this.onData = function({ response }) {
    receiveCount++;
    console.log('[Unsub] data received, count:', receiveCount);
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// 3초 후 구독 해제
setTimeout(() => {
    go(
        Object.entries(this.subscriptions),
        each(([topic, _]) => unsubscribe(topic, this))
    );
    console.log('[Unsub] unsubscribed, count was:', receiveCount);
}, 3000);
```

**Playwright 검증:**

```typescript
const unsubLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Unsub]')) {
    unsubLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 최초 데이터 수신 확인
expect(unsubLogs.some(l => l.includes('data received'))).toBe(true);

// unsubscribe 완료 확인
expect(unsubLogs.some(l => l.includes('unsubscribed'))).toBe(true);
```

**통과 기준:**
- unsubscribe 후 fetchAndPublish가 실행되어도 핸들러가 호출되지 않음
- unregisterMapping 후 topic이 해제됨

---

#### TC-DF-007: pageParams 초기화 및 관리 검증

**목적:** pageParams가 topic별로 {} 초기화되고, fetchAndPublish 시 전달되는지 검증

**사전조건:**
- pageDataMappings에 topic이 정의됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | pageParams = {} 초기화 | 빈 객체로 생성 |
| 2 | 각 topic에 대해 pageParams[topic] = {} | topic별 빈 파라미터 |
| 3 | fetchAndPublish(topic, this, pageParams[topic]) | param이 전달됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

this.pageDataMappings = [
    {
        topic: 'paramTopic',
        datasetInfo: {
            datasetName: 'testApi',
            param: {}
        }
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => {
        this.pageParams[topic] = {};
        console.log('[Params] initialized pageParams[' + topic + ']:', JSON.stringify(this.pageParams[topic]));
    }),
    each(({ topic }) =>
        fetchAndPublish(topic, this, this.pageParams[topic])
            .then(() => console.log('[Params] fetchAndPublish with params done'))
            .catch(err => console.log('[Params] error:', err.message))
    )
);

console.log('[Params] pageParams keys:', Object.keys(this.pageParams).join(', '));
```

**Playwright 검증:**

```typescript
const paramsLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Params]')) {
    paramsLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// topic별 초기화 확인
expect(paramsLogs.some(l => l.includes('initialized pageParams[paramTopic]:'))).toBe(true);

// pageParams 키 확인
expect(paramsLogs.some(l => l.includes('pageParams keys: paramTopic'))).toBe(true);

// fetchAndPublish에 params 전달 확인
expect(paramsLogs.some(l =>
  l.includes('fetchAndPublish with params done') ||
  l.includes('error:')
)).toBe(true);
```

**통과 기준:**
- pageParams가 topic별 빈 객체로 초기화됨
- fetchAndPublish 호출 시 pageParams[topic]이 전달됨

---

#### TC-DF-008: 동적 Param 변경 + 즉시 반영 검증

**목적:** pageParams 업데이트 후 즉시 fetchAndPublish하면 새 param이 반영되는지 검증

**사전조건:**
- topic이 등록되고 pageParams가 초기화된 상태

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 초기 pageParams[topic] = {} | 빈 param으로 fetch |
| 2 | pageParams[topic] = { filter: 'new' } | param 업데이트 |
| 3 | 즉시 fetchAndPublish | 새 param으로 fetch |
| 4 | Interval 재시작 불필요 | 참조 기반이므로 자동 반영 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@filterChanged': ({ event }) => {
        const filter = event.target?.value || 'testFilter';

        // 1. Update pageParams (참조 기반)
        this.pageParams['paramTopic'] = {
            ...this.pageParams['paramTopic'],
            filter
        };
        console.log('[DynParam] pageParams updated:', JSON.stringify(this.pageParams['paramTopic']));

        // 2. Immediate fetch
        GlobalDataPublisher.fetchAndPublish('paramTopic', this, this.pageParams['paramTopic'])
            .then(() => console.log('[DynParam] immediate fetch done'))
            .catch(err => console.log('[DynParam] error:', err.message));

        // 3. Interval은 자동으로 업데이트된 param 사용 (Stop/Start 불필요)
        console.log('[DynParam] no interval restart needed');
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

```javascript
// 컴포넌트 register 탭
// 2초 후 필터 변경 이벤트 발행
setTimeout(() => {
    Weventbus.emit('@filterChanged', {
        event: { target: { value: 'newFilter' } },
        targetInstance: this
    });
}, 2000);
```

**Playwright 검증:**

```typescript
const dynParamLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[DynParam]')) {
    dynParamLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// pageParams 업데이트 확인
const updateLog = dynParamLogs.find(l => l.includes('pageParams updated:'));
expect(updateLog).toContain('newFilter');

// 즉시 fetch 확인
expect(dynParamLogs.some(l =>
  l.includes('immediate fetch done') ||
  l.includes('error:')
)).toBe(true);

// Interval 재시작 불필요
expect(dynParamLogs.some(l => l.includes('no interval restart needed'))).toBe(true);
```

**통과 기준:**
- pageParams 업데이트 후 즉시 fetchAndPublish하면 새 param이 반영됨
- Interval Stop/Start 없이 참조 기반으로 자동 반영됨

---

#### TC-DF-009: 빈 응답 처리 검증

**목적:** 구독자 핸들러에서 빈 응답(data 없음)을 안전하게 처리하는지 검증

**사전조건:**
- 구독자가 `const { data } = response; if (!data) return;` 패턴을 사용

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | response.data가 null인 데이터 수신 | 핸들러 호출됨 |
| 2 | `if (!data) return;` 체크 | 렌더링 로직 스킵 |
| 3 | 에러 발생 없음 | 정상 종료 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = { 'emptyTopic': ['renderData'] };
this.renderData = function({ response }) {
    console.log('[EmptyResp] handler called');
    const { data } = response;
    if (!data) {
        console.log('[EmptyResp] no data, returning early');
        return;
    }
    console.log('[EmptyResp] rendering data:', data);
}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);
```

**Playwright 검증:**

```typescript
const emptyLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[EmptyResp]')) {
    emptyLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(5000);

// 핸들러가 호출됨
expect(emptyLogs.some(l => l.includes('handler called'))).toBe(true);

// 빈 응답일 경우 early return
if (emptyLogs.some(l => l.includes('no data, returning early'))) {
  // 렌더링 로직이 실행되지 않음
  expect(emptyLogs.some(l => l.includes('rendering data:'))).toBe(false);
}

// 에러 없이 정상 동작
// (unhandled rejection이 발생하지 않음)
```

**통과 기준:**
- 빈 응답(data 없음) 시 에러 없이 early return으로 처리됨
- 렌더링 로직이 실행되지 않음

---

## 4. Interval 관리 테스트

### 4.1 개요

Interval 관리는 topic별 독립적인 주기적 데이터 갱신을 담당합니다.
startAllIntervals/stopAllIntervals로 일괄 관리하며, pageParams 참조 기반으로 param 변경이 자동 반영됩니다.

**README 근거:** lines 280-325

### 4.2 테스트 대상

| 대상 | 핵심 API |
|------|----------|
| Interval 시작/중단 | startAllIntervals, stopAllIntervals |
| Interval 저장소 | pageIntervals |
| 주기 설정 | refreshInterval |
| 참조 기반 업데이트 | pageParams |

---

### 4.3 테스트 시나리오

#### TC-IV-001: refreshInterval 정의 및 동작 검증

**목적:** pageDataMappings에 refreshInterval이 정의된 topic이 주기적으로 fetchAndPublish를 실행하는지 검증

**사전조건:**
- refreshInterval이 설정된 topic이 pageDataMappings에 포함됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | refreshInterval: 3000으로 설정 | 3초 간격 설정 |
| 2 | startAllIntervals 호출 | pageIntervals[topic] = setInterval(...) |
| 3 | 6초 대기 | fetchAndPublish가 최소 2회 이상 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

let fetchCount = 0;

this.pageDataMappings = [
    {
        topic: 'intervalTopic',
        datasetInfo: {
            datasetName: 'testApi',
            param: {}
        },
        refreshInterval: 3000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {}),
    each(({ topic }) =>
        fetchAndPublish(topic, this)
            .then(() => {
                fetchCount++;
                console.log('[Interval] initial fetch, count:', fetchCount);
            })
            .catch(err => console.log('[Interval] error:', err.message))
    )
);

this.startAllIntervals = () => {
    this.pageIntervals = {};

    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .then(() => {
                            fetchCount++;
                            console.log('[Interval] periodic fetch, count:', fetchCount);
                        })
                        .catch(err => console.log('[Interval] error:', err.message));
                }, refreshInterval);
            }
        })
    );
};

this.stopAllIntervals = () => {
    go(
        Object.values(this.pageIntervals || {}),
        each(interval => clearInterval(interval))
    );
};

this.startAllIntervals();
console.log('[Interval] intervals started');
```

**Playwright 검증:**

```typescript
const intervalLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Interval]')) {
    intervalLogs.push(msg.text());
  }
});

// 7초 대기 (초기 1회 + 3초 간격 2회 = 최소 3회)
await previewPage.waitForTimeout(7000);

// Interval 시작 확인
expect(intervalLogs.some(l => l.includes('intervals started'))).toBe(true);

// 주기적 fetch 확인 (최소 2회 이상 periodic fetch)
const periodicLogs = intervalLogs.filter(l => l.includes('periodic fetch'));
expect(periodicLogs.length).toBeGreaterThanOrEqual(2);
```

**통과 기준:**
- refreshInterval로 설정된 주기마다 fetchAndPublish가 자동 실행됨
- pageIntervals[topic]에 setInterval ID가 저장됨

---

#### TC-IV-002: refreshInterval 없는 topic 검증

**목적:** refreshInterval이 없는 topic은 interval이 설정되지 않고 최초 1회만 fetch되는지 검증

**사전조건:**
- refreshInterval이 없는 topic이 pageDataMappings에 포함됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | refreshInterval 미설정 topic | interval 미등록 |
| 2 | startAllIntervals 호출 | 해당 topic은 pageIntervals에 포함 안 됨 |
| 3 | 5초 대기 | fetchAndPublish 1회만 호출됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

let noIntervalCount = 0;

this.pageDataMappings = [
    {
        topic: 'noIntervalTopic',
        datasetInfo: {
            datasetName: 'testApi',
            param: {}
        }
        // refreshInterval 없음
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {}),
    each(({ topic }) =>
        fetchAndPublish(topic, this)
            .then(() => {
                noIntervalCount++;
                console.log('[NoInterval] fetch count:', noIntervalCount);
            })
            .catch(err => console.log('[NoInterval] error:', err.message))
    )
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .then(() => {
                            noIntervalCount++;
                            console.log('[NoInterval] fetch count:', noIntervalCount);
                        })
                        .catch(err => console.log('[NoInterval] error:', err.message));
                }, refreshInterval);
            }
        })
    );
    console.log('[NoInterval] pageIntervals keys:', Object.keys(this.pageIntervals).join(', ') || 'none');
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
const noIntLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[NoInterval]')) {
    noIntLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(6000);

// pageIntervals에 해당 topic 없음
expect(noIntLogs.some(l => l.includes('pageIntervals keys: none') || l.includes('pageIntervals keys:'))).toBe(true);

// fetch 1회만 호출
const fetchLogs = noIntLogs.filter(l => l.includes('fetch count:'));
expect(fetchLogs.length).toBe(1);
```

**통과 기준:**
- refreshInterval이 없는 topic은 interval이 설정되지 않음
- 최초 1회만 fetch됨

---

#### TC-IV-003: startAllIntervals 동작 검증

**목적:** startAllIntervals가 pageDataMappings를 순회하며 refreshInterval이 있는 것만 등록하는지 검증

**사전조건:**
- pageDataMappings에 interval 있는 topic과 없는 topic이 혼재

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 2개 topic 정의 (1개만 refreshInterval 있음) | 혼합 설정 |
| 2 | startAllIntervals 호출 | refreshInterval 있는 것만 등록 |
| 3 | pageIntervals 키 확인 | 1개 topic만 포함 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

this.pageDataMappings = [
    {
        topic: 'withInterval',
        datasetInfo: { datasetName: 'api1', param: {} },
        refreshInterval: 5000
    },
    {
        topic: 'withoutInterval',
        datasetInfo: { datasetName: 'api2', param: {} }
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .catch(err => console.log('[StartAll] error:', err.message));
                }, refreshInterval);
            }
        })
    );
    console.log('[StartAll] pageIntervals keys:', Object.keys(this.pageIntervals).join(', '));
    console.log('[StartAll] interval count:', Object.keys(this.pageIntervals).length);
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
const startAllLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[StartAll]')) {
    startAllLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// interval 있는 topic만 등록됨
expect(startAllLogs.some(l => l.includes('pageIntervals keys: withInterval'))).toBe(true);
expect(startAllLogs.some(l => l.includes('interval count: 1'))).toBe(true);
```

**통과 기준:**
- startAllIntervals가 refreshInterval이 있는 topic만 pageIntervals에 등록함
- refreshInterval이 없는 topic은 건너뜀

---

#### TC-IV-004: stopAllIntervals 동작 검증

**목적:** stopAllIntervals가 모든 interval을 clearInterval로 중단하는지 검증

**사전조건:**
- startAllIntervals로 interval이 실행 중

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | startAllIntervals로 interval 시작 | 주기적 fetch 실행 |
| 2 | stopAllIntervals 호출 | clearInterval 실행 |
| 3 | 추가 대기 | 더 이상 fetch 안 됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

let stopTestCount = 0;

this.pageDataMappings = [
    {
        topic: 'stopTopic',
        datasetInfo: { datasetName: 'testApi', param: {} },
        refreshInterval: 2000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .then(() => {
                            stopTestCount++;
                            console.log('[StopAll] fetch count:', stopTestCount);
                        })
                        .catch(err => console.log('[StopAll] error:', err.message));
                }, refreshInterval);
            }
        })
    );
};

this.stopAllIntervals = () => {
    go(
        Object.values(this.pageIntervals || {}),
        each(interval => clearInterval(interval))
    );
    console.log('[StopAll] all intervals stopped, final count:', stopTestCount);
};

this.startAllIntervals();

// 5초 후 중단
setTimeout(() => {
    this.stopAllIntervals();
}, 5000);
```

**Playwright 검증:**

```typescript
const stopLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[StopAll]')) {
    stopLogs.push(msg.text());
  }
});

// 8초 대기 (5초 실행 + 3초 추가 관찰)
await previewPage.waitForTimeout(8000);

// 중단 확인
expect(stopLogs.some(l => l.includes('all intervals stopped'))).toBe(true);

// 중단 전 fetch 횟수 기록
const stoppedLog = stopLogs.find(l => l.includes('all intervals stopped'));
const finalCountMatch = stoppedLog?.match(/final count: (\d+)/);
const finalCount = parseInt(finalCountMatch?.[1] || '0');

// 중단 후 추가 fetch 없음
const fetchLogsAfterStop = stopLogs.filter(l => l.includes('fetch count:'));
const lastFetchCount = fetchLogsAfterStop.length;

// 최종 fetch count와 stopAllIntervals 이후의 fetch count가 같음
await previewPage.waitForTimeout(3000);
const totalFetchLogs = stopLogs.filter(l => l.includes('fetch count:'));
expect(totalFetchLogs.length).toBe(lastFetchCount);
```

**통과 기준:**
- stopAllIntervals 후 interval이 중단되어 더 이상 fetchAndPublish가 호출되지 않음

---

#### TC-IV-005: pageParams 참조 기반 자동 업데이트 검증

**목적:** pageParams를 변경하면 interval이 자동으로 새 param을 사용하는지 검증 (Stop/Start 불필요)

**사전조건:**
- interval이 실행 중이고 pageParams 참조를 사용

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | pageParams[topic] = {} 으로 시작 | 빈 param으로 fetch |
| 2 | pageParams[topic] = { filter: 'new' } 로 변경 | 참조 업데이트 |
| 3 | 다음 interval 실행 | 새 param으로 fetch (자동 반영) |
| 4 | interval 재시작 없음 | Stop/Start 불필요 확인 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

this.pageDataMappings = [
    {
        topic: 'refTopic',
        datasetInfo: { datasetName: 'testApi', param: {} },
        refreshInterval: 2000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    const currentParam = this.pageParams[topic] || {};
                    console.log('[RefParam] fetching with param:', JSON.stringify(currentParam));
                    fetchAndPublish(topic, this, currentParam)
                        .catch(err => console.log('[RefParam] error:', err.message));
                }, refreshInterval);
            }
        })
    );
};

this.startAllIntervals();

// 4초 후 pageParams 변경 (interval 재시작 없이)
setTimeout(() => {
    this.pageParams['refTopic'] = {
        ...this.pageParams['refTopic'],
        filter: 'updated'
    };
    console.log('[RefParam] pageParams updated (no restart)');
}, 4000);
```

**Playwright 검증:**

```typescript
const refLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RefParam]')) {
    refLogs.push(msg.text());
  }
});

// 8초 대기 (4초 빈 param + 4초 업데이트된 param)
await previewPage.waitForTimeout(8000);

// param 변경 확인
expect(refLogs.some(l => l.includes('pageParams updated (no restart)'))).toBe(true);

// 변경 전: 빈 param
const emptyParamLogs = refLogs.filter(l => l.includes('fetching with param: {}'));
expect(emptyParamLogs.length).toBeGreaterThan(0);

// 변경 후: 새 param 반영 (interval 재시작 없이)
const updatedParamLogs = refLogs.filter(l => l.includes('"filter":"updated"'));
expect(updatedParamLogs.length).toBeGreaterThan(0);
```

**통과 기준:**
- pageParams 변경 후 interval이 자동으로 새 param을 사용함
- interval Stop/Start 재시작 없이 참조 기반으로 자동 반영됨

---

#### TC-IV-006: 서로 다른 refreshInterval 독립성 검증

**목적:** topic별로 서로 다른 refreshInterval이 독립적으로 동작하는지 검증

**사전조건:**
- 2개 topic에 서로 다른 refreshInterval 설정

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | topicA: 2000ms, topicB: 4000ms | 독립 주기 설정 |
| 2 | 8초 대기 | topicA: ~4회, topicB: ~2회 |
| 3 | 호출 횟수 비교 | topicA가 topicB보다 약 2배 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

let countA = 0, countB = 0;

this.pageDataMappings = [
    {
        topic: 'fastTopic',
        datasetInfo: { datasetName: 'api1', param: {} },
        refreshInterval: 2000
    },
    {
        topic: 'slowTopic',
        datasetInfo: { datasetName: 'api2', param: {} },
        refreshInterval: 4000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    if (topic === 'fastTopic') {
                        countA++;
                        console.log('[IndepInterval] fastTopic count:', countA);
                    } else {
                        countB++;
                        console.log('[IndepInterval] slowTopic count:', countB);
                    }
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .catch(err => console.log('[IndepInterval] error:', err.message));
                }, refreshInterval);
            }
        })
    );
};

this.stopAllIntervals = () => {
    go(
        Object.values(this.pageIntervals || {}),
        each(interval => clearInterval(interval))
    );
};

this.startAllIntervals();
```

**Playwright 검증:**

```typescript
const indepLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[IndepInterval]')) {
    indepLogs.push(msg.text());
  }
});

// 9초 대기
await previewPage.waitForTimeout(9000);

// fastTopic (2s 간격) vs slowTopic (4s 간격)
const fastLogs = indepLogs.filter(l => l.includes('fastTopic count:'));
const slowLogs = indepLogs.filter(l => l.includes('slowTopic count:'));

// fastTopic이 slowTopic보다 약 2배 많이 실행됨
expect(fastLogs.length).toBeGreaterThanOrEqual(slowLogs.length * 1.5);
```

**통과 기준:**
- topic별 refreshInterval이 독립적으로 동작함
- 빠른 주기 topic이 느린 주기 topic보다 더 자주 실행됨

---

#### TC-IV-007: Interval on/off 토글 검증

**목적:** stopAllIntervals 후 startAllIntervals를 다시 호출하면 interval이 재개되는지 검증 (YAGNI: 유용)

**사전조건:**
- interval이 실행 중

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | startAllIntervals로 시작 | 주기적 fetch 실행 |
| 2 | stopAllIntervals로 중단 | fetch 중단 |
| 3 | startAllIntervals 다시 호출 | fetch 재개 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping, fetchAndPublish } = GlobalDataPublisher;
const { each, go } = fx;

let toggleCount = 0;

this.pageDataMappings = [
    {
        topic: 'toggleTopic',
        datasetInfo: { datasetName: 'testApi', param: {} },
        refreshInterval: 2000
    }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);

this.startAllIntervals = () => {
    this.pageIntervals = {};
    go(
        this.pageDataMappings,
        each(({ topic, refreshInterval }) => {
            if (refreshInterval) {
                this.pageIntervals[topic] = setInterval(() => {
                    toggleCount++;
                    console.log('[Toggle] fetch count:', toggleCount);
                    fetchAndPublish(topic, this, this.pageParams[topic] || {})
                        .catch(err => console.log('[Toggle] error:', err.message));
                }, refreshInterval);
            }
        })
    );
    console.log('[Toggle] intervals started');
};

this.stopAllIntervals = () => {
    go(
        Object.values(this.pageIntervals || {}),
        each(interval => clearInterval(interval))
    );
    console.log('[Toggle] intervals stopped');
};

this.startAllIntervals();

// 4초 후 중단
setTimeout(() => { this.stopAllIntervals(); }, 4000);

// 7초 후 재시작
setTimeout(() => { this.startAllIntervals(); }, 7000);
```

**Playwright 검증:**

```typescript
const toggleLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Toggle]')) {
    toggleLogs.push(msg.text());
  }
});

// 11초 대기 (4초 실행 + 3초 중단 + 4초 재실행)
await previewPage.waitForTimeout(11000);

// 시작 → 중단 → 재시작 순서 확인
const startIdx1 = toggleLogs.findIndex(l => l.includes('intervals started'));
const stopIdx = toggleLogs.findIndex(l => l.includes('intervals stopped'));
const startIdx2 = toggleLogs.findIndex((l, i) => i > stopIdx && l.includes('intervals started'));

expect(startIdx1).toBeGreaterThanOrEqual(0);
expect(stopIdx).toBeGreaterThan(startIdx1);
expect(startIdx2).toBeGreaterThan(stopIdx);

// 재시작 후 fetch가 다시 실행됨
const fetchLogsAfterRestart = toggleLogs.filter(
  (l, i) => i > startIdx2 && l.includes('fetch count:')
);
expect(fetchLogsAfterRestart.length).toBeGreaterThan(0);
```

**통과 기준:**
- stopAllIntervals → startAllIntervals 토글이 정상 동작함
- 재시작 후 interval이 다시 주기적으로 실행됨

---

## 5. 리소스 정리 테스트

### 5.1 개요

리소스 정리는 페이지/컴포넌트에서 생성한 리소스를 1:1 매칭으로 정리하는 패턴입니다.
생성과 정리가 반드시 쌍으로 존재해야 메모리 누수를 방지할 수 있습니다.

**README 근거:** lines 218-233, 341-357, 614-648, 496-505

### 5.2 테스트 대상

| 대상 | 생성 | 정리 |
|------|------|------|
| 페이지 EventBus | onEventBusHandlers | offEventBusHandlers + null |
| 페이지 DataMappings | registerMapping | unregisterMapping + null |
| 페이지 Intervals | startAllIntervals | stopAllIntervals + null |
| 컴포넌트 Events | bindEvents | removeCustomEvents + null |
| 컴포넌트 Subscriptions | subscribe | unsubscribe + null |
| 3D 리소스 | (3D 컴포넌트) | disposeAllThreeResources |

---

### 5.3 테스트 시나리오

#### TC-RC-001: 페이지 정리 — pageEventBusHandlers 검증

**목적:** 페이지 언로드 시 offEventBusHandlers + null 정리가 실행되는지 검증

**사전조건:**
- before_load에서 pageEventBusHandlers가 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | onEventBusHandlers(this.pageEventBusHandlers) | 핸들러 등록 |
| 2 | 페이지 언로드 시 offEventBusHandlers 호출 | 핸들러 해제 |
| 3 | this.pageEventBusHandlers = null | 참조 제거 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@testCleanup': () => console.log('[RC-EvBus] handler called')
};

onEventBusHandlers(this.pageEventBusHandlers);
console.log('[RC-EvBus] handlers registered:', !!this.pageEventBusHandlers);
```

```javascript
// 페이지 beforeUnLoad 탭
const { offEventBusHandlers } = Wkit;

offEventBusHandlers(this.pageEventBusHandlers);
console.log('[RC-EvBus] offEventBusHandlers called');

this.pageEventBusHandlers = null;
console.log('[RC-EvBus] pageEventBusHandlers nulled:', this.pageEventBusHandlers === null);
```

**Playwright 검증:**

```typescript
const rcEvBusLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-EvBus]')) {
    rcEvBusLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 등록 확인
expect(rcEvBusLogs.some(l => l.includes('handlers registered: true'))).toBe(true);

// 페이지 이동으로 언로드 트리거 후
// offEventBusHandlers 호출 확인
expect(rcEvBusLogs.some(l => l.includes('offEventBusHandlers called'))).toBe(true);

// null 정리 확인
expect(rcEvBusLogs.some(l => l.includes('pageEventBusHandlers nulled: true'))).toBe(true);
```

**통과 기준:**
- offEventBusHandlers로 핸들러 해제 후 null로 참조 제거됨

---

#### TC-RC-002: 페이지 정리 — pageDataMappings + pageParams 검증

**목적:** 페이지 언로드 시 unregisterMapping + null 정리가 실행되는지 검증

**사전조건:**
- loaded에서 pageDataMappings와 pageParams가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | registerMapping 등록 | 데이터 매핑 등록 |
| 2 | 페이지 언로드 시 unregisterMapping 순회 | 각 topic 해제 |
| 3 | this.pageDataMappings = null | 참조 제거 |
| 4 | this.pageParams = null | 참조 제거 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { registerMapping } = GlobalDataPublisher;
const { each, go } = fx;

this.pageDataMappings = [
    { topic: 'cleanupTopic', datasetInfo: { datasetName: 'api', param: {} } }
];

this.pageParams = {};

go(
    this.pageDataMappings,
    each(registerMapping),
    each(({ topic }) => this.pageParams[topic] = {})
);
console.log('[RC-Data] registered, mappings:', this.pageDataMappings.length);
console.log('[RC-Data] pageParams keys:', Object.keys(this.pageParams).join(', '));
```

```javascript
// 페이지 beforeUnLoad 탭
const { unregisterMapping } = GlobalDataPublisher;
const { each, go } = fx;

go(
    this.pageDataMappings,
    each(({ topic }) => unregisterMapping(topic))
);
console.log('[RC-Data] unregisterMapping done');

this.pageDataMappings = null;
this.pageParams = null;
console.log('[RC-Data] pageDataMappings null:', this.pageDataMappings === null);
console.log('[RC-Data] pageParams null:', this.pageParams === null);
```

**Playwright 검증:**

```typescript
const rcDataLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Data]')) {
    rcDataLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 등록 확인
expect(rcDataLogs.some(l => l.includes('registered, mappings: 1'))).toBe(true);

// 페이지 이동 후
expect(rcDataLogs.some(l => l.includes('unregisterMapping done'))).toBe(true);
expect(rcDataLogs.some(l => l.includes('pageDataMappings null: true'))).toBe(true);
expect(rcDataLogs.some(l => l.includes('pageParams null: true'))).toBe(true);
```

**통과 기준:**
- unregisterMapping으로 각 topic 해제 후 pageDataMappings, pageParams 모두 null

---

#### TC-RC-003: 페이지 정리 — pageIntervals 검증

**목적:** 페이지 언로드 시 stopAllIntervals + null 정리가 실행되는지 검증

**사전조건:**
- startAllIntervals로 interval이 실행 중

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | startAllIntervals 실행 | interval 시작 |
| 2 | 페이지 언로드 시 stopAllIntervals 호출 | clearInterval 실행 |
| 3 | this.pageIntervals = null | 참조 제거 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeUnLoad 탭 (기존 코드에 추가)
if (this.stopAllIntervals) {
    this.stopAllIntervals();
}
console.log('[RC-Intv] stopAllIntervals called');

this.pageIntervals = null;
console.log('[RC-Intv] pageIntervals null:', this.pageIntervals === null);
```

**Playwright 검증:**

```typescript
const rcIntvLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Intv]')) {
    rcIntvLogs.push(msg.text());
  }
});

// 페이지 이동으로 언로드 트리거 후
await previewPage.waitForTimeout(5000);

expect(rcIntvLogs.some(l => l.includes('stopAllIntervals called'))).toBe(true);
expect(rcIntvLogs.some(l => l.includes('pageIntervals null: true'))).toBe(true);
```

**통과 기준:**
- stopAllIntervals로 모든 interval 중단 후 pageIntervals = null

---

#### TC-RC-004: 컴포넌트 정리 — customEvents 검증

**목적:** 컴포넌트 beforeDestroy에서 removeCustomEvents + null 정리가 실행되는지 검증

**사전조건:**
- register에서 bindEvents로 customEvents가 바인딩됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | bindEvents(this, this.customEvents) | 이벤트 바인딩 |
| 2 | beforeDestroy에서 removeCustomEvents | 이벤트 해제 |
| 3 | this.customEvents = null | 참조 제거 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { bindEvents } = Wkit;

this.customEvents = {
    click: { '.item': '@itemClicked' }
};

bindEvents(this, this.customEvents);
console.log('[RC-Events] bound, customEvents:', !!this.customEvents);
```

```javascript
// 컴포넌트 beforeDestroy 탭
const { removeCustomEvents } = Wkit;

removeCustomEvents(this, this.customEvents);
console.log('[RC-Events] removeCustomEvents called');

this.customEvents = null;
console.log('[RC-Events] customEvents null:', this.customEvents === null);
```

**Playwright 검증:**

```typescript
const rcEventsLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Events]')) {
    rcEventsLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 바인딩 확인
expect(rcEventsLogs.some(l => l.includes('bound, customEvents: true'))).toBe(true);

// 페이지 이동으로 beforeDestroy 트리거 후
expect(rcEventsLogs.some(l => l.includes('removeCustomEvents called'))).toBe(true);
expect(rcEventsLogs.some(l => l.includes('customEvents null: true'))).toBe(true);
```

**통과 기준:**
- removeCustomEvents로 이벤트 해제 후 customEvents = null

---

#### TC-RC-005: 컴포넌트 정리 — subscriptions 검증

**목적:** 컴포넌트 beforeDestroy에서 unsubscribe + null 정리가 실행되는지 검증

**사전조건:**
- register에서 subscribe로 구독이 등록됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | subscribe(topic, this, handler) | 구독 등록 |
| 2 | beforeDestroy에서 unsubscribe | 구독 해제 |
| 3 | this.subscriptions = null | 참조 제거 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
const { subscribe } = GlobalDataPublisher;

this.subscriptions = { 'cleanTopic': ['renderData'] };
this.renderData = function({ response }) {}.bind(this);

const { each, go } = fx;
go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);
console.log('[RC-Sub] subscribed, subscriptions:', !!this.subscriptions);
```

```javascript
// 컴포넌트 beforeDestroy 탭
const { unsubscribe } = GlobalDataPublisher;
const { each, go } = fx;

go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);
console.log('[RC-Sub] unsubscribed');

this.subscriptions = null;
console.log('[RC-Sub] subscriptions null:', this.subscriptions === null);
```

**Playwright 검증:**

```typescript
const rcSubLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Sub]')) {
    rcSubLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

expect(rcSubLogs.some(l => l.includes('subscribed, subscriptions: true'))).toBe(true);

// 페이지 이동 후
expect(rcSubLogs.some(l => l.includes('unsubscribed'))).toBe(true);
expect(rcSubLogs.some(l => l.includes('subscriptions null: true'))).toBe(true);
```

**통과 기준:**
- unsubscribe로 구독 해제 후 subscriptions = null

---

#### TC-RC-006: 컴포넌트 정리 — 바인딩/상태 검증

**목적:** 컴포넌트 beforeDestroy에서 renderData = null, _state = null 등 바인딩과 상태가 정리되는지 검증

**사전조건:**
- register에서 renderData와 _state가 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | this.renderData = fn.bind(this) | 바인딩된 함수 설정 |
| 2 | this._state = value | 상태 설정 |
| 3 | beforeDestroy에서 null 정리 | 바인딩 + 상태 모두 null |

**주입 코드 (CodeBox에 입력):**

```javascript
// 컴포넌트 register 탭
function renderData({ response }) { /* 렌더링 로직 */ }

this.renderData = renderData.bind(this);
this._state = { initialized: true };

console.log('[RC-Bind] renderData type:', typeof this.renderData);
console.log('[RC-Bind] _state:', JSON.stringify(this._state));
```

```javascript
// 컴포넌트 beforeDestroy 탭
this.renderData = null;
this._state = null;

console.log('[RC-Bind] renderData null:', this.renderData === null);
console.log('[RC-Bind] _state null:', this._state === null);
```

**Playwright 검증:**

```typescript
const rcBindLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Bind]')) {
    rcBindLogs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// register에서 설정됨
expect(rcBindLogs.some(l => l.includes('renderData type: function'))).toBe(true);

// beforeDestroy에서 null 정리
expect(rcBindLogs.some(l => l.includes('renderData null: true'))).toBe(true);
expect(rcBindLogs.some(l => l.includes('_state null: true'))).toBe(true);
```

**통과 기준:**
- renderData, _state 등 바인딩/상태가 beforeDestroy에서 null 정리됨

---

#### TC-RC-007: 3D 리소스 정리 검증

**목적:** disposeAllThreeResources가 3D 리소스를 정리하되, 인스턴스 속성을 null 처리하지 않는지 검증

**사전조건:**
- 3D 컴포넌트가 존재하는 페이지

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 3D 컴포넌트 로드 | subscriptions, customEvents 등 설정 |
| 2 | 페이지 언로드 시 disposeAllThreeResources(this) | 3D 리소스 정리 |
| 3 | 인스턴스 속성 null 확인 | customEvents, datasetInfo 등은 null 처리하지 않음 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeUnLoad 탭
const { disposeAllThreeResources } = Wkit;

disposeAllThreeResources(this);
console.log('[RC-3D] disposeAllThreeResources called');
```

> **참고:** disposeAllThreeResources는 다음을 정리합니다:
> - subscriptions 해제
> - geometry, material, texture dispose
> - Scene background 정리
>
> **주의:** 인스턴스 속성(customEvents, datasetInfo 등)을 null 처리하지 않습니다.
> 외부에서 속성을 null 처리하면 _onViewerDestroy()의 정리 로직이 실패할 수 있습니다.

**Playwright 검증:**

```typescript
const rc3dLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-3D]')) {
    rc3dLogs.push(msg.text());
  }
});

// 페이지 이동으로 언로드 트리거 후
await previewPage.waitForTimeout(5000);

expect(rc3dLogs.some(l => l.includes('disposeAllThreeResources called'))).toBe(true);
```

**통과 기준:**
- disposeAllThreeResources가 3D 리소스(geometry, material, texture)를 정리함
- 인스턴스 속성(customEvents, datasetInfo)은 null 처리하지 않음 (외부 null 금지)

---

#### TC-RC-008: 정리 순서 검증

**목적:** 페이지 언로드 시 리소스 정리가 올바른 순서로 실행되는지 검증

**사전조건:**
- 페이지에 EventBus, DataPublisher, Interval, Three.js 리소스 모두 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | stopAllIntervals | Interval 중단 (1순위) |
| 2 | offEventBusHandlers | EventBus 정리 (2순위) |
| 3 | unregisterMapping | DataPublisher 정리 (3순위) |
| 4 | disposeAllThreeResources | Three.js 정리 (4순위) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeUnLoad 탭
const { offEventBusHandlers, disposeAllThreeResources } = Wkit;
const { unregisterMapping } = GlobalDataPublisher;
const { each, go } = fx;

// 1. Interval 중단
if (this.stopAllIntervals) {
    this.stopAllIntervals();
}
console.log('[RC-Order] 1. stopAllIntervals');

// 2. EventBus 정리
offEventBusHandlers(this.pageEventBusHandlers);
this.pageEventBusHandlers = null;
console.log('[RC-Order] 2. offEventBusHandlers');

// 3. DataPublisher 정리
if (this.pageDataMappings) {
    go(
        this.pageDataMappings,
        each(({ topic }) => unregisterMapping(topic))
    );
}
this.pageDataMappings = null;
this.pageParams = null;
console.log('[RC-Order] 3. unregisterMapping');

// 4. Interval 참조 정리
this.pageIntervals = null;

// 5. Three.js 정리 (3D 컴포넌트 존재 시)
disposeAllThreeResources(this);
console.log('[RC-Order] 4. disposeAllThreeResources');
```

**Playwright 검증:**

```typescript
const orderLogs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[RC-Order]')) {
    orderLogs.push(msg.text());
  }
});

// 페이지 이동으로 언로드 트리거 후
await previewPage.waitForTimeout(5000);

// 순서 검증
const stopIdx = orderLogs.findIndex(l => l.includes('1. stopAllIntervals'));
const evBusIdx = orderLogs.findIndex(l => l.includes('2. offEventBusHandlers'));
const dataIdx = orderLogs.findIndex(l => l.includes('3. unregisterMapping'));
const threeIdx = orderLogs.findIndex(l => l.includes('4. disposeAllThreeResources'));

expect(stopIdx).toBeGreaterThanOrEqual(0);
expect(evBusIdx).toBeGreaterThan(stopIdx);
expect(dataIdx).toBeGreaterThan(evBusIdx);
expect(threeIdx).toBeGreaterThan(dataIdx);
```

**통과 기준:**
- 정리 순서: Interval 중단 → EventBus 정리 → DataPublisher 정리 → Three.js 정리

---

#### TC-RC-009: 메모리 누수 검증

**목적:** 반복 로드/언로드 후 heap 증가율을 확인하여 메모리 누수가 없는지 검증

**사전조건:**
- 리소스 정리가 올바르게 구현된 페이지

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 페이지 로드 → heap 측정 | 초기 메모리 기준 |
| 2 | 페이지 언로드 → 재로드 (5회 반복) | 각 사이클 후 heap 측정 |
| 3 | heap 증가율 확인 | 안정적 (큰 증가 없음) |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
if (performance && performance.memory) {
    console.log('[Memory] usedJSHeapSize:', performance.memory.usedJSHeapSize);
}
```

**Playwright 검증:**

```typescript
const memoryLogs: number[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[Memory] usedJSHeapSize:')) {
    const match = msg.text().match(/usedJSHeapSize: (\d+)/);
    if (match) memoryLogs.push(parseInt(match[1]));
  }
});

// 5회 반복 로드/언로드
for (let i = 0; i < 5; i++) {
  // 페이지 로드 (네비게이션 동작)
  await previewPage.waitForTimeout(3000);
  // 페이지 이동 (언로드 트리거)
  await previewPage.waitForTimeout(2000);
}

// heap 증가율 검증
if (memoryLogs.length >= 2) {
  const firstHeap = memoryLogs[0];
  const lastHeap = memoryLogs[memoryLogs.length - 1];
  const increaseRate = (lastHeap - firstHeap) / firstHeap;

  // 20% 이내 증가 허용 (GC 타이밍에 따른 변동)
  expect(increaseRate).toBeLessThan(0.2);
}
```

**통과 기준:**
- 5회 반복 로드/언로드 후 heap 증가율이 20% 이내
- 리소스 정리 누락으로 인한 메모리 누수 없음

---

## 6. fx.go 에러 핸들링 테스트

### 6.1 개요

fx.go는 reduce 기반 파이프라인으로, 에러를 처리하지 않고 전파합니다.
호출자가 반드시 에러를 처리해야 하며, catch 위치에 따라 에러 처리 전략이 결정됩니다.

**README 근거:** lines 741-957

### 6.2 테스트 대상

| 대상 | 핵심 개념 |
|------|----------|
| 에러 전파 | 유틸은 에러를 처리하지 않고 전파 |
| nop | 필터 스킵 시그널 (에러 아님) |
| catch 위치 | 끝 catch (기본), 중간 catch (주의) |
| 실행 컨텍스트 | setInterval, 이벤트 핸들러 내 catch 필수 |
| 에러 전략 | Fail-fast vs Fail-safe (격리) |

---

### 6.3 테스트 시나리오

#### TC-FX-001: fx.go 에러 전파 검증

**목적:** fx.go 파이프라인에서 에러가 처리되지 않고 전파되는지 검증

**사전조건:**
- fx.go 파이프라인이 설정됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | fx.go 파이프라인에서 에러 발생 | 에러가 다음 단계로 전파 |
| 2 | 파이프라인 끝에 catch | 에러 포착 |
| 3 | 유틸 내부에서 에러 복구 없음 | catch에 원래 에러 전달 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go } = fx;

go(
    1,
    a => a + 1,
    a => { throw new Error('pipeline error'); },
    a => {
        console.log('[FX-001] this should not execute');
        return a;
    }
).catch(e => {
    console.log('[FX-001] error caught:', e.message);
    console.log('[FX-001] error propagated to catch');
});
```

**Playwright 검증:**

```typescript
const fx001Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-001]')) {
    fx001Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 에러가 catch까지 전파됨
expect(fx001Logs.some(l => l.includes('error caught: pipeline error'))).toBe(true);
expect(fx001Logs.some(l => l.includes('error propagated to catch'))).toBe(true);

// 에러 이후 단계는 실행되지 않음
expect(fx001Logs.some(l => l.includes('this should not execute'))).toBe(false);
```

**통과 기준:**
- fx.go 유틸이 에러를 처리하지 않고 전파함
- 에러 이후 파이프라인 단계가 실행되지 않음

---

#### TC-FX-002: 비동기 파이프라인 에러 전파 검증

**목적:** Promise rejected가 파이프라인 전체를 fail-fast로 중단시키는지 검증

**사전조건:**
- 비동기 함수가 파이프라인에 포함됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 비동기 함수에서 reject | rejected Promise 발생 |
| 2 | 다음 단계 실행 여부 | 실행 안 됨 (fail-fast) |
| 3 | catch에서 에러 수신 | rejected Promise의 에러 전달 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go } = fx;

go(
    'start',
    async a => {
        console.log('[FX-002] async step 1');
        return a;
    },
    async a => {
        console.log('[FX-002] async step 2 - rejecting');
        return Promise.reject(new Error('async error'));
    },
    async a => {
        console.log('[FX-002] async step 3 - should not run');
        return a;
    }
).catch(e => {
    console.log('[FX-002] caught:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx002Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-002]')) {
    fx002Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// step 1, 2 실행됨
expect(fx002Logs.some(l => l.includes('async step 1'))).toBe(true);
expect(fx002Logs.some(l => l.includes('async step 2 - rejecting'))).toBe(true);

// step 3 실행 안 됨 (fail-fast)
expect(fx002Logs.some(l => l.includes('async step 3'))).toBe(false);

// catch에서 에러 수신
expect(fx002Logs.some(l => l.includes('caught: async error'))).toBe(true);
```

**통과 기준:**
- rejected Promise가 파이프라인을 fail-fast로 중단시킴
- 에러 이후 단계가 실행되지 않음

---

#### TC-FX-003: fx.each 내부 에러 전파 검증

**목적:** fx.each 순회 중 에러가 발생하면 순회가 중단되고 에러가 전파되는지 검증

**사전조건:**
- fx.each로 배열을 순회하는 파이프라인

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 배열 순회 중 특정 항목에서 에러 | 순회 중단 |
| 2 | 이후 항목 처리 없음 | 실행 안 됨 |
| 3 | catch에서 에러 수신 | 에러 전파됨 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each } = fx;

go(
    [1, 2, 3, 4, 5],
    each(item => {
        console.log('[FX-003] processing item:', item);
        if (item === 3) {
            throw new Error('error at item 3');
        }
    })
).catch(e => {
    console.log('[FX-003] caught:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx003Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-003]')) {
    fx003Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// item 1, 2 처리됨
expect(fx003Logs.some(l => l.includes('processing item: 1'))).toBe(true);
expect(fx003Logs.some(l => l.includes('processing item: 2'))).toBe(true);

// item 3에서 에러 → 중단
expect(fx003Logs.some(l => l.includes('caught: error at item 3'))).toBe(true);

// item 4, 5는 처리 안 됨
expect(fx003Logs.some(l => l.includes('processing item: 4'))).toBe(false);
expect(fx003Logs.some(l => l.includes('processing item: 5'))).toBe(false);
```

**통과 기준:**
- fx.each 순회 중 에러가 발생하면 순회가 중단됨
- 이후 항목이 처리되지 않음

---

#### TC-FX-004: nop 필터 스킵 검증

**목적:** L.filter 조건 불충족 시 nop으로 스킵되고 에러가 아닌지 검증

**사전조건:**
- L.filter가 포함된 파이프라인

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | L.filter로 조건 불충족 항목 | nop으로 스킵 |
| 2 | 스킵된 항목은 후속 처리 안 됨 | 정상 동작 |
| 3 | 조건 충족 항목만 처리됨 | 에러 없음 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each, filter } = fx;
const L = fx.L || fx;

const results = [];

go(
    [1, 2, 3, 4, 5],
    L.filter(n => n % 2 === 0),
    each(n => {
        results.push(n);
        console.log('[FX-004] passed filter:', n);
    })
).then(() => {
    console.log('[FX-004] completed, results:', JSON.stringify(results));
}).catch(e => {
    console.log('[FX-004] error:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx004Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-004]')) {
    fx004Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 짝수만 필터 통과
expect(fx004Logs.some(l => l.includes('passed filter: 2'))).toBe(true);
expect(fx004Logs.some(l => l.includes('passed filter: 4'))).toBe(true);

// 홀수는 스킵 (에러 아님)
expect(fx004Logs.some(l => l.includes('passed filter: 1'))).toBe(false);
expect(fx004Logs.some(l => l.includes('passed filter: 3'))).toBe(false);

// 에러 없이 완료
expect(fx004Logs.some(l => l.includes('completed'))).toBe(true);
expect(fx004Logs.some(l => l.includes('error:'))).toBe(false);
```

**통과 기준:**
- L.filter 조건 불충족 시 nop으로 스킵 (에러가 아님)
- 파이프라인이 정상 완료됨

---

#### TC-FX-005: nop vs 진짜 에러 구분 검증

**목적:** reduceF에서 nop은 acc를 반환하고, 진짜 에러는 reject로 전파되는지 검증

**사전조건:**
- nop 시그널과 진짜 에러가 혼재하는 시나리오

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 필터로 일부 스킵 (nop) | acc 유지, 순회 계속 |
| 2 | 진짜 에러 발생 | reject로 전파, 순회 중단 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each, filter } = fx;
const L = fx.L || fx;

// 케이스 1: nop만 (정상 완료)
go(
    [1, 2, 3],
    L.filter(n => n > 5), // 모두 스킵
    each(n => console.log('[FX-005] nop case - should not log:', n))
).then(() => {
    console.log('[FX-005] nop case completed (no error)');
}).catch(e => {
    console.log('[FX-005] nop case error:', e.message);
});

// 케이스 2: 진짜 에러 (reject)
go(
    [1, 2, 3],
    each(n => {
        if (n === 2) throw new Error('real error');
        console.log('[FX-005] real error case:', n);
    })
).catch(e => {
    console.log('[FX-005] real error caught:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx005Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-005]')) {
    fx005Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// nop 케이스: 정상 완료 (에러 아님)
expect(fx005Logs.some(l => l.includes('nop case completed'))).toBe(true);
expect(fx005Logs.some(l => l.includes('nop case error:'))).toBe(false);

// 진짜 에러 케이스: reject 전파
expect(fx005Logs.some(l => l.includes('real error caught: real error'))).toBe(true);
```

**통과 기준:**
- nop: 에러가 아니라 스킵, 파이프라인 정상 완료
- 진짜 에러: reject로 전파, catch에서 포착

---

#### TC-FX-006: 파이프라인 끝 catch (기본 패턴) 검증

**목적:** 에러가 파이프라인 끝까지 전파되어 한 곳에서 처리되는지 검증

**사전조건:**
- 여러 단계의 파이프라인에 끝 catch 설정

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 파이프라인 중간에서 에러 발생 | 전파 |
| 2 | 이후 단계 스킵 | 실행 안 됨 |
| 3 | .catch(e => ...) | 끝에서 일관 처리 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each } = fx;

go(
    ['a', 'b', 'c'],
    each(item =>
        go(
            item,
            x => {
                if (x === 'b') throw new Error('error at b');
                return x.toUpperCase();
            },
            x => console.log('[FX-006] processed:', x)
        )
    )
).catch(e => {
    console.log('[FX-006] end catch:', e.message);
    // 상태 복구 / 에러 UI / 중단 처리
});
```

**Playwright 검증:**

```typescript
const fx006Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-006]')) {
    fx006Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 'a'는 처리됨
expect(fx006Logs.some(l => l.includes('processed: A'))).toBe(true);

// 'b'에서 에러 → 끝 catch에서 처리
expect(fx006Logs.some(l => l.includes('end catch: error at b'))).toBe(true);
```

**통과 기준:**
- 에러가 끝까지 전파되어 한 곳(catch)에서 일관 처리됨
- 기본 권장 패턴

---

#### TC-FX-007: 중간 catch (주의) 검증

**목적:** 파이프라인 중간 catch가 에러를 fulfilled(undefined)로 변환하는 부작용을 검증

**사전조건:**
- 중간에 catch가 있는 파이프라인

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 내부 파이프라인에서 에러 | 중간 catch 실행 |
| 2 | catch에서 반환값 없음 | fulfilled(undefined) |
| 3 | 외부 파이프라인 계속 진행 | "성공"으로 인식 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each } = fx;

go(
    ['a', 'b', 'c'],
    each(item =>
        go(
            item,
            x => {
                if (x === 'b') throw new Error('error at b');
                return x;
            }
        ).catch(err => {
            console.log('[FX-007] middle catch:', err.message);
            // 반환값 없음 → resolved(undefined)
        })
    )
).then(() => {
    console.log('[FX-007] pipeline completed (appeared successful)');
}).catch(e => {
    console.log('[FX-007] end catch:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx007Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-007]')) {
    fx007Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 중간 catch에서 에러 포착
expect(fx007Logs.some(l => l.includes('middle catch: error at b'))).toBe(true);

// 파이프라인이 "성공"으로 계속됨 (부작용 주의!)
expect(fx007Logs.some(l => l.includes('pipeline completed'))).toBe(true);

// 끝 catch는 실행 안 됨 (에러가 삼켜짐)
expect(fx007Logs.some(l => l.includes('end catch:'))).toBe(false);
```

**통과 기준:**
- 중간 catch가 에러를 fulfilled(undefined)로 변환함
- 외부 파이프라인이 "성공"으로 인식함 (의도하지 않으면 버그 원인)

---

#### TC-FX-008: 중간 catch 명시적 대체값 검증

**목적:** 부분 실패를 허용할 때 중간 catch에서 명시적 대체값을 반환하는 패턴을 검증

**사전조건:**
- 의도적으로 부분 실패를 허용하는 시나리오

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 일부 항목에서 에러 발생 | 중간 catch 실행 |
| 2 | catch에서 { ok: false, error } 반환 | 명시적 대체값 |
| 3 | 다음 단계에서 대체값 확인 | ok: false로 실패 식별 가능 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, map } = fx;
const L = fx.L || fx;

go(
    ['a', 'b', 'c'],
    L.map(item =>
        go(
            item,
            x => {
                if (x === 'b') throw new Error('error at b');
                return { ok: true, data: x.toUpperCase() };
            }
        ).catch(e => ({
            ok: false,
            error: e.message
        }))
    ),
    results => {
        results.forEach((r, i) => {
            console.log('[FX-008] result ' + i + ':', JSON.stringify(r));
        });

        const failures = results.filter(r => !r.ok);
        console.log('[FX-008] failures:', failures.length);
    }
).catch(e => {
    console.log('[FX-008] unexpected error:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx008Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-008]')) {
    fx008Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// 성공 항목
expect(fx008Logs.some(l => l.includes('"ok":true') && l.includes('"data":"A"'))).toBe(true);

// 실패 항목 (명시적 대체값)
expect(fx008Logs.some(l => l.includes('"ok":false') && l.includes('"error":"error at b"'))).toBe(true);

// failures 카운트
expect(fx008Logs.some(l => l.includes('failures: 1'))).toBe(true);

// 예상치 못한 에러 없음
expect(fx008Logs.some(l => l.includes('unexpected error:'))).toBe(false);
```

**통과 기준:**
- 중간 catch에서 { ok: false, error } 형태의 명시적 대체값을 반환함
- 에러를 삼키지 않고 의미 있는 값으로 변환함

---

#### TC-FX-009: setInterval 내 catch 필수 검증

**목적:** setInterval 콜백 내에서 fx.go 호출 시 catch가 필수인지 검증 (unhandled rejection 방지)

**사전조건:**
- setInterval에서 fetchAndPublish를 호출하는 구조

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | setInterval 내 fetchAndPublish 호출 | catch 있음 |
| 2 | 에러 발생 | catch에서 처리됨 |
| 3 | unhandled rejection 없음 | 프로세스 안정 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
let intervalCatchCount = 0;

const intervalId = setInterval(() => {
    fx.go(
        'data',
        async d => {
            // 에러 시뮬레이션 (50% 확률)
            if (Math.random() > 0.5) throw new Error('interval error');
            return d;
        }
    ).catch(e => {
        intervalCatchCount++;
        console.log('[FX-009] interval catch:', e.message, 'count:', intervalCatchCount);
    });
}, 1000);

// 5초 후 정리
setTimeout(() => {
    clearInterval(intervalId);
    console.log('[FX-009] interval stopped, total catches:', intervalCatchCount);
}, 5000);
```

**Playwright 검증:**

```typescript
const fx009Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-009]')) {
    fx009Logs.push(msg.text());
  }
});

// unhandled rejection 감지
let unhandledRejection = false;
previewPage.on('pageerror', () => { unhandledRejection = true; });

await previewPage.waitForTimeout(6000);

// interval 내 catch가 에러를 처리함
expect(fx009Logs.some(l => l.includes('interval stopped'))).toBe(true);

// unhandled rejection 없음
expect(unhandledRejection).toBe(false);
```

**통과 기준:**
- setInterval 내 fx.go 호출에 catch가 있어 unhandled rejection이 발생하지 않음

---

#### TC-FX-010: 이벤트 핸들러 내 catch 검증

**목적:** 이벤트 핸들러 내에서 비동기 작업 시 catch가 필수인지 검증

**사전조건:**
- EventBus 핸들러에 비동기 작업이 포함됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | async 핸들러에서 에러 발생 | try-catch로 포착 |
| 2 | unhandled rejection 없음 | 안정적 동작 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 beforeLoad 탭
const { onEventBusHandlers } = Wkit;

this.pageEventBusHandlers = {
    '@errorEvent': async ({ event, targetInstance }) => {
        try {
            await fx.go(
                event,
                async e => {
                    throw new Error('handler error');
                }
            );
        } catch (e) {
            console.log('[FX-010] handler catch:', e.message);
        }
    }
};

onEventBusHandlers(this.pageEventBusHandlers);
```

```javascript
// 컴포넌트 register 탭
setTimeout(() => {
    Weventbus.emit('@errorEvent', { event: { type: 'test' }, targetInstance: this });
    console.log('[FX-010] event emitted');
}, 1000);
```

**Playwright 검증:**

```typescript
const fx010Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-010]')) {
    fx010Logs.push(msg.text());
  }
});

let unhandledRejection010 = false;
previewPage.on('pageerror', () => { unhandledRejection010 = true; });

await previewPage.waitForTimeout(3000);

// 핸들러 내 catch에서 에러 처리됨
expect(fx010Logs.some(l => l.includes('handler catch: handler error'))).toBe(true);

// unhandled rejection 없음
expect(unhandledRejection010).toBe(false);
```

**통과 기준:**
- 이벤트 핸들러 내 비동기 작업의 에러가 try-catch로 포착됨
- unhandled rejection이 발생하지 않음

---

#### TC-FX-011: Fail-fast 전략 검증

**목적:** 초기 로딩처럼 실패 시 전체 중단이 필요한 경우 fail-fast가 동작하는지 검증

**사전조건:**
- 여러 topic의 초기 데이터 로딩 파이프라인

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 여러 topic 순차 로딩 | 순서대로 실행 |
| 2 | 중간 topic에서 에러 | 이후 topic 로딩 중단 |
| 3 | catch에서 전체 실패 처리 | 에러 UI 또는 상태 복구 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each } = fx;

const topics = ['topicA', 'topicB', 'topicC'];

go(
    topics,
    each(topic => {
        console.log('[FX-011] loading:', topic);
        if (topic === 'topicB') {
            throw new Error('critical: topicB load failed');
        }
    })
).catch(e => {
    console.log('[FX-011] fail-fast:', e.message);
    console.log('[FX-011] entire loading aborted');
    // 에러 UI 표시 또는 재시도 로직
});
```

**Playwright 검증:**

```typescript
const fx011Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-011]')) {
    fx011Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// topicA 로딩됨
expect(fx011Logs.some(l => l.includes('loading: topicA'))).toBe(true);

// topicB에서 에러 → 전체 중단
expect(fx011Logs.some(l => l.includes('fail-fast: critical: topicB load failed'))).toBe(true);

// topicC는 로딩 안 됨
expect(fx011Logs.some(l => l.includes('loading: topicC'))).toBe(false);

// 전체 로딩 중단
expect(fx011Logs.some(l => l.includes('entire loading aborted'))).toBe(true);
```

**통과 기준:**
- Fail-fast: 중간 실패 시 이후 단계를 모두 중단함
- 사용 시점: 초기 로딩이 완전해야 할 때

---

#### TC-FX-012: Fail-safe (격리) 전략 검증

**목적:** 독립 topic의 부분 실패를 허용할 때 개별 catch로 격리가 동작하는지 검증

**사전조건:**
- 여러 독립 topic이 각각 catch로 격리됨

**테스트 단계:**

| 단계 | 행위 | 예상 결과 |
|------|------|----------|
| 1 | 여러 topic 개별 fetch | 각각 독립 실행 |
| 2 | 일부 topic 에러 | 해당 topic만 실패 |
| 3 | 나머지 topic 정상 | 격리로 전체 계속 |

**주입 코드 (CodeBox에 입력):**

```javascript
// 페이지 loaded 탭
const { go, each } = fx;

const topics = ['topicA', 'topicB', 'topicC'];

go(
    topics,
    each(topic =>
        go(
            topic,
            t => {
                if (t === 'topicB') throw new Error('topicB failed');
                console.log('[FX-012] loaded:', t);
                return t;
            }
        ).catch(e => {
            console.log('[FX-012] isolated catch:', e.message);
            return { ok: false, error: e.message };
        })
    )
).then(() => {
    console.log('[FX-012] all topics attempted (fail-safe)');
}).catch(e => {
    console.log('[FX-012] unexpected:', e.message);
});
```

**Playwright 검증:**

```typescript
const fx012Logs: string[] = [];
previewPage.on('console', (msg) => {
  if (msg.text().includes('[FX-012]')) {
    fx012Logs.push(msg.text());
  }
});

await previewPage.waitForTimeout(3000);

// topicA 성공
expect(fx012Logs.some(l => l.includes('loaded: topicA'))).toBe(true);

// topicB 실패 → 개별 catch 격리
expect(fx012Logs.some(l => l.includes('isolated catch: topicB failed'))).toBe(true);

// topicC 성공 (topicB 실패에 영향 안 받음)
expect(fx012Logs.some(l => l.includes('loaded: topicC'))).toBe(true);

// 전체 완료 (fail-safe)
expect(fx012Logs.some(l => l.includes('all topics attempted'))).toBe(true);
```

**통과 기준:**
- Fail-safe: 일부 실패해도 나머지 topic은 정상 처리됨
- 개별 catch로 에러를 격리하여 전체 파이프라인이 계속 진행됨
- 사용 시점: topic들이 독립적이고 일부 데이터 유실을 허용할 때
