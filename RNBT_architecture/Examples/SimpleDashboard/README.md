# Sample Dashboard

RNBT 아키텍처 패턴을 따르는 샘플 대시보드 프로젝트입니다.

## 구조

```
SimpleDashboard/
├── mock_server/                    # Express API 서버
│   ├── server.js
│   └── package.json
│
├── master/                         # MASTER 레이어 (앱 전역)
│   └── page/
│       ├── page_scripts/
│       │   ├── before_load.js
│       │   ├── loaded.js
│       │   └── before_unload.js
│       └── components/
│           ├── Header/             # 사용자 정보 헤더
│           └── Sidebar/            # 네비게이션 사이드바
│
├── page/                           # PAGE 레이어 (페이지별)
│   ├── page_scripts/
│   │   ├── before_load.js
│   │   ├── loaded.js
│   │   └── before_unload.js
│   └── components/
│       ├── StatsCards/             # 통계 카드 (Summary Config)
│       ├── DataTable/              # 데이터 테이블 (Tabulator)
│       └── TrendChart/             # 트렌드 차트 (ECharts)
│
├── datasetList.json                # API 엔드포인트 정의
├── preview.html                    # 전체 대시보드 프리뷰
└── README.md
```

## 실행 방법

### 1. Mock Server 실행

```bash
cd mock_server
npm install
npm start
```

서버가 http://localhost:3003 에서 실행됩니다.

### 2. Preview 확인

`preview.html`을 브라우저에서 열거나, 로컬 서버로 실행합니다:

```bash
# 프로젝트 루트에서
npx serve .
```

## API 엔드포인트

| Endpoint | Layer | Component | 설명 |
|----------|-------|-----------|------|
| GET /api/user | MASTER | Header | 사용자 정보 |
| GET /api/menu | MASTER | Sidebar | 네비게이션 메뉴 |
| GET /api/stats | PAGE | StatsCards | 통계 데이터 |
| GET /api/sales?category= | PAGE | DataTable | 판매 데이터 |
| GET /api/trend?period= | PAGE | TrendChart | 트렌드 데이터 |

## 컴포넌트 패턴

### StatsCards - Summary Config 패턴

```javascript
const config = [
    { key: 'revenue', label: 'Revenue', icon: '💰', format: (v, unit) => `${unit}${v.toLocaleString()}` },
    { key: 'orders', label: 'Orders', icon: '📦', format: (v) => v.toLocaleString() }
];
```

### DataTable - Table Config + Tabulator

```javascript
const tableConfig = {
    columns: [
        { title: 'ID', field: 'id', width: 60, hozAlign: 'center' },
        { title: 'Product', field: 'product', widthGrow: 2 },
        { title: 'Price', field: 'price', formatter: cell => `$${cell.getValue()}` }
    ]
};
```

### TrendChart - Chart Config + ECharts (styleMap 패턴)

```javascript
const chartConfig = {
    xKey: 'labels',
    styleMap: {
        Revenue: { label: 'Revenue' },
        Orders: { label: 'Orders' }
    },
    optionBuilder: getChartOptions
};
```

## 라이프사이클

각 단계마다 MASTER → PAGE 순서로 교차 실행됩니다.

```
페이지 로드
  │
  ├─[1] before_load 단계
  │    [MASTER] before_load.js     → 이벤트 핸들러 등록
  │    [PAGE] before_load.js       → 이벤트 핸들러, currentParams 초기화
  │
  ├─[2] 컴포넌트 register 단계
  │    [MASTER] 컴포넌트 register   → Header, Sidebar 초기화
  │    [PAGE] 컴포넌트 register     → StatsCards, DataTable, TrendChart 초기화
  │
  ├─[3] loaded 단계
  │    [MASTER] loaded.js          → userInfo, menuList 발행
  │    [PAGE] loaded.js            → stats, tableData, chartData 발행 + interval 시작
  │
페이지 이탈
  │
  ├─[4] before_unload 단계
  │    [MASTER] before_unload.js   → MASTER 이벤트 해제
  │    [PAGE] before_unload.js     → interval 정지, 이벤트 해제, 매핑 해제
  │
  └─[5] 컴포넌트 beforeDestroy
```

## 이벤트 흐름

| 이벤트 | 발생 위치 | 처리 위치 | 동작 |
|--------|----------|----------|------|
| @cardClicked | StatsCards | Page | 카드 클릭 로깅 |
| @rowClicked | DataTable | Page | 행 클릭 로깅 |
| @filterChanged | DataTable | Page | 카테고리 변경 → 데이터 재발행 |
| @periodChanged | TrendChart | Page | 기간 변경 → 데이터 재발행 |
| @userMenuClicked | Header | Master | 사용자 메뉴 클릭 |
| @navItemClicked | Sidebar | Master | 네비게이션 클릭 |

## 자동 갱신

| Topic | Interval | 설명 |
|-------|----------|------|
| stats | 10초 | 통계 카드 데이터 |
| chartData | 15초 | 트렌드 차트 데이터 |
| tableData | 30초 | 테이블 데이터 |
