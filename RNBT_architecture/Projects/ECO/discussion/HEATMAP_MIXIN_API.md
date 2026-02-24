# HeatmapMixin 옵션 가이드

히트맵을 커스텀하려면 `applyHeatmapMixin` 호출 시 옵션을 변경합니다.

### 현재 소스 (ActionPanel)

```javascript
// HEATMAP_PRESET — register.js:22-26
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 17, max: 31 },
};

// applyHeatmapMixin 호출 — register.js:204-214
applyHeatmapMixin(
    this._centerInstance,
    Object.assign(
        {
            refreshInterval: 0,
            onLoadingChange: function (isLoading) {
                syncLoadingUI.call(ctx, 'temperature', isLoading);
            },
        },
        HEATMAP_PRESET
    )
);
```

> 명시하지 않은 옵션(`surfaceSize`, `segments`, `radius` 등)은 아래 기본값이 적용됩니다.

---

## 옵션

| 옵션 | 타입 | 기본값 | 현재 소스 | 설명 |
|------|------|--------|-----------|------|
| `surfaceSize` | `'auto'` \| `{ width, depth }` | `'auto'` | 기본값 | appendElement BoundingBox에서 서피스 크기 자동 산출 |
| `temperatureRange` | `{ min, max }` | `{ min: 17, max: 31 }` | `{ min: 17, max: 31 }` | 온도 정규화 범위. `(value - min) / (max - min)` → 0.0~1.0 |
| `gradient` | object \| `null` | `null` | `null` | 색상 매핑. `null`이면 DEFAULT_GRADIENT 사용 |
| `heatmapResolution` | number | `256` | 기본값 | radius UV 변환 기준값. `UV = (radius + blur) / resolution` |
| `segments` | number | `64` | 기본값 | PlaneGeometry 분할 수. 높을수록 displacement가 부드러움 |
| `displacementScale` | number | `3` | 기본값 | 수직 변위 크기. 온도가 높은 곳이 얼마나 솟아오르는지 |
| `baseHeight` | number | `2` | 기본값 | 서피스 기준 높이 (Z 오프셋) |
| `radius` | `'auto'` \| number | `'auto'` | 기본값 | 센서 영향 반경. `'auto'`는 센서 수 기반 동적 계산 |
| `blur` | number | `30` | 기본값 | 확산 경계 부드러움. radius와 함께 영향 반경 계산에 사용 |
| `opacity` | number | `0.75` | 기본값 | 서피스 투명도 (0~1). heat가 없는 영역은 항상 완전 투명 |
| `temperatureMetrics` | string[] | `['SENSOR.TEMP', 'CRAC.RETURN_TEMP']` | `['SENSOR.TEMP', 'CRAC.RETURN_TEMP']` | 수집 대상 metricCode |
| `refreshInterval` | number | `0` | `0` | `0`: renderStatusCards 체인 연동. `> 0`: 독립 setInterval (ms) |
| `onLoadingChange` | function \| `null` | `null` | `syncLoadingUI` 연동 | `callback(isLoading)`. 데이터 로딩 시작/완료 시 호출 |

---

## 커스텀 예시

현재 HEATMAP_PRESET을 기준으로, 옵션을 변경하면 코드가 어떻게 바뀌는지 보여줍니다.

### 온도 범위 변경

서버실이 아닌 일반 사무공간(20~28°C)으로 범위를 조정:

```javascript
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 20, max: 28 },  // 변경
};
```

### 커스텀 색상 (gradient)

파란→빨간 2색 그라디언트로 단순화:

```javascript
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: {                               // 변경
        0.0: '#0000FF',
        1.0: '#FF0000',
    },
    temperatureRange: { min: 17, max: 31 },
};
```

### 서피스 크기 고정

자동 산출 대신 특정 크기로 고정:

```javascript
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 17, max: 31 },
    surfaceSize: { width: 30, depth: 20 },    // 추가
};
```

### 시각 효과 조정

서피스를 더 낮고, 더 투명하게, 굴곡 없이:

```javascript
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 17, max: 31 },
    baseHeight: 1,                            // 추가 (기본 2)
    displacementScale: 0,                     // 추가 (기본 3, 0이면 평면)
    opacity: 0.5,                             // 추가 (기본 0.75)
};
```

### 센서 영향 반경 수동 지정

auto 대신 고정 반경 사용:

```javascript
const HEATMAP_PRESET = {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 17, max: 31 },
    radius: 80,                               // 추가 (기본 'auto')
    blur: 40,                                 // 추가 (기본 30)
};
```

### 데이터 갱신 주기 변경

ActionPanel은 통합 타이머(`_refreshInterval: 30000`)로 30초마다 데이터를 갱신합니다.
이 주기를 변경하려면 register.js의 `_refreshInterval`을 수정합니다:

```javascript
// register.js:68
this._refreshInterval = 10000; // 변경 (기본 30000ms → 10초)
```

> `applyHeatmapMixin`의 `refreshInterval: 0`은 그대로 유지합니다.
> ActionPanel 통합 타이머가 `updateHeatmapWithData()`로 데이터를 주입하는 구조이므로,
> Mixin 자체 타이머는 사용하지 않습니다.

---

## gradient 상세

`null`이면 아래 DEFAULT_GRADIENT가 적용됩니다. 현재 소스는 `null` (기본 그라디언트 사용).

| stop | 색상 | 의미 |
|------|------|------|
| 0.00 | `#1068D9` | ≤17°C 과냉 |
| 0.29 | `#4AA3DF` | 18-21°C 정상(저온) |
| 0.57 | `#2ECC71` | 22-25°C 최적 |
| 0.71 | `#A3D977` | 26-27°C 정상 상한 |
| 0.93 | `#F7A318` | 28-30°C 경고 |
| 1.00 | `#E74C3C` | ≥31°C 위험 |

stop 위치 = `(경계값 - min) / (max - min)`. `temperatureRange`를 변경하면 gradient stop 위치도 함께 조정해야 의도한 색상 매핑이 됩니다.

---

## radius 'auto' 계산

현재 소스는 `'auto'` (기본값).

```
r = round(resolution / sqrt(sensorCount) * 0.5)
r = clamp(r, 15, round(resolution * 0.4))
UV_radius = (r + blur) / resolution
```

센서가 적으면 넓게, 많으면 좁게 자동 조절됩니다. 숫자를 직접 지정하면 px 단위이며 UV로 자동 변환됩니다.
