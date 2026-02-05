# 런타임에서 datasetInfo 수정 가이드

## 개요

컴포넌트 초기화 시 `this.datasetInfo`에 데이터셋 정보가 정의된다. 런타임에서 API 파라미터를 변경하려면 `datasetInfo[].param`을 직접 수정해야 한다.

> **핵심 원칙**: 모든 파라미터는 `datasetInfo[].param`에서 수정한다. (단일 수정 포인트)

---

## datasetInfo 구조

```javascript
// register.js 예시
const { datasetNames, api } = this.config;
const baseParam = { baseUrl: this._baseUrl, assetKey: this._defaultAssetKey, locale: this._locale };

this.datasetInfo = [
  { datasetName: datasetNames.assetDetail, param: { ...baseParam }, render: ['renderBasicInfo'] },
  { datasetName: datasetNames.metricLatest, param: { ...baseParam }, render: ['renderPowerStatus'] },
  { datasetName: datasetNames.metricHistory, param: { ...baseParam, ...api.trendParams, apiEndpoint: api.trendHistory }, render: ['renderTrendChart'] },
];
```

### metricHistory param 구조

```javascript
// datasetInfo[metricHistory].param 내용
{
  baseUrl: '10.23.128.125:4004',
  assetKey: 'UPS_001',
  locale: 'ko',
  interval: '1h',
  timeRange: 24 * 60 * 60 * 1000,  // 24시간 (ms)
  metricCodes: ['UPS.INPUT_A_AVG', 'UPS.OUTPUT_A_AVG', ...],
  statsKeys: ['avg'],
  timeField: 'time',              // 응답 데이터의 시간 필드명
  apiEndpoint: '/api/v1/mhs/l',
}
```

| 필드 | 설명 | 용도 |
|------|------|------|
| `datasetName` | 호출할 데이터셋 이름 | fetch |
| `param` | API 요청 파라미터 (모든 값 포함) | fetch + render |
| `render` | 응답 수신 후 호출할 렌더링 함수 목록 | render |

### param 필드 상세

| 필드 | 용도 | 설명 |
|------|------|------|
| `baseUrl` | fetch | API 서버 주소 |
| `assetKey` | fetch | 자산 식별자 |
| `interval` | fetch | 집계 간격 (1h, 5m 등) |
| `timeRange` | fetch | 조회 시간 범위 (ms) |
| `metricCodes` | fetch | 조회할 메트릭 코드 목록 |
| `statsKeys` | fetch + render | 통계 키 목록 (avg, max, min 등) |
| `timeField` | render | 응답 데이터의 시간 필드명 (기본값: 'time') |
| `apiEndpoint` | fetch | API 엔드포인트 경로 |

---

## fetchTrendData 동작 방식

`fetchTrendData`는 `datasetInfo[].param`에서 모든 값을 읽는다:

```javascript
function fetchTrendData() {
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
  if (!trendInfo) return;

  // param에서 모든 값 추출
  const { baseUrl, assetKey, interval, metricCodes, statsKeys, timeRange, apiEndpoint } = trendInfo.param;

  const now = new Date();
  const from = new Date(now.getTime() - timeRange);

  fetch(`http://${baseUrl}${apiEndpoint}`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { assetKey, interval, metricCodes, timeFrom, timeTo },
      statsKeys,
      sort: [],
    }),
  });
}
```

---

## renderTrendChart에서 param 사용

렌더링 함수도 `datasetInfo[].param`에서 값을 읽어 동적으로 데이터를 처리한다:

```javascript
function renderTrendChart({ response }) {
  const { data } = response;
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find((d) => d.datasetName === datasetNames.metricHistory);

  // param에서 렌더링 설정 추출
  const { statsKeys, timeField } = trendInfo?.param || {};
  const statsKey = statsKeys?.[0] || 'avg';  // 첫 번째 statsKey 사용
  const timeKey = timeField || 'time';        // 기본값 'time'

  // 시간별 그룹핑 (원본 시간 사용)
  const timeMap = fx.reduce(
    (acc, row) => {
      const time = row[timeKey];              // 동적 시간 필드 접근
      if (!acc[time]) acc[time] = {};
      acc[time][row.metricCode] = row.statsBody?.[statsKey] ?? null;  // 동적 stats 필드 접근
      return acc;
    },
    {},
    safeData
  );

  const times = Object.keys(timeMap);
  // xAxis: { data: times }
}
```

### 핵심 포인트

1. **동적 필드 접근**: `row[timeKey]`, `row.statsBody?.[statsKey]`로 설정값에 따라 다른 필드 참조
2. **원본 시간 사용**: `getHours()` 변환 없이 서버 시간 데이터 그대로 사용
3. **단일 수정 포인트 유지**: fetch와 render 모두 `datasetInfo[].param`에서 설정 읽음

---

## 런타임에서 파라미터 변경하기

### 모든 파라미터는 datasetInfo.param에서 수정

```javascript
const { datasetNames } = this.config;
const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);

if (trendInfo) {
  // 트렌드 파라미터 수정
  trendInfo.param.interval = '5m';
  trendInfo.param.timeRange = 1 * 60 * 60 * 1000;  // 1시간
  trendInfo.param.metricCodes = ['UPS.BATT_PCT'];

  // API 엔드포인트 변경
  trendInfo.param.apiEndpoint = '/api/v2/mhs/l';

  // 기본 파라미터 수정
  trendInfo.param.assetKey = 'NEW_ASSET_KEY';
}

