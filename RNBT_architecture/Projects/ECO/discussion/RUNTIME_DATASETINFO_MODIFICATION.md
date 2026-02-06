# 런타임에서 datasetInfo 수정 가이드

## 개요

컴포넌트 초기화 시 `this.datasetInfo`에 데이터셋 정보가 정의된다. 런타임에서 API 파라미터를 변경하려면 **설정이 실제로 읽히는 위치**를 파악하고 해당 위치를 수정해야 한다.

> **설정은 세 곳에 분산되어 있다:**
> 1. `datasetInfo[].param` — fetch 파라미터 (API에 어떤 메트릭을 요청할지)
> 2. `this.config.chart` — 차트 렌더링 시 어떤 metricCode를 필터할지
> 3. `this.config.api.statsKeyMap` — 필터된 데이터에서 어떤 statsBody 키를 읽을지

---

## datasetInfo 구조

### 초기화 패턴

```javascript
// register.js — initComponent() 내부
const { datasetNames, api } = this.config;
const baseParam = { baseUrl: this._baseUrl, assetKey: this._defaultAssetKey, locale: this._locale };

this.datasetInfo = [
  { datasetName: datasetNames.assetDetail,   param: { ...baseParam },                                                              render: ['renderBasicInfo'],    refreshInterval: 0 },
  { datasetName: datasetNames.metricLatest,  param: { ...baseParam },                                                              render: ['renderStatusCards'],  refreshInterval: 5000 },
  { datasetName: datasetNames.metricHistory, param: { ...baseParam, ...api.trendParams, apiEndpoint: api.trendHistory },            render: ['renderTrendChart'],   refreshInterval: 5000 },
];
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `datasetName` | string | Wkit.fetchData에 전달할 데이터셋 이름 |
| `param` | object | API 요청 파라미터 (모든 fetch 파라미터 포함) |
| `render` | string[] | 응답 수신 후 호출할 렌더링 함수명 목록 |
| `refreshInterval` | number | 자동 갱신 주기 (ms). 0이면 최초 1회만 호출 |
| `_intervalId` | number\|null | (내부) setInterval ID. stopRefresh()에서 사용 |

### 컴포넌트별 datasetInfo 항목 수

| 컴포넌트 | 항목 수 | 구성 |
|----------|---------|------|
| UPS | 3 | assetDetail + metricLatest + metricHistory |
| CRAC | 3 | assetDetail + metricLatest + metricHistory |
| TempHumiditySensor | 3 | assetDetail + metricLatest + metricHistory |
| PDU | 2 | assetDetail + metricHistory (metricLatest 없음) |

> PDU는 실시간 측정값 카드가 없으므로 metricLatest를 사용하지 않는다. 컴포넌트의 UI 구성에 따라 항목 수는 달라질 수 있다.

---

## metricHistory param 구조

`config.api.trendParams`가 spread되어 param에 복사된다:

```javascript
// config.api.trendParams 예시 (UPS)
trendParams: {
  interval: '1h',
  timeRange: 24 * 60 * 60 * 1000,  // 24시간 (ms)
  metricCodes: [
    'UPS.INPUT_A_SUM', 'UPS.OUTPUT_A_SUM',
    'UPS.INPUT_V_AVG', 'UPS.OUTPUT_V_AVG',
    'UPS.INPUT_F_AVG', 'UPS.OUTPUT_F_AVG',
  ],
  statsKeys: [],       // fetch 요청용 (현재 빈 배열 — 서버가 전체 반환)
  timeField: 'time',   // 응답 데이터의 시간 필드명
},
```

초기화 후 `datasetInfo[metricHistory].param`의 최종 모습:

```javascript
{
  // baseParam에서 온 값
  baseUrl: '10.23.128.140:8811',
  assetKey: 'ups-0001',
  locale: 'ko',

  // trendParams에서 온 값
  interval: '1h',
  timeRange: 86400000,
  metricCodes: ['UPS.INPUT_A_SUM', 'UPS.OUTPUT_A_SUM', ...],
  statsKeys: [],
  timeField: 'time',

  // 별도 지정
  apiEndpoint: '/api/v1/mhs/l',

  // fetchDatasetAndRender가 매 호출마다 추가
  timeFrom: '2026-02-06 00:00:00',   // (동적 계산)
  timeTo:   '2026-02-06 14:30:00',   // (동적 계산)
}
```

### param 필드 상세

| 필드 | 용도 | 수정 위치 | 설명 |
|------|------|----------|------|
| `baseUrl` | fetch | `param` | API 서버 주소 |
| `assetKey` | fetch | `param` | 자산 식별자 |
| `locale` | fetch | `param` | 로케일 |
| `interval` | fetch | `param` | 집계 간격 (1h, 5m 등) |
| `timeRange` | fetch | `param` | 조회 시간 범위 (ms) |
| `metricCodes` | fetch | `param` | 조회할 메트릭 코드 목록 |
| `statsKeys` | fetch | `param` | 요청할 통계 키 목록 (현재 빈 배열) |
| `timeField` | render | `param` | 응답 데이터의 시간 필드명 |
| `apiEndpoint` | fetch | `param` | API 엔드포인트 경로 |
| `timeFrom` | fetch | `param` | 조회 시작 시각 (자동 계산) |
| `timeTo` | fetch | `param` | 조회 종료 시각 (자동 계산) |

---

## config.api.statsKeyMap 구조

렌더링 시 `statsBody`에서 어떤 키를 읽을지 결정하는 매핑이다. **param이 아닌 config.api에 위치한다.**

```javascript
// config.api.statsKeyMap 예시 (UPS)
statsKeyMap: {
  'UPS.INPUT_A_SUM': 'sum',
  'UPS.OUTPUT_A_SUM': 'sum',
  'UPS.INPUT_V_AVG': 'avg',
  'UPS.OUTPUT_V_AVG': 'avg',
  'UPS.INPUT_F_AVG': 'avg',
  'UPS.OUTPUT_F_AVG': 'avg',
},
```

> metricCode마다 읽어야 할 통계 키가 다를 수 있다 (전류는 `sum`, 전압은 `avg` 등). 이 매핑이 renderTrendChart에서 `row.statsBody?.[statsKey]` 접근에 사용된다.

---

## chart config의 metricCode 필터

`renderTrendChart`는 API 응답 전체를 그대로 차트에 넣지 않는다. **chart config에 정의된 metricCode로 먼저 필터링**한 후 렌더링한다. 컴포넌트마다 형태가 다르다:

### 탭 있는 컴포넌트 (UPS, PDU)

현재 활성 탭의 metricCode만 필터한다:

```javascript
// UPS — 탭마다 input/output 쌍
chart: {
  tabs: {
    current:   { inputCode: 'UPS.INPUT_A_SUM',  outputCode: 'UPS.OUTPUT_A_SUM' },
    voltage:   { inputCode: 'UPS.INPUT_V_AVG',  outputCode: 'UPS.OUTPUT_V_AVG' },
    frequency: { inputCode: 'UPS.INPUT_F_AVG',  outputCode: 'UPS.OUTPUT_F_AVG' },
  },
}

