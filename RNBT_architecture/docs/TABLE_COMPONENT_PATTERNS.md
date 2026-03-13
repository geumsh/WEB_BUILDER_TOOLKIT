# 테이블 컴포넌트 패턴

테이블/리스트 형태의 컴포넌트에서 반복적으로 나타나는 UI 상태 관리 패턴을 정리한다.

---

## 1. 클라이언트 필터 패턴

서버 재요청 없이 이미 받은 데이터를 클라이언트에서 필터링해 렌더링하는 패턴.

### 1.1 구조

```
_eventsData (원본 전체 데이터, 항상 유지)
    ↓
applyFilter() → 조건에 맞는 부분집합 추출
    ↓
renderRows() → DOM 렌더링
```

원본 데이터(`_eventsData`)는 절대 수정하지 않는다. 필터는 렌더링 단계에서만 적용한다.

### 1.2 상태 설계

```javascript
this._eventsData = null; // 원본 전체 데이터
this._activeFilters = new Set(); // 활성화된 필터 값 집합
```

`Set`을 사용하는 이유: 복수 선택, 토글(추가/삭제), 포함 여부 확인이 모두 O(1).

### 1.3 핵심 함수 3개

```javascript
// 1. 필터 적용 → 렌더링
function applyFilter(config) {
  if (!this._eventsData) return;
  const events =
    this._activeFilters.size === 0
      ? this._eventsData
      : this._eventsData.filter((e) =>
          this._activeFilters.has(e[config.eventFields.level]),
        );
  renderRows.call(this, config, events);
}

// 2. 필터 UI 동기화 (배지 active/inactive 클래스)
function updateFilterUI() {
  const items = this.appendElement.querySelectorAll(
    ".filter-badge[data-filter]",
  );
  const hasFilter = this._activeFilters.size > 0;
  items.forEach((item) => {
    const value = item.dataset.filter;
    item.classList.toggle("filter-active", this._activeFilters.has(value));
    item.classList.toggle(
      "filter-inactive",
      hasFilter && !this._activeFilters.has(value),
    );
  });
}

// 3. 필터 토글 핸들러
this._internalHandlers.filterClick = (e) => {
  const item = e.target.closest(".filter-badge[data-filter]");
  if (!item) return;
  const value = item.dataset.filter;
  if (this._activeFilters.has(value)) {
    this._activeFilters.delete(value);
  } else {
    this._activeFilters.add(value);
  }
  updateFilterUI.call(this);
  applyFilter.call(this, config);
};
```

### 1.4 필터 배지 HTML 요구사항

필터 역할을 하는 요소에 `data-filter` 속성으로 필터 값을 지정한다.

```javascript
// renderSummary 등에서 배지 생성 시
item.className = `filter-badge ${level}`; // level 클래스로 CSS 스타일링
item.dataset.filter = level; // data-filter로 JS 식별
```

### 1.5 필터 초기화가 필요한 시점

행 선택(`selectRow`) 등 다른 상태 변경 시 필터를 유지해야 하므로,
`renderRows` 직접 호출 대신 항상 `applyFilter`를 통해 렌더링한다.

```javascript
// ❌ 필터를 무시하고 전체 렌더링
function selectRow(config, index) {
  this._selectedRowIndex = index;
  renderRows.call(this, config, this._eventsData); // 필터 우회됨
}

// ✅ 필터를 유지한 채 렌더링
function selectRow(config, index) {
  this._selectedRowIndex = index;
  applyFilter.call(this, config); // 현재 필터 상태 반영
}
```

---

## 2. 행 객체 참조 추적 패턴

렌더링된 DOM 행에서 원본 데이터 객체를 직접 참조하는 패턴.

### 2.1 문제

필터가 적용되면 `row.dataset.index`는 필터된 배열 내 위치를 가리킨다.
필터 해제 후 같은 인덱스로 원본 데이터를 찾으면 다른 행을 가리키게 된다.

```
원본: [critical, major, minor]   → index 0 = critical
필터(major): [major]             → index 0 = major  ← 같은 index, 다른 데이터
```

### 2.2 해결: DOM 요소에 객체 참조 직접 저장