// 변경된 파라미터로 데이터 재요청
fetchTrendData.call(this);
```

### 여러 값 한번에 변경

```javascript
Object.assign(trendInfo.param, {
  interval: '15m',
  timeRange: 1 * 60 * 60 * 1000,
  metricCodes: ['UPS.INPUT_V_AVG'],
  statsKeys: ['avg', 'max', 'min'],
});
fetchTrendData.call(this);
```

---

## 실전 예시

### 시나리오: 사용자가 시간 범위를 1시간으로 변경

```javascript
function setTrendTimeRange(timeRange) {
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);

  if (trendInfo) {
    trendInfo.param.timeRange = timeRange;
    fetchTrendData.call(this);
  }
}

// 사용
this.setTrendTimeRange(1 * 60 * 60 * 1000);  // 1시간
```

### 시나리오: 특정 메트릭만 조회하도록 변경

```javascript
function setTrendMetrics(metricCodes) {
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);

  if (trendInfo) {
    trendInfo.param.metricCodes = metricCodes;
    fetchTrendData.call(this);
  }
}

// 사용: 전압만 조회
this.setTrendMetrics(['UPS.INPUT_V_AVG', 'UPS.OUTPUT_V_AVG']);
```

### 시나리오: assetKey 변경 (다른 장비 조회)

```javascript
function switchAsset(newAssetKey) {
  // 내부 상태 업데이트
  this._defaultAssetKey = newAssetKey;

  // 모든 datasetInfo의 assetKey 업데이트
  this.datasetInfo.forEach(info => {
    if (info.param.assetKey !== undefined) {
      info.param.assetKey = newAssetKey;
    }
  });

  // 팝업이 열려있으면 새 데이터로 갱신
  if (this._popupVisible) {
    this.showDetail();
  }
}
```

---

## 헬퍼 함수 패턴

```javascript
// datasetInfo 조회 헬퍼
function getDatasetInfo(datasetName) {
  return this.datasetInfo.find(d => d.datasetName === datasetName);
}

// param 업데이트 헬퍼
function updateDatasetParam(datasetName, updates) {
  const info = this.datasetInfo.find(d => d.datasetName === datasetName);
  if (info) {
    Object.assign(info.param, updates);
  }
  return info;
}

// 사용 예시
this.updateDatasetParam(datasetNames.metricHistory, {
  interval: '5m',
  timeRange: 3600000,
  metricCodes: ['UPS.BATT_PCT'],
});
fetchTrendData.call(this);
```

---

## 주의사항

1. **모든 파라미터는 datasetInfo.param에서 수정**
   ```javascript
   // ✅ 올바른 패턴
   trendInfo.param.timeRange = 3600000;
   trendInfo.param.interval = '5m';
   trendInfo.param.apiEndpoint = '/api/v2/mhs/l';

   // ❌ 잘못된 패턴: config.api 수정 (fetchTrendData가 사용하지 않음)
   this.config.api.trendParams.timeRange = 3600000;
   ```

2. **객체 자체를 교체하지 않기**
   ```javascript
   // ❌ 피해야 할 패턴: 다른 속성 유실
   trendInfo.param = { timeRange: 3600000 };

   // ✅ 권장: 기존 객체 유지하며 필요한 값만 수정
   trendInfo.param.timeRange = 3600000;
   // 또는
   Object.assign(trendInfo.param, { timeRange: 3600000 });
   ```

3. **수정 후 데이터 재요청 필요**
   - 파라미터만 바꾸면 화면에 반영되지 않음
   - `fetchData()` 또는 `fetchTrendData()` 재호출 필요

4. **config.api.trendParams는 초기값 전용**
   ```javascript
   // config.api.trendParams는 datasetInfo 초기화 시점에만 사용됨
   // 이후 수정해도 datasetInfo.param에 반영되지 않음
   this.datasetInfo = [
     { param: { ...baseParam, ...api.trendParams, apiEndpoint: api.trendHistory }, ... }
   ];
   ```

---

## 요약

| 작업 | 방법 |
|------|------|
| 트렌드 파라미터 수정 | `trendInfo.param.key = value` |
| 기본 파라미터 수정 | `datasetInfo[].param.key = value` |
| 여러 값 수정 | `Object.assign(trendInfo.param, { ... })` |
| 데이터 갱신 | 수정 후 `fetchTrendData()` 재호출 |
| datasetInfo 찾기 | `this.datasetInfo.find(d => d.datasetName === name)` |

### 파라미터 분류

| 파라미터 | 용도 | 수정 위치 |
|---------|------|----------|
| `timeRange`, `interval`, `metricCodes`, `apiEndpoint` | fetch 전용 | `datasetInfo[].param` |
| `statsKeys` | fetch + render | `datasetInfo[].param` |
| `timeField` | render 전용 | `datasetInfo[].param` |
| `assetKey`, `baseUrl`, `locale` | fetch 전용 | `datasetInfo[].param` |

> **모든 파라미터의 수정 위치는 `datasetInfo[].param` 한 곳입니다.**
> fetch와 render 모두 동일한 param 객체를 참조합니다.