// renderTrendChart 내부
const tabConfig = tabs[this._activeTab];
const tabMetricCodes = [tabConfig.inputCode, tabConfig.outputCode];
const tabData = safeData.filter(row => tabMetricCodes.includes(row.metricCode));
```

```javascript
// PDU — 탭마다 단일 metricCode + comparison 플래그
chart: {
  tabs: {
    power: { metricCode: 'DIST.ACTIVE_POWER_TOTAL_KW', comparison: true },
  },
}
```

### 탭 없는 컴포넌트 (CRAC, TempHumiditySensor)

고정된 시리즈의 metricCode로 필터한다:

```javascript
// CRAC / TempHumiditySensor — 고정 2시리즈
chart: {
  series: {
    temp:     { metricCode: 'CRAC.SUPPLY_TEMP_C', scale: 0.1, label: '급기온도' },
    humidity: { metricCode: 'CRAC.RETURN_HUMIDITY_PCT', scale: 1.0, label: '환기습도' },
  },
}

// renderTrendChart 내부
const chartMetricCodes = [tempConfig.metricCode, humidConfig.metricCode];
const chartData = safeData.filter(row => chartMetricCodes.includes(row.metricCode));
```

### 컴포넌트별 필터 소스 정리

| 컴포넌트 | 탭 | 필터 소스 | metricCode 위치 |
|----------|-----|----------|----------------|
| UPS | O | `chart.tabs[activeTab]` | `.inputCode` / `.outputCode` |
| PDU | O | `chart.tabs[activeTab]` | `.metricCode` |
| CRAC | X | `chart.series` | `.temp.metricCode` / `.humidity.metricCode` |
| Sensor | X | `chart.series` | `.temp.metricCode` / `.humidity.metricCode` |

> **핵심**: `param.metricCodes`가 API에 요청할 전체 목록이라면, chart config의 metricCode는 **응답 중 실제 화면에 그릴 대상**을 결정한다. 둘이 맞지 않으면 데이터가 있어도 빈 차트가 되거나, 요청하지 않은 코드로 필터하게 된다.

---

## 데이터 흐름

### fetch → render 전체 흐름

```
showDetail()
  │
  ├─ 최초 전체 fetch
  │   fx.each(d => fetchDatasetAndRender(d), this.datasetInfo)
  │
  └─ 주기적 갱신 (refreshInterval > 0인 항목만)
      setInterval(() => fetchDatasetAndRender(d), d.refreshInterval)