```javascript
function createRow(config, event, index) {
  const row = document.createElement("div");
  row.dataset.index = index;
  row._eventData = event; // 원본 객체 참조 보관
  // ...
  return row;
}
```

### 2.3 클릭 시 참조 추출

```javascript
this._internalHandlers.rowClick = (e) => {
  const row = e.target.closest(".table-row");
  if (row) {
    const index = parseInt(row.dataset.index, 10);
    this._selectedEvent = row._eventData || null; // 직접 참조
    this.selectRow(index);
  }
};
```

이후 `this._selectedEvent`로 인덱스 계산 없이 원본 객체에 바로 접근한다.

---

## 3. 인플레이스 뮤테이션 패턴

원본 데이터 배열 구조는 유지하면서 개별 항목의 속성만 변경하고 재렌더링하는 패턴.

### 3.1 용도

- 확인(Ack) 처리: 선택된 항목의 `isNew` 해제
- 일괄 처리(All): 전체 항목 상태 변경
- 즐겨찾기, 읽음 표시 등 아이템 단위 상태 토글

### 3.2 단일 항목 처리 (Ack)

```javascript
this._internalHandlers.ackClick = (e) => {
  const btn = e.target.closest(".btn-ack");
  if (!btn || !this._selectedEvent) return;

  // 원본 객체 직접 변경 (배열 구조 유지)
  this._selectedEvent._acked = true;
  this._selectedEvent[config.eventFields.isNew] = false;

  applyFilter.call(this, config); // 재렌더링
};
```

### 3.3 전체 일괄 처리 (All)

```javascript
this._internalHandlers.allClick = (e) => {
  const btn = e.target.closest(".btn-all");
  if (!btn || !this._eventsData) return;

  this._eventsData.forEach((event) => {
    event._acked = true;
    event[config.eventFields.isNew] = false;
  });

  applyFilter.call(this, config);
};
```

### 3.4 뮤테이션 상태를 렌더링에 반영

`createRow`에서 변경된 속성을 읽어 CSS 클래스를 부여한다.

```javascript
function createRow(config, event, index) {
  const row = document.createElement("div");
  row._eventData = event;
  if (event._acked) row.classList.add("row-acked");
  // ...
}
```

### 3.5 내부 상태 vs 데이터 필드 구분

| 종류        | 예시                              | 설명                                 |
| ----------- | --------------------------------- | ------------------------------------ |
| 내부 상태   | `event._acked`                    | 언더스코어 prefix, 서버 스키마 외부  |
| 데이터 필드 | `event[config.eventFields.isNew]` | config를 통해 접근, 서버 스키마 연동 |

서버에서 받은 필드 키는 config를 통해 간접 접근하고,
컴포넌트가 자체적으로 추가하는 런타임 상태는 `_` prefix로 구분한다.

---

## 4. 상태 초기화 타이밍

여러 상태가 얽혀 있을 때, 어떤 동작이 어떤 상태를 초기화해야 하는지 정리.

| 동작          | `_selectedRowIndex` | `_selectedEvent` |  `_activeFilters`  |
| ------------- | :-----------------: | :--------------: | :----------------: |
| 필터 변경     |      초기화 ✅      |    초기화 ✅     |       변경됨       |
| 행 클릭       |       변경됨        |      변경됨      |        유지        |
| Ack           |        유지         |       유지       |        유지        |
| All           |        유지         |       유지       |        유지        |
| 데이터 재수신 |      초기화 ✅      |    초기화 ✅     | 유지 또는 초기화\* |

\* 데이터 재수신 시 필터 유지 여부는 UX 요구사항에 따라 결정.

필터 변경 시 선택 상태를 초기화하는 이유:
필터 후 인덱스가 바뀌므로 이전 `_selectedRowIndex`가 다른 행을 가리킬 수 있다.

---

## 관련 문서

- [EVENT_HANDLING.md](/RNBT_architecture/docs/EVENT_HANDLING.md) — customEvents vs \_internalHandlers 판단 기준
- [WHY_CONFIG.md](/RNBT_architecture/docs/WHY_CONFIG.md) — config 객체로 키를 간접 참조하는 이유
