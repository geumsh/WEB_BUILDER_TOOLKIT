# ContentPanel

범용 Shell 컴포넌트. 내부 `.contents` 그룹을 외부에서 주입하는 구조.

ContentPanel 자체는 **컨테이너(프레임)만 제공**하며, 내부 컨텐츠의 HTML/CSS는 주입하는 쪽이 관리한다.

---

## Config

`register.js` 상단의 `config` 객체로 초기 슬롯을 정의한다.

```javascript
const config = {
    slots: [
        { id: 'chart', html: '<div>차트 컨텐츠</div>' },
        { id: 'system', html: '<div>시스템 현황</div>' },
        { id: 'battery', html: '' }  // 빈 슬롯 (나중에 업데이트)
    ]
};
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 슬롯 고유 식별자. DOM에 `data-slot-id` 속성으로 부여 |
| `html` | `string` | 초기 innerHTML. 빈 문자열 가능 |

- 배열 순서 = 렌더링 순서
- `register.js` 실행 시 `config.slots`를 읽어 자동으로 `.contents[data-slot-id]` div를 생성

---

## API Reference

### Slot API (권장)

슬롯 ID 기반으로 개별 컨텐츠를 관리한다.

#### `updateSlot(slotId, html)`

해당 슬롯의 innerHTML을 교체한다. 슬롯이 없으면 새로 생성한다 (upsert).

```javascript
// 기존 슬롯 업데이트
this.updateSlot('chart', '<div>새로운 차트</div>');

// 새 슬롯 추가 (존재하지 않는 ID → 자동 생성)
this.updateSlot('extra', '<div>추가 컨텐츠</div>');
```

#### `getSlot(slotId)`

슬롯 DOM 요소를 반환한다. 없으면 `null`.

```javascript
const chartSlot = this.getSlot('chart');
if (chartSlot) {
    // DOM 직접 조작 가능
}
```

#### `removeSlot(slotId)`

해당 슬롯을 제거한다.

```javascript
this.removeSlot('system');
```

### Bulk API (레거시)

기존 호환을 위해 유지. 슬롯 ID 없이 `.contents`를 일괄 관리한다.

#### `renderContents(contentsHtmlArray)`

모든 `.contents`를 제거하고 배열의 각 항목으로 새로 생성한다.

```javascript
this.renderContents([
    '<div>컨텐츠 1</div>',
    '<div>컨텐츠 2</div>'
]);
```

#### `appendContents(contentsHtml)`

기존 내용 유지하면서 `.contents` 하나를 추가한다.

```javascript
this.appendContents('<div>추가 컨텐츠</div>');
```

#### `clearContents()`

모든 `.contents`를 제거한다.

```javascript
this.clearContents();
```

---

## 사용 패턴

### 패턴 1: Config 기반 초기화 + 페이지에서 업데이트

가장 권장하는 패턴. config에 초기 슬롯을 정의하고, 데이터 수신 시 개별 슬롯만 업데이트.

```javascript
// config
const config = {
    slots: [
        { id: 'chart', html: initialChartHtml },
        { id: 'status', html: initialStatusHtml }
    ]
};

// 페이지에서 데이터 수신 시
page.onData = function(data) {
    component.updateSlot('chart', buildChartHtml(data.chart));
    // status 슬롯은 변경 없으므로 그대로 유지
};
```

### 패턴 2: 빈 슬롯 + 동적 업데이트

config에 빈 슬롯만 정의하고, 데이터가 준비되면 채운다.

```javascript
// config
const config = {
    slots: [
        { id: 'chart', html: '' },
        { id: 'status', html: '' }
    ]
};

// 데이터 로드 완료 후
component.updateSlot('chart', chartHtml);
component.updateSlot('status', statusHtml);
```

### 패턴 3: 레거시 Bulk API

기존 방식. 슬롯 ID 없이 배열 기반으로 일괄 교체.

```javascript
// config.slots는 빈 배열
const config = { slots: [] };

// 페이지에서 직접 호출
component.renderContents([html1, html2, html3]);
```

---

## 주의사항

1. **CSS는 주입하는 쪽이 관리**: ContentPanel은 `.content-panel`과 `.contents`의 레이아웃만 제공. 내부 컨텐츠의 스타일은 주입하는 컴포넌트/페이지가 관리해야 한다.

2. **Bulk API와 Slot API 혼용 금지**: `renderContents()`는 `panel.innerHTML = ''`로 모든 슬롯을 제거한다. Slot API로 관리하는 슬롯도 함께 사라지므로, 한 컴포넌트에서 두 방식을 섞어 사용하지 않는다.

3. **슬롯 ID 규칙**: `data-slot-id` 속성으로 관리되므로, ID는 CSS selector에서 유효한 문자열이어야 한다 (영문, 숫자, 하이픈, 언더스코어).

---

## 파일 구조

```
ContentPanel/
├── views/
│   └── component.html    # Shell HTML (.content-panel 컨테이너)
├── styles/
│   └── component.css     # Shell CSS (컨테이너 + .contents 레이아웃)
├── scripts/
│   ├── register.js       # Config + API 바인딩 + initFromConfig
│   └── beforeDestroy.js  # API null 처리
├── preview.html          # Config 기반 초기화 + Slot API 데모
└── README.md             # 이 문서
```