fetchDatasetAndRender(d)
  │
  ├─ metricHistory인 경우: timeFrom/timeTo를 param에 동적 계산하여 추가
  │   param.timeFrom = ...
  │   param.timeTo = ...
  │
  ├─ Wkit.fetchData(this.page, d.datasetName, d.param)
  │
  └─ 응답 수신 후: d.render 배열의 함수들을 순회 호출
      fx.each(fn => this[fn](response), d.render)
```

### fetchDatasetAndRender 실제 코드

```javascript
// 4개 컴포넌트 공통 패턴 (UPS/CRAC/Sensor 동일, PDU는 comparison 분기 추가)
function fetchDatasetAndRender(d) {
  const { datasetNames } = this.config;
  const { datasetName, param, render } = d;

  // metricHistory는 매번 timeFrom/timeTo 갱신
  if (datasetName === datasetNames.metricHistory) {
    const now = new Date();
    const from = new Date(now.getTime() - param.timeRange);
    param.timeFrom = from.toISOString().replace('T', ' ').slice(0, 19);
    param.timeTo = now.toISOString().replace('T', ' ').slice(0, 19);
  }

  fetchData(this.page, datasetName, param)
    .then(response => {
      const data = extractData(response);
      if (!data) return;
      fx.each(fn => this[fn](response), render);
    })
    .catch(e => console.warn(`[Component] ${datasetName} fetch failed:`, e));
}
```

핵심:
- `d`는 `this.datasetInfo`의 한 항목이 직접 전달됨
- `param`은 참조이므로 `timeFrom`/`timeTo` 추가가 원본에 반영됨
- `Wkit.fetchData(page, datasetName, param)` — Wkit 래퍼 사용 (직접 fetch 아님)

### renderTrendChart에서의 설정 참조

```javascript
// renderTrendChart 내부 — 설정을 읽는 핵심 부분 (UPS 기준, 탭 있는 경우)
function renderTrendChart({ response }) {
  const { data } = response;
  const safeData = Array.isArray(data) ? data : [];

  // ① param에서 timeField 읽기
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
  const { timeField } = trendInfo?.param || {};
  const timeKey = timeField || 'time';

  // ② chart config에서 현재 탭의 metricCode로 필터링
  const tabConfig = tabs[this._activeTab];
  const tabMetricCodes = [tabConfig.inputCode, tabConfig.outputCode];
  const tabData = safeData.filter(row => tabMetricCodes.includes(row.metricCode));

  // ③ config.api.statsKeyMap에서 metricCode별 statsKey 읽기
  const timeMap = fx.reduce(
    (acc, row) => {
      const time = row[timeKey];                                        // ← param.timeField 사용
      if (!acc[time]) acc[time] = {};
      const statsKey = this.config.api.statsKeyMap[row.metricCode];     // ← config.api 사용
      acc[time][row.metricCode] = statsKey ? (row.statsBody?.[statsKey] ?? null) : null;
      return acc;
    },
    {},
    tabData   // ← 필터링된 데이터만 처리
  );
}
```

> **설정 참조가 세 곳에서 일어난다:**
> - `datasetInfo[].param.timeField` → 시간 필드명
> - `this.config.chart.tabs[activeTab]` 또는 `chart.series` → 렌더링 대상 metricCode 필터
> - `this.config.api.statsKeyMap` → metricCode별 통계 키

---

## PDU의 금일/전일 비교 패턴

PDU의 `fetchDatasetAndRender`는 `comparison: true` 탭이 있을 때 분기한다:

```javascript
// PDU만의 확장 패턴
function fetchDatasetAndRender(d) {
  if (datasetName === datasetNames.metricHistory) {
    const hasComparison = Object.values(chart.tabs).some(tab => tab.comparison);

    if (hasComparison) {
      // 금일/전일 2회 병렬 fetch
      Promise.all([
        fetchData(this.page, datasetName, { ...param, timeFrom: todayFrom, timeTo: todayTo }),
        fetchData(this.page, datasetName, { ...param, timeFrom: yesterdayFrom, timeTo: yesterdayTo }),
      ]).then(([todayResp, yesterdayResp]) => {
        this._trendDataComparison = { today: todayData, yesterday: yesterdayData };
        // render 함수 호출
      });
    } else {
      // 단일 timeRange fetch (UPS/CRAC/Sensor와 동일)
    }
    return;
  }
  // 기타 데이터셋 (assetDetail 등)
}
```

비교 탭 설정:

```javascript
chart: {
  tabs: {
    power: {
      metricCode: 'DIST.ACTIVE_POWER_TOTAL_KW',
      label: '전력사용량',
      comparison: true,    // ← 이 플래그가 있으면 금일/전일 2회 fetch
      series: {
        today:     { label: '금일', color: '#3b82f6' },
        yesterday: { label: '전일', color: '#94a3b8' },
      },
    },
  },
},
```

---

## 런타임에서 파라미터 변경하기

### 수정 위치 요약

| 변경 목적 | 수정 위치 | 예시 |
|----------|----------|------|
| 조회 시간 범위 | `datasetInfo[].param.timeRange` | 24h → 1h |
| 집계 간격 | `datasetInfo[].param.interval` | 1h → 5m |
| 조회 메트릭 | `datasetInfo[].param.metricCodes` | 전류만 조회 |
| API 엔드포인트 | `datasetInfo[].param.apiEndpoint` | v1 → v2 |
| 대상 장비 | `datasetInfo[].param.assetKey` | 다른 장비 전환 |
| 시간 필드명 | `datasetInfo[].param.timeField` | 'time' → 'eventedAt' |
| 차트 필터 메트릭 | `config.chart.tabs[]` 또는 `config.chart.series[]` | 탭/시리즈의 metricCode 변경 |
| 통계 키 변경 | `this.config.api.statsKeyMap` | avg → max |
| 갱신 주기 | `datasetInfo[].refreshInterval` | 5000 → 10000 |

### datasetInfo.param 수정

```javascript
const { datasetNames } = this.config;
const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);

