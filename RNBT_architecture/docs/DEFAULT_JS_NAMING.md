# Default JS 필수 네이밍 규칙

## 1. 개요

Default JS 템플릿에서 사용하는 객체명 중 일부는 라이브러리(Wkit, GlobalDataPublisher)가 직접 참조한다.

이 문서는 **반드시 지켜야 하는 네이밍**과 **자유롭게 변경 가능한 네이밍**을 구분한다.

---

## 2. 라이브러리가 강제하는 것

### 2.1 이름이 강제되는 속성

| 속성명 | 강제 이유 | 참조 코드 |
|--------|----------|----------|
| `this.customEvents` | makeHandler/make3DHandler가 `targetInstance.customEvents` 참조 | Wkit.js:245, 284 |
| `this.subscriptions` | disposeAllThreeResources가 `instance.subscriptions` 참조하여 구독 해제 | Wkit.js:108 |

**이 이름들을 변경하면 라이브러리가 찾지 못해 동작하지 않는다.**

---

### 2.2 형태(내부 키)가 강제되는 것

#### customEvents

라이브러리가 특정 형태로 접근한다.

```javascript
// Wkit.js - makeHandler()
const triggerEvent = customEvents?.[event.type]?.[selector];

// Wkit.js - make3DHandler()
Weventbus.emit(customEvents[event.type], ...);
```

**2D 형태:**
```javascript
this.customEvents = {
    click: {                         // ← 첫 번째 레벨: eventType
        '.my-button': '@buttonClicked'  // ← 두 번째 레벨: selector → trigger
    },
    submit: {
        'form': '@formSubmitted'
    }
};
```

**3D 형태:**
```javascript
this.customEvents = {
    click: '@3dObjectClicked',       // ← eventType → trigger
    mousemove: '@3dObjectHovered'
};
```

---

#### datasetInfo

GlobalDataPublisher.fetchAndPublish()와 Wkit.fetchData()가 특정 키를 참조한다.

```javascript
// GlobalDataPublisher.js
const data = await Wkit.fetchData(page, datasetInfo.datasetName, param);
const param = { ...datasetInfo.param, ...paramUpdates };

// Wkit.js
page.dataService.call(datasetName, { param });
```

**필수 형태:**
```javascript
this.datasetInfo = [
    {
        datasetName: 'myapi',  // ✅ 필수 키 - 다른 이름 불가
        param: { ... }         // ✅ 필수 키 - 다른 이름 불가
    }
];
```

| 키 | 변경 가능 여부 | 이유 |
|----|---------------|------|
| `datasetName` | ❌ | fetchAndPublish가 `datasetInfo.datasetName`으로 접근 |
| `param` | ❌ | fetchAndPublish가 `datasetInfo.param`으로 접근 |

---

#### globalDataMappings 요소

GlobalDataPublisher.registerMapping()이 디스트럭처링으로 접근한다.

```javascript
// GlobalDataPublisher.js
registerMapping({ topic, datasetInfo }) {
    mappingTable.set(topic, datasetInfo);
}
```

**필수 형태:**
```javascript
{
    topic: 'myTopic',          // ✅ 필수 키
    datasetInfo: {             // ✅ 필수 키
        datasetName: '...',
        param: { ... }
    },
    refreshInterval: 5000      // 선택 - 사용자 정의
}
```

---

#### eventBusHandlers (onEventBusHandlers 인자)

Wkit.onEventBusHandlers()가 Object.entries로 순회한다.

```javascript
// Wkit.js
Wkit.onEventBusHandlers = function (eventBusHandlers) {
    fx.go(
        Object.entries(eventBusHandlers),
        fx.each(([eventName, handler]) => Weventbus.on(eventName, handler))
    );
};
```

**필수 형태:**
```javascript
// { eventName: handler } 형태
{
    '@myEvent': (data) => { ... },
    '@anotherEvent': (data) => { ... }
}
```

> **Note:** 변수명 자체(this.eventBusHandlers)는 자유롭게 변경 가능. 하지만 onEventBusHandlers()에 전달하는 객체의 형태는 강제.

---

## 3. 사용자 컨벤션 (지키지 않아도 됨)

라이브러리가 직접 참조하지 않는 것들. 이름을 변경해도 동작에 문제 없다.

