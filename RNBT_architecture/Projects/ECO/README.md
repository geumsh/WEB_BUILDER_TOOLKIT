# ECO (Energy & Cooling Operations) Dashboard

데이터센터 전력/냉방 장비 모니터링 대시보드

---

## 프로젝트 구조

```
ECO/
├── API_SPEC.md           # Asset API v1 명세
├── datasetList.json      # 데이터셋 정의 (7개)
├── README.md             # 이 문서
├── mock_server/          # Express 기반 Mock Server
│   ├── server.js         # API 구현
│   └── package.json
└── page/
    ├── components/       # 5개 컴포넌트
    │   ├── AssetList/    # 자산 목록 (2D)
    │   ├── UPS/          # 무정전 전원장치 (3D 팝업)
    │   ├── PDU/          # 분전반 (3D 팝업)
    │   ├── CRAC/         # 항온항습기 (3D 팝업)
    │   └── TempHumiditySensor/  # 온습도 센서 (3D 팝업)
    └── page_scripts/
        ├── before_load.js    # 이벤트 핸들러 + 3D raycasting
        ├── loaded.js         # GlobalDataPublisher 데이터 발행
        └── before_unload.js  # 정리 (구독, 이벤트, 3D 리소스)
```

---

## API 명세 (Asset API v1)

ECO는 **Asset API v1** (POST 기반)을 사용합니다.

### 엔드포인트

| API | 메서드 | 설명 |
|-----|--------|------|
| `/api/v1/ast/l` | POST | 자산 전체 목록 조회 |
| `/api/v1/ast/la` | POST | 자산 목록 조회 (페이징) |
| `/api/v1/ast/g` | POST | 자산 단건 조회 |
| `/api/v1/ast/gx` | POST | 자산 상세 조회 (통합 API) |
| `/api/v1/rel/l` | POST | 관계 전체 목록 조회 |
| `/api/v1/rel/la` | POST | 관계 목록 조회 (페이징) |
| `/api/v1/rel/g` | POST | 관계 단건 조회 |

### 통합 API (`/api/v1/ast/gx`)

자산 기본 정보(asset)와 동적 프로퍼티(properties)를 한 번에 조회합니다.

**Request**:
```json
{
  "assetKey": "ups-0001",
  "locale": "ko"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "asset": {
      "assetKey": "ups-0001",
      "name": "UPS 0001",
      "assetType": "UPS",
      "statusType": "ACTIVE",
      "locationLabel": "서버실 A",
      "serialNumber": "SN-ups-0001",
      "installDate": "2024-01-15"
    },
    "properties": [
      { "fieldKey": "rated_power_kw", "value": 75, "label": "정격 전력", "helpText": "...", "displayOrder": 1 },
      { "fieldKey": "battery_capacity_ah", "value": 150, "label": "배터리 용량", "helpText": "...", "displayOrder": 2 }
    ]
  }
}
```

상세 API 명세는 `API_SPEC.md` 참조.

---

## 데이터셋 정의 (datasetList.json)

| 데이터셋 | API | 설명 |
|----------|-----|------|
| `assetList` | `/api/v1/ast/l` | 자산 전체 목록 조회 |
| `assetListPaged` | `/api/v1/ast/la` | 자산 목록 조회 (페이징) |
| `assetDetail` | `/api/v1/ast/g` | 자산 단건 조회 |
| `assetDetailUnified` | `/api/v1/ast/gx` | 자산 상세 조회 (통합) |
| `relationList` | `/api/v1/rel/l` | 관계 전체 목록 조회 |
| `relationChildren` | `/api/v1/rel/l` | 특정 부모의 자식 관계 조회 |
| `relationParent` | `/api/v1/rel/l` | 특정 자산의 부모 관계 조회 |

---

## 컴포넌트

### AssetList (2D 컴포넌트)

**역할**: 자산 목록 표시, 트리 뷰, 검색/필터링 UI

**데이터 흐름**:
- GlobalDataPublisher의 `assetList`, `relationList` topic 구독
- 페이지(loaded.js)에서 데이터 발행 → 컴포넌트가 수신하여 렌더링