if (trendInfo) {
  // 개별 수정
  trendInfo.param.interval = '5m';
  trendInfo.param.timeRange = 1 * 60 * 60 * 1000;  // 1시간

  // 여러 값 한번에 수정 (fetch 파라미터만)
  Object.assign(trendInfo.param, {
    interval: '15m',
    timeRange: 3600000,
  });
  // 주의: metricCodes 변경은 chart config, statsKeyMap과 3곳 동기화 필요 → "실전 예시" 참조
}
```

### statsKeyMap 수정

```javascript
// 기존 metricCode의 통계 키만 변경하는 경우 (같은 메트릭, 다른 통계)
this.config.api.statsKeyMap['UPS.INPUT_V_AVG'] = 'max';  // avg → max
// → 이 경우 param.metricCodes와 chart config은 변경 불필요
```

> 새 metricCode를 추가하는 경우에는 statsKeyMap만으로 부족하다. param.metricCodes + chart config + statsKeyMap 3곳 동기화가 필요하다 → "실전 예시: 특정 메트릭만 조회 + 3곳 동기화" 참조.

### 갱신 주기 변경

```javascript
// 특정 데이터셋의 갱신 주기 변경
const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
if (trendInfo) {
  trendInfo.refreshInterval = 10000;  // 10초로 변경
  // 주의: 이미 실행 중인 interval은 stopRefresh() → showDetail()로 재시작 필요
}
```

### 데이터 재요청

파라미터 수정 후 화면에 반영하려면 fetch를 다시 호출해야 한다:

```javascript
// 방법 1: 특정 datasetInfo 항목만 재요청
fetchDatasetAndRender.call(this, trendInfo);

