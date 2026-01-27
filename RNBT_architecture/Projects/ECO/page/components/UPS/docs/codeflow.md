# UPS 컴포넌트 코드 흐름

## 개요

UPS(Uninterruptible Power Supply) 컴포넌트는 3D 환경에서 사용되는 **팝업 컴포넌트(Component With Popup)**입니다. Shadow DOM 팝업을 통해 UPS 상세 정보와 히스토리 차트를 표시합니다.

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  UPS Component With Popup                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Shadow DOM  │    │  ECharts    │    │  fetchData  │         │
│  │   Popup     │    │   Mixin     │    │   (API)     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         └──────────┬───────┴──────────┬──────┘                 │
│                    │                  │                         │
│              ┌─────▼─────┐      ┌─────▼─────┐                  │
│              │  Popup UI │      │   Chart   │                  │
│              │  Render   │      │  Render   │                  │
│              └───────────┘      └───────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 적용 Mixin

| Mixin | 역할 |
|-------|------|
| `applyShadowPopupMixin` | Shadow DOM 팝업 생성/관리, 외부 클릭 닫기, 드래그 |
| `applyEChartsMixin` | ECharts 차트 인스턴스 관리, 리사이즈 핸들링 |

---

## 주요 설정

상세 내용은 [config.md](./config.md) 참조

| Config | 역할 |
|--------|------|
| `datasetInfo` | API 호출 ↔ 렌더링 함수 매핑 |
| `baseInfoConfig` | asset 객체 → 헤더 UI 매핑 |
| `fieldsContainerSelector` | 동적 필드 컨테이너 |
| `chartConfig` | 차트 렌더링 설정 |
| `templateConfig` | 팝업 템플릿 ID |
| `popupCreatedConfig` | 팝업 생성 후 초기화 |

---

## 코드 흐름

### 1. 초기화 (register.js 로드)

```
┌─────────────────────────────────────────────────────────────────┐
│  register.js 실행                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. _defaultAssetKey 설정 (setter.assetInfo.assetKey || id)     │
│  2. datasetInfo 정의 (assetDetailUnified)                       │
│  3. 변환 함수 바인딩 (statusTypeToLabel, formatDate 등)         │
│  4. baseInfoConfig 정의 (name, locationLabel, statusType)       │
│  5. fieldsContainerSelector 정의                                │
│  6. chartConfig 정의                                            │
│  7. 렌더링 함수 바인딩 (renderAssetInfo, renderProperties 등)   │
│  8. customEvents 정의 + bind3DEvents 호출                       │
│  9. templateConfig 정의                                         │
│  10. popupCreatedConfig 정의                                    │
│  11. applyShadowPopupMixin(this) 적용                           │
│  12. applyEChartsMixin(this) 적용                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. 3D 클릭 → showDetail()

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자가 3D UPS 클릭                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. bind3DEvents에서 등록한 click 이벤트 발생                   │
│     └─→ customEvents.click = '@assetClicked' 발행              │
│                                                                 │
│  2. Page의 @assetClicked 핸들러 호출                            │
│     └─→ targetInstance.showDetail()                            │
│                                                                 │
│  3. showDetail() 내부:                                          │
│     ├─→ this.showPopup() (Shadow DOM 팝업 표시)                │
│     │                                                           │
│     └─→ fx.go(this.datasetInfo, ...) 실행                      │
│             │                                                   │
│             └─→ 각 datasetInfo에 대해:                          │
│                     │                                           │
│                     ├─→ fetchData(page, datasetName, params)   │
│                     │       params: { assetKey, locale: 'ko' } │
│                     │                                           │
│                     └─→ 응답 처리:                              │
│                             ├─→ 에러 시 renderError() 호출     │
│                             └─→ 성공 시 render[] 함수들 호출   │
│                                     ├─→ renderAssetInfo()      │
│                                     └─→ renderProperties()     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 자산 정보 렌더링 (renderAssetInfo)

API 응답의 `data.asset` 객체를 헤더 영역에 렌더링:

```javascript
function renderAssetInfo({ response }) {
    const { data } = response;
    if (!data || !data.asset) {
        renderError.call(this, '자산 데이터가 없습니다.');
        return;
    }

    const asset = data.asset;

    // baseInfoConfig 순회하며 헤더 영역 렌더링
    fx.go(
        this.baseInfoConfig,
        fx.each(({ key, selector, dataAttr, transform }) => {
            const el = this.popupQuery(selector);
            if (!el) return;
            let value = asset[key];
            if (transform) value = transform(value);
            if (dataAttr) {
                el.dataset[dataAttr] = value;  // data-status="normal"
            } else {
                el.textContent = value;        // textContent 설정
            }
        })
    );
}
```

**매핑 결과**:
```
API: asset.name = "UPS 0001"        →  .ups-name.textContent = "UPS 0001"
API: asset.locationLabel = "서버실 A"  →  .ups-zone.textContent = "서버실 A"
API: asset.statusType = "ACTIVE"    →  .ups-status.textContent = "Normal"
API: asset.statusType = "ACTIVE"    →  .ups-status[data-status] = "normal"
```

### 4. 동적 프로퍼티 렌더링 (renderProperties)

API 응답의 `data.properties[]` 배열을 동적으로 렌더링:

```javascript
function renderProperties({ response }) {
    const { data } = response;
    if (!data || !data.properties) return;

    const container = this.popupQuery(this.fieldsContainerSelector);
    if (!container) return;

    // displayOrder로 정렬
    const sortedProperties = [...data.properties]
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // 카드 HTML 생성
    container.innerHTML = sortedProperties
        .map(({ label, value, helpText }) => {
            return `<div class="value-card" title="${helpText || ''}">
                <div class="value-label">${label}</div>
                <div class="value-data">${value ?? '-'}</div>
            </div>`;
        })
        .join('');
}
```

**API 응답 → 렌더링**:
```
properties: [
    { label: "정격 전력", value: 75, helpText: "...", displayOrder: 1 },
    { label: "배터리 용량", value: 150, helpText: "...", displayOrder: 2 },
    ...
]