**이벤트**:
- 내부: 검색, 타입 필터, 상태 필터 (컴포넌트 자체 UI 상태)
- 외부: `@assetSelected`, `@assetNodeSelected`

### 3D 팝업 컴포넌트 (UPS, PDU, CRAC, TempHumiditySensor)

**역할**: 3D 모델링된 장비 표현 + 상세 팝업

**데이터 흐름**:
- 3D 오브젝트 클릭 → `@assetClicked` 이벤트 발행
- 페이지 핸들러가 `showDetail()` 호출
- `fetchData('assetDetailUnified', { assetKey, locale })` → 통합 API 조회
- `renderAssetInfo()` + `renderProperties()` → 팝업에 동적 렌더링

**사용 Mixin**:
- `applyShadowPopupMixin` - Shadow DOM 팝업
- `applyEChartsMixin` - 차트 (선택적)
- `applyTabulatorMixin` - 테이블 (PDU 등)

**Public Methods**:
```javascript
showDetail()   // 팝업 표시 + 데이터 로드
hideDetail()   // 팝업 숨김
```

---

## 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  Page (loaded.js)                                               │
│                                                                 │
│  globalDataMappings → GlobalDataPublisher.fetchAndPublish       │
│       ↓                                                         │
│  'assetList' / 'relationList' topic 발행                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  AssetList (subscribe)                                          │
│                                                                 │
│  구독: 'assetList' → renderTable()                              │
│        'relationList' → buildTree()                             │
│                                                                 │
│  외부: @assetSelected → 페이지가 해당 3D 인스턴스 찾아 처리     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  3D 오브젝트 클릭                                               │
│                                                                 │
│  @assetClicked → before_load.js 핸들러                          │
│       → targetInstance.showDetail()                             │
│       → fetchData('assetDetailUnified', { assetKey, locale })   │
│       → renderAssetInfo(asset) + renderProperties(properties)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 이벤트 설계

### 핵심 원칙

```
컴포넌트는 이벤트 발송만 → 페이지가 제어권 보유 → Public API 호출
```

### 페이지 핸들러 (before_load.js)

```javascript
this.eventBusHandlers = {
    // 3D 클릭 이벤트 (모든 3D 팝업 컴포넌트 공통)
    '@assetClicked': ({ event, targetInstance }) => {
        targetInstance.showDetail();
    },

    // AssetList 이벤트
    '@assetSelected': ({ event, targetInstance }) => {
        // 선택된 자산 처리
    },

    '@assetNodeSelected': ({ event, targetInstance }) => {
        // 트리 노드 선택 처리
    },
};

onEventBusHandlers(this.eventBusHandlers);
```

---

## statusType 매핑

| API statusType | UI Label | UI Data Attribute |
|----------------|----------|-------------------|
| ACTIVE | Normal | normal |
| WARNING | Warning | warning |
| CRITICAL | Critical | critical |
| INACTIVE | Inactive | inactive |
| MAINTENANCE | Maintenance | maintenance |

---

## Mock Server 실행

```bash
cd ECO/mock_server
npm install
npm start  # http://localhost:4004
```

### 서버 시작 시 출력

```
========================================
  ECO Mock Server (Asset API v1 Only)
  Running on http://localhost:4004
========================================

Asset Summary: 15000 total assets

Available endpoints:
  POST /api/v1/ast/l      - Asset list (all)
  POST /api/v1/ast/la     - Asset list (paged)
  POST /api/v1/ast/g      - Asset single
  POST /api/v1/ast/gx     - Asset detail (unified API)
  POST /api/v1/rel/l      - Relation list (all)
  POST /api/v1/rel/la     - Relation list (paged)
  POST /api/v1/rel/g      - Relation single
```

### PropertyMeta 구현 현황

| 카테고리 | 상태 |
|----------|------|
| UPS | ✅ 구현됨 |
| PDU | ⏳ 예정 |
| CRAC | ⏳ 예정 |
| SENSOR | ⏳ 예정 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-12-22 | 초안 작성 |
| 2026-01-26 | Asset API v1으로 전면 개편, 레거시 GET API 제거 |
| 2026-01-27 | /api/v1/ast/gx (통합 API) 추가, README.md 전면 업데이트 |