// 방법 2: 전체 재요청 (showDetail이 모든 datasetInfo를 순회)
this.showDetail();
```

---

## 실전 예시

### 시나리오: 시간 범위를 1시간으로 변경

```javascript
function setTrendTimeRange(timeRange) {
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);

  if (trendInfo) {
    trendInfo.param.timeRange = timeRange;
    fetchDatasetAndRender.call(this, trendInfo);
  }
}

// 사용
setTrendTimeRange.call(this, 1 * 60 * 60 * 1000);  // 1시간
```

### 시나리오: 특정 메트릭만 조회 + 3곳 동기화

메트릭을 변경하려면 ① param.metricCodes, ② chart config, ③ statsKeyMap 세 곳을 모두 동기화해야 한다.

```javascript
// UPS (탭 있는 경우) — voltage 탭의 metricCode를 변경하는 예시
function changeTrendMetrics(tabName, inputCode, outputCode, statsKey) {
  const { datasetNames, chart } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
  if (!trendInfo) return;

  // ① param.metricCodes — API 요청 목록에 추가
  const codes = trendInfo.param.metricCodes;
  if (!codes.includes(inputCode)) codes.push(inputCode);
  if (!codes.includes(outputCode)) codes.push(outputCode);

  // ② chart.tabs — 렌더링 필터 대상 변경
  chart.tabs[tabName].inputCode = inputCode;
  chart.tabs[tabName].outputCode = outputCode;

  // ③ statsKeyMap — 값 추출 키 등록
  this.config.api.statsKeyMap[inputCode] = statsKey;
  this.config.api.statsKeyMap[outputCode] = statsKey;

  fetchDatasetAndRender.call(this, trendInfo);
}

// 사용: voltage 탭을 다른 메트릭으로 교체
changeTrendMetrics.call(this, 'voltage', 'UPS.NEW_V_IN', 'UPS.NEW_V_OUT', 'avg');
```

```javascript
// CRAC (탭 없는 경우) — 고정 시리즈의 metricCode를 변경하는 예시
function changeTrendMetrics(seriesName, newMetricCode, statsKey) {
  const { datasetNames, chart } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
  if (!trendInfo) return;

  // ① param.metricCodes
  const codes = trendInfo.param.metricCodes;
  if (!codes.includes(newMetricCode)) codes.push(newMetricCode);

  // ② chart.series — 렌더링 필터 대상 변경
  chart.series[seriesName].metricCode = newMetricCode;

  // ③ statsKeyMap
  this.config.api.statsKeyMap[newMetricCode] = statsKey;

  fetchDatasetAndRender.call(this, trendInfo);
}
```

### 시나리오: 다른 장비로 전환 (assetKey 변경)

```javascript
function switchAsset(newAssetKey) {
  // 모든 datasetInfo의 assetKey 업데이트
  this.datasetInfo.forEach(info => {
    info.param.assetKey = newAssetKey;
  });

  // 내부 상태 동기화
  this._defaultAssetKey = newAssetKey;

  // 팝업이 열려있으면 새 데이터로 갱신
  this.showDetail();
}
```

---

## 주의사항

### 1. fetch용 파라미터와 render용 설정은 위치가 다르다

```javascript
// fetch용: datasetInfo[].param에서 수정
trendInfo.param.timeRange = 3600000;
trendInfo.param.interval = '5m';

// render용: config.api에서 수정
this.config.api.statsKeyMap['UPS.INPUT_V_AVG'] = 'max';
```

### 2. metricCode 변경 시 3곳 동기화 필수

```javascript
// ❌ param.metricCodes만 바꾸면 — API는 데이터를 가져오지만 차트에 표시 안 됨
trendInfo.param.metricCodes.push('UPS.BATT_V');