| 객체명 | 역할 | 대안 예시 |
|--------|------|----------|
| `this.datasetInfo` | 컴포넌트 데이터셋 정보 저장 | `this.datasets`, `this.dataConfig` |
| `this.currentParams` | topic별 param 저장 | `this.params`, `this.topicParams` |
| `this.refreshIntervals` | interval ID 저장 | `this.intervals`, `this.timers` |
| `this.startAllIntervals` | interval 시작 함수 | `this.startRefresh`, `this.beginPolling` |
| `this.stopAllIntervals` | interval 중지 함수 | `this.stopRefresh`, `this.endPolling` |
| `this.raycastingEvents` | raycasting 핸들러 저장 | `this.rcEvents`, `this.threeEvents` |
| `this.renderData` | 바인딩된 함수 참조 | `this.render`, `this.bindedRender` |
| `this._internalHandlers` | 내부 이벤트 핸들러 | `this.uiHandlers`, `this.localHandlers` |
| `this.eventBusHandlers` | 핸들러 참조용 변수명 | `this.handlers`, `this.busCallbacks` |
| `this.globalDataMappings` | 매핑 참조용 변수명 | `this.dataMappings`, `this.topics` |

**단, 생성-정리 매칭은 개발자 책임이다.**

변수명을 바꿔도 되지만, 생성한 리소스는 반드시 정리해야 한다.

---

## 4. 요약 테이블

### 반드시 지켜야 함

| 구분 | 항목 | 형태 |
|------|------|------|
| 이름 | `this.customEvents` | - |
| 이름 | `this.subscriptions` | - |
| 형태 | customEvents (2D) | `{ eventType: { selector: '@trigger' } }` |
| 형태 | customEvents (3D) | `{ eventType: '@trigger' }` |
| 형태 | datasetInfo 요소 | `{ datasetName, param }` |
| 형태 | globalDataMappings 요소 | `{ topic, datasetInfo }` |
| 형태 | eventBusHandlers 인자 | `{ eventName: handler }` |

### 자유롭게 변경 가능

`datasetInfo`(변수명), `currentParams`, `refreshIntervals`, `startAllIntervals`, `stopAllIntervals`, `raycastingEvents`, `renderData`, `_internalHandlers`, `eventBusHandlers`(변수명), `globalDataMappings`(변수명)

> **Note:** `this.datasetInfo`의 변수명은 자유이지만, 내부 키(`datasetName`, `param`)는 라이브러리가 강제한다 (섹션 2.2 참조).

---

## 5. 흔한 실수

### customEvents 형태 오류

#### 2D 컴포넌트

```javascript
// ❌ 잘못됨 - selector가 첫 번째 레벨
this.customEvents = {
    '.my-button': '@buttonClicked'
};

// ✅ 올바름 - eventType이 첫 번째 레벨, selector가 두 번째 레벨
this.customEvents = {
    click: {
        '.my-button': '@buttonClicked'
    }
};
```

#### 3D 컴포넌트

```javascript
// ❌ 잘못됨 - 2D 형태를 3D에 사용
this.customEvents = {
    click: {
        '.my-mesh': '@meshClicked'  // 3D에는 selector 개념 없음
    }
};

// ✅ 올바름 - eventType → trigger 직접 매핑
this.customEvents = {
    click: '@meshClicked'
};
```

### datasetInfo 키 오류

```javascript
// ❌ 잘못됨
datasetInfo: {
    name: 'myapi',      // 'datasetName'이어야 함
    params: { ... }     // 'param'이어야 함
}

// ✅ 올바름
datasetInfo: {
    datasetName: 'myapi',
    param: { ... }
}
```

### globalDataMappings 키 오류

```javascript
// ❌ 잘못됨
{
    name: 'users',           // 'topic'이어야 함
    dataset: { ... }         // 'datasetInfo'여야 함
}

// ✅ 올바름
{
    topic: 'users',
    datasetInfo: { ... }
}
```

---

## 관련 문서

- [README.md - Default JS 템플릿](/RNBT_architecture/README.md#default-js-템플릿)
- [README.md - 컴포넌트 라이프사이클 패턴](/RNBT_architecture/README.md#컴포넌트-라이프사이클-패턴)