렌더링 결과:
┌─────────────────────────┐
│  정격 전력        75    │
│  배터리 용량     150    │
│  효율           94.5    │
│  ...                    │
└─────────────────────────┘
```

### 5. 에러 렌더링 (renderError)

API 호출 실패 또는 데이터 없음 시 에러 상태 표시:

```javascript
function renderError(message) {
    // 헤더 영역에 에러 표시
    const nameEl = this.popupQuery('.ups-name');
    const zoneEl = this.popupQuery('.ups-zone');
    const statusEl = this.popupQuery('.ups-status');

    if (nameEl) nameEl.textContent = '데이터 없음';
    if (zoneEl) zoneEl.textContent = message;
    if (statusEl) {
        statusEl.textContent = 'Error';
        statusEl.dataset.status = 'critical';
    }

    // fields-container에 에러 메시지 표시
    const container = this.popupQuery(this.fieldsContainerSelector);
    if (container) {
        container.innerHTML = `
            <div class="value-card" style="grid-column: 1 / -1; text-align: center;">
                <div class="value-label">오류</div>
                <div class="value-data" style="color: #ef4444;">${message}</div>
            </div>
        `;
    }
}
```

### 6. 차트 렌더링 (renderChart) - 추후 활성화

```javascript
function renderChart(config, { response }) {
    const { data } = response;
    if (!data) return;
    if (!data[config.xKey]) return;  // flat 구조: data.timestamps 등

    const { optionBuilder, ...chartConfig } = config;
    const option = optionBuilder(chartConfig, data);
    this.updateChart('.chart-container', option);
}
```

---

## 이벤트 흐름

### 발행 이벤트

| 이벤트 | 발행 시점 | 설정 위치 |
|--------|----------|-----------|
| `@assetClicked` | 3D 클릭 시 | `customEvents.click` |

### 외부 클릭 닫기

```
사용자 클릭 (팝업 외부)
    │
    └─→ ShadowPopupMixin의 outsideClick 핸들러
            │
            └─→ hideDetail()
                    │
                    └─→ hidePopup() → 팝업 숨김
```

---

## Public Methods

| 메서드 | 설명 |
|--------|------|
| `showDetail()` | 팝업 표시 + 데이터 로드 |
| `hideDetail()` | 팝업 숨김 |

---

## 데이터 흐름 다이어그램

```
┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌────────────┐
│ 3D Click │────▶│ showDetail│────▶│ fetchData()  │────▶│ Mock Server│
└──────────┘     └───────────┘     └──────────────┘     └────────────┘
                                          │                    │
                                          │  /api/v1/ast/detail│
                                          │◀───────────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │  response   │
                                   │  {          │
                                   │   asset,    │
                                   │   properties│
                                   │  }          │
                                   └──────┬──────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                  ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
                  │renderAsset│     │renderProp │     │renderChart│
                  │   Info    │     │  erties   │     │  (추후)   │
                  └─────┬─────┘     └─────┬─────┘     └───────────┘
                        │                 │
                  ┌─────▼─────┐     ┌─────▼─────┐
                  │ 헤더 영역  │     │ 동적 필드  │
                  │ DOM 업데이트│    │ DOM 생성   │
                  └───────────┘     └───────────┘
```

---

## 파일 구조

```
UPS/
├── docs/
│   ├── codeflow.md     # 이 문서
│   └── config.md       # Config 명세
├── scripts/
│   ├── register.js     # 메인 로직
│   └── beforeDestroy.js # 정리 (팝업 제거, 차트 파괴)
├── styles/
│   └── component.css   # 팝업 스타일
├── views/
│   └── component.html  # 3D 모델 + 팝업 템플릿
└── preview.html        # 단독 테스트 페이지
```

---

## 참고

- [config.md](./config.md) - Config 상세 명세
- [Shadow Popup Mixin](/RNBT_architecture/Utils/Mixins/ShadowPopupMixin.js)
- [ECharts Mixin](/RNBT_architecture/Utils/Mixins/EChartsMixin.js)
- [API 명세](/RNBT_architecture/Projects/ECO/API_SPEC.md)

---

*최종 업데이트: 2026-01-27*