// ❌ param + statsKeyMap만 바꾸면 — chart config 필터에 걸려서 여전히 빈 차트
this.config.api.statsKeyMap['UPS.BATT_V'] = 'avg';

// ✅ 세 곳 모두 동기화
trendInfo.param.metricCodes.push('UPS.BATT_V');                   // ① API 요청
this.config.chart.tabs.voltage.inputCode = 'UPS.BATT_V';         // ② 차트 필터 (탭)
// 또는 this.config.chart.series.temp.metricCode = 'UPS.BATT_V'; // ② 차트 필터 (시리즈)
this.config.api.statsKeyMap['UPS.BATT_V'] = 'avg';               // ③ 값 추출
```

### 3. 객체 자체를 교체하지 않기

```javascript
// ❌ 피해야 할 패턴: 다른 속성 유실
trendInfo.param = { timeRange: 3600000 };

// ✅ 권장: 기존 객체 유지하며 필요한 값만 수정
trendInfo.param.timeRange = 3600000;
// 또는
Object.assign(trendInfo.param, { timeRange: 3600000 });
```

### 4. config.api.trendParams 수정은 초기화 이후 무의미 (원시값 한정)

```javascript
// config.api.trendParams는 initComponent에서 spread로 param에 복사됨
// 이후 원시값(interval, timeRange 등) 수정은 param에 반영되지 않음
this.config.api.trendParams.interval = '5m';  // ❌ param.interval에 영향 없음

// 단, metricCodes 배열은 얕은 복사(참조 공유)이므로
// push/splice 등 배열 변형은 양쪽에 모두 반영됨
this.config.api.trendParams.metricCodes.push('NEW');  // ⚠️ param.metricCodes에도 반영됨
```

### 5. 갱신 주기 변경 시 interval 재시작 필요

```javascript
// refreshInterval만 바꾸면 이미 실행 중인 setInterval은 기존 주기 유지
trendInfo.refreshInterval = 10000;

// 반영하려면 기존 interval을 정리하고 재시작
this.stopRefresh();
this.showDetail();  // 새 주기로 setInterval 재설정
```

---

## 요약

### 수정 위치 맵

```
this.config
  ├── api
  │   ├── trendParams     ← 초기값 전용 (param으로 복사됨, 이후 직접 수정 무의미)
  │   └── statsKeyMap     ← ★③ 렌더링 시 직접 참조됨 (런타임 수정 유효)
  └── chart
      ├── tabs[]          ← ★② 탭별 metricCode 필터 (UPS, PDU)
      └── series[]        ← ★② 시리즈별 metricCode 필터 (CRAC, Sensor)

this.datasetInfo[]
  ├── param               ← ★① fetch 파라미터 (런타임 수정 유효)
  ├── render              ← 렌더링 함수 목록
  └── refreshInterval     ← 자동 갱신 주기
```

### metricCode 변경 시 3곳 동기화 흐름

```
metricCode를 변경하려면?
  │
  ├─ ① datasetInfo[].param.metricCodes   ← API에 어떤 메트릭을 요청할지
  │
  ├─ ② config.chart.tabs[] 또는 series[] ← 응답에서 어떤 메트릭을 필터할지
  │
  └─ ③ config.api.statsKeyMap            ← 필터된 데이터에서 어떤 값을 추출할지
```

### 일반적인 수정 흐름

```
1. 수정할 설정이 fetch 요청에 관한 것인가? (시간 범위, 간격, 엔드포인트 등)
   → Yes: datasetInfo[].param 수정

2. 수정할 설정이 메트릭 자체를 바꾸는 것인가?
   → Yes: 3곳 동기화 필요 (param.metricCodes + chart config + statsKeyMap)

3. 수정할 설정이 값 해석 방식만 바꾸는 것인가? (같은 메트릭, 다른 통계)
   → statsKey 관련: config.api.statsKeyMap 수정
   → timeField 관련: datasetInfo[].param.timeField 수정

4. 수정 후 데이터 재요청
   → fetchDatasetAndRender.call(this, targetInfo)
   → 또는 this.showDetail() (전체 재요청)
```

---

*최종 업데이트: 2026-02-06 — chart config metricCode 필터(②) 및 3곳 동기화 가이드 추가*
