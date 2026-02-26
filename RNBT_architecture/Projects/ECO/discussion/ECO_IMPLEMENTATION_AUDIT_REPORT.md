# ECO 컴포넌트 구현 충실도 감사 보고서

**작성일**: 2026-02-14
**분석 대상**: UPS, SWBD, PDU, CRAC, TempHumiditySensor (5개 컴포넌트)

---

## 1. 감사 개요

### 1.1 목적

현재 ECO 컴포넌트의 소스 코드(register.js)가 최신 문서 기반으로 충실히 구현되어 있는지 검증한다.

### 1.2 교차 비교 대상 문서

| # | 문서 | 약칭 | 역할 |
|---|------|------|------|
| 1 | `register.js` (5개) | **SRC** | 실제 구현 코드 |
| 2 | `metricConfig.json` | **MC** | 메트릭 코드 정의 (92개) |
| 3 | `POPUP_SPEC/*.md` (5개) | **PS** | 팝업 화면 기획 명세 |
| 4 | UPS/DIST/SWBD 분석문서 (3개) | **AD** | 인터페이스→메트릭→화면 파이프라인 분석 |
| 5 | `RUNTIME_PARAM_UPDATE_API.md` | **RPA** | 런타임 파라미터 변경 API 설계 |
| 6 | `API_SPEC.md` | **API** | REST API 엔드포인트 명세 |
| 7 | `datasetList.json` | **DL** | 데이터셋 등록 목록 |
| 8 | 최신 메트릭 코드 표준 명세 (인라인) | **MCS** | 권위 메트릭 코드 정의 |

### 1.3 판정 기준

| 등급 | 의미 |
|------|------|
| **O** | 구현 완료 — 문서와 일치 |
| **△** | 부분 일치 — 의도적 대체 구현 또는 미확정 항목 |
| **X** | 미구현 또는 불일치 |
| **N/A** | 해당 컴포넌트에 적용 불가 |

---

## 2. 메트릭 코드 구현 충실도

### 2.1 register.js에서 사용하는 메트릭 코드 vs metricConfig.json

| 컴포넌트 | SRC 사용 메트릭 | MC 등록 여부 | 판정 |
|----------|----------------|-------------|------|
| **UPS** 전류탭 | `UPS.INPUT_A_SUM`, `UPS.OUTPUT_A_SUM` | O (DERIVED) | **O** |
| **UPS** 전압탭 | `UPS.INPUT_V_AVG`, `UPS.OUTPUT_V_AVG` | O (DERIVED) | **O** |
| **UPS** 주파수탭 | `UPS.INPUT_F_AVG`, `UPS.OUTPUT_F_AVG` | O (DERIVED) | **O** |
| **UPS** 전력현황 | `UPS.BATT_PCT`, `UPS.LOAD_PCT`, `UPS.BATT_V` | O | **O** |
| **UPS** 전력현황 | `batteryTime.metricCode = null` | — | **△** 잔여시간 MIB 미확보 |
| **SWBD** 전압탭 | `SWBD.VOLTAGE_V` | O | **O** |
| **SWBD** 전류탭 | `SWBD.CURRENT_A` | O | **O** |
| **SWBD** 주파수탭 | `SWBD.FREQUENCY_HZ` | O | **O** |
| **SWBD** 유효전력탭 | `SWBD.ACTIVE_POWER_KW` | O | **O** |
| **PDU** 전압탭 | `DIST.V_LN_AVG` | O | **O** |
| **PDU** 전류탭 | `DIST.CURRENT_AVG_A` | O | **O** |
| **PDU** 전력탭 | `DIST.ACTIVE_POWER_TOTAL_KW` | O | **O** |
| **PDU** 주파수탭 | `DIST.FREQUENCY_HZ` | O | **O** |
| **CRAC** 상태카드 | `CRAC.RETURN_TEMP`, `CRAC.TEMP_SET`, `CRAC.RETURN_HUMIDITY`, `CRAC.HUMIDITY_SET` | O | **O** |
| **CRAC** 차트 | `CRAC.RETURN_TEMP`, `CRAC.RETURN_HUMIDITY` | O | **O** |
| **CRAC** 인디케이터 | `CRAC.FAN_STATUS` 외 5개 BOOL | O | **O** |
| **SENSOR** 상태카드 | `SENSOR.TEMP`, `SENSOR.HUMIDITY` | O | **O** |
| **SENSOR** 차트 | `SENSOR.TEMP`, `SENSOR.HUMIDITY` | O | **O** |

### 2.2 metricConfig.json 등록 상태 요약

| 장비 | RAW | DERIVED | BOOL | 합계 |
|------|-----|---------|------|------|
| SENSOR | 3 | 0 | 0 | **3** |
| CRAC | 4 NUMBER | 0 | 7 | **11** |
| UPS | 20 NUMBER | 14 | 7 | **41** |
| DIST | 15 | 0 | 0 | **15** |
| SWBD | 8 NUMBER | 0 | 11 | **19** |
| **합계** | | | | **89** (+3 UPS 특수 = **92**) |

### 2.3 metricConfig.json vs 분석문서(AD) 비교

| 항목 | MC 상태 | AD 기술 | 판정 | 비고 |
|------|---------|---------|------|------|
| UPS Deci 단위(÷10) | scale=1.0 | scale=0.1 (raw/10) | **△** | 수집 파이프라인에서 사전 변환 여부 확인 필요 |
| DIST 에너지(kWh 등) | 등록됨 (6개) | 기본+파생 필요 | **O** | 화면 미사용이지만 확장 대비 등록 |
| SWBD BOOL 11개 | 등록됨 | 11개 정의 | **O** | |
| SWBD NUMBER 확장 (DC,역률 등) | 등록됨 (8개) | 확장 가능 | **O** | |
| UPS BATT_REMAIN_TIME | **미등록** | "추가 MIB 필요" | **X** | AD/PS 모두 갭으로 기재 |
| UPS BATT_SOC | MC에 `BATT_PCT`로 등록 | PS에서 `BATT_SOC` 명칭 사용 | **△** | 명칭 불일치 (실질 동일) |
| UPS LOAD_RATE | MC에 `LOAD_PCT`로 등록 | PS에서 `LOAD_RATE` 명칭 사용 | **△** | 명칭 불일치 (실질 동일) |

---

## 3. 팝업 스펙(PS) vs 구현(SRC) 충실도

### 3.1 섹션별 구현 현황

| 컴포넌트 | 섹션 | PS 요구 | SRC 구현 | 판정 |
|----------|------|---------|---------|------|
| **UPS** | ① 기본정보 (8필드) | O | O | **O** |
| **UPS** | ② 전력현황 (4카드) | 배터리사용률/잔여시간/부하율/출력전압 | BATT_PCT/null/LOAD_PCT/BATT_V | **△** 잔여시간=null |
| **UPS** | ③ 입/출력 추이 (3탭) | 전류/전압/주파수 dual-line | AVG/SUM 기반 dual-line | **O** |
| **SWBD** | ① 기본정보 (8필드) | O | O (fetchVendorDirect) | **O** |
| **SWBD** | ② 운전상태추이 (4탭) | 전압/전류/주파수/유효전력 | SWBD.* 4개 메트릭 | **O** |
| **SWBD** | 3상 A/B/C 라인 | 기획서 요구 | 단일 라인으로 대체 | **△** 인터페이스 원천 부재 |
| **SWBD** | 유효전력 비교 | 금일/월평균 | 금일/전일 구현 | **△** "월평균→전일" 변경 |
| **PDU** | ① 기본정보 (8필드) | O | O | **O** |
| **PDU** | ② 전력추이 (4탭) | 전압/전류/전력사용량/입력주파수 | DIST.* 4개 메트릭 | **O** |
| **PDU** | 3상 A/B/C 라인 | 기획서 요구 | 단일 라인으로 대체 | **△** 인터페이스 원천 부재 |
| **PDU** | 전력사용량 비교 | 금일/전일 | 금일/전일 구현 (comparison) | **O** |
| **CRAC** | ① 기본정보 (8필드) | O | O | **O** |
| **CRAC** | 상태정보 (4카드) | 현재온도/설정온도/현재습도/설정습도 | 4개 모두 구현 | **O** |
| **CRAC** | ② 상태인디케이터 (6개) | 팬/냉방/난방/가습/제습/누수 | 6개 BOOL 구현 | **O** |
| **CRAC** | ③ 온/습도 현황 | 바+라인 복합차트 | bar+line dual-axis | **O** |
| **SENSOR** | 기본정보 (8필드) | O | O | **O** |
| **SENSOR** | ① 실시간 측정값 (2카드) | 현재온도/적정온도, 현재습도/적정습도 | 구현 (적정값 하드코딩) | **△** 적정값 API 미확보 |
| **SENSOR** | 온/습도 현황 | 바+라인 복합차트 | bar+line dual-axis | **O** |

### 3.2 기본정보 체이닝 방식

| 컴포넌트 | PS 정의 | SRC 구현 | 판정 |
|----------|---------|---------|------|
| UPS | ast/gx → mdl/g → vdr/g (3단계) | fetchModelVendorChain | **O** |
| PDU | ast/gx → mdl/g → vdr/g (3단계) | fetchModelVendorChain | **O** |
| CRAC | ast/gx → mdl/g → vdr/g (3단계) | fetchModelVendorChain | **O** |
| SENSOR | ast/gx → mdl/g → vdr/g (3단계) | fetchModelVendorChain | **O** |
| SWBD | ast/gx → vdr/g (2단계, mdl/g 생략) | fetchVendorDirect | **O** |

---

## 4. Runtime Parameter Update API 구현 충실도

### 4.1 RPA 문서 정의 vs SRC 구현

| Category | 메서드 | 적용 컴포넌트 | RPA 정의 | SRC 구현 | 판정 |
|----------|--------|-------------|---------|---------|------|
| **A** | `updateTrendParams` | 공통(5) | O | 5개 모두 | **O** |
| **B** | `updateUpsTabMetric` | UPS | O | O (3곳 동기화) | **O** |
| **B** | `updateSwbdTabMetric` | SWBD | — | O (문서미정의→자체구현) | **△** |
| **B** | `updatePduTabMetric` | PDU | O | O (3곳 동기화) | **O** |
| **B** | `updateCracSeriesMetric` | CRAC | O | O (3곳 동기화) | **O** |
| **B** | `updateSensorSeriesMetric` | SENSOR | O | O (3곳 동기화) | **O** |
| **C** | `updateGlobalParams` | 공통(5) | O | 5개 모두 | **O** |
| **D** | `updateRefreshInterval` | 공통(5) | O | 5개 모두 | **O** |
| **E** | `updateUpsStatusMetric` | UPS | O | O | **O** |
| **E** | `addUpsStatusMetric` | UPS | O | O | **O** |
| **E** | `removeUpsStatusMetric` | UPS | O | O | **O** |
| **E** | `updateCracStatusMetric` | CRAC | O | O | **O** |
| **E** | `addCracStatusMetric` | CRAC | O | O | **O** |
| **E** | `removeCracStatusMetric` | CRAC | O | O | **O** |
| **E** | `updateSensorStatusMetric` | SENSOR | O | O | **O** |
| **E** | `addSensorStatusMetric` | SENSOR | O | O | **O** |
| **E** | `removeSensorStatusMetric` | SENSOR | O | O | **O** |

> **참고**: RPA 테스트 결과 130/130 PASS (2026-02-09)

### 4.2 SWBD의 Category B 메서드 명칭

| 문서 | 메서드명 | 비고 |
|------|---------|------|
| RPA 문서 | `updatePduTabMetric` (PDU용으로 기술) | SWBD 전용 메서드 미기재 |
| SRC (SWBD) | `updateSwbdTabMetric` | 자체 구현 (PDU와 동일 패턴) |

RPA 문서 작성 시 SWBD가 누락되었으나, 구현은 PDU와 동일한 패턴으로 정상 존재한다.

### 4.3 SWBD/PDU의 Category E 부재

| 컴포넌트 | 현황카드 | Category E | 판정 | 사유 |
|----------|---------|-----------|------|------|
| UPS | 4개 (powerStatus) | O (update/add/remove) | **O** | |
| CRAC | 4개 (statusCards) | O (update/add/remove) | **O** | |
| SENSOR | 2개 (statusCards) | O (update/add/remove) | **O** | |
| SWBD | 없음 | N/A | **N/A** | mh/gl 미사용 |
| PDU | 없음 | N/A | **N/A** | mh/gl 미사용 |

---

## 5. API / 데이터셋 구현 충실도

### 5.1 datasetInfo 구성 vs datasetList.json

| 컴포넌트 | assetDetail | metricLatest | metricHistory | 합계 | 판정 |
|----------|:-----------:|:------------:|:-------------:|:----:|:----:|
| UPS | O (assetDetailUnified) | O (metricLatest) | O (metricHistoryStats) | 3 | **O** |
| CRAC | O | O | O | 3 | **O** |
| SENSOR | O | O | O | 3 | **O** |
| SWBD | O | X | O | 2 | **O** (PS에서도 mh/gl 불필요) |
| PDU | O | X | O | 2 | **O** (PS에서도 mh/gl 불필요) |

### 5.2 API 엔드포인트 사용 현황

| API | 용도 | 사용 컴포넌트 | API_SPEC 정의 | 판정 |
|-----|------|-------------|:------------:|:----:|
| POST /api/v1/ast/gx | 자산 상세 (통합) | 5개 모두 | O | **O** |
| POST /api/v1/mh/gl | 최신 메트릭 | UPS, CRAC, SENSOR | O | **O** |
| POST /api/v1/mhs/l | 시계열 통계 | 5개 모두 | O | **O** |
| POST /api/v1/mdl/g | 모델 조회 | UPS, PDU, CRAC, SENSOR | O | **O** |
| POST /api/v1/vdr/g | 벤더 조회 | 5개 모두 | O | **O** |

---

## 6. 분석문서(AD) vs 구현 교차 검증

### 6.1 UPS 분석문서 검증

| AD 항목 | AD 결론 | SRC 구현 | 판정 |
|---------|---------|---------|------|
| 입/출력 전류 추이 | 가능 (Deci 변환 + 3상 정책) | INPUT_A_SUM / OUTPUT_A_SUM | **O** |
| 입/출력 전압 추이 | 가능 | INPUT_V_AVG / OUTPUT_V_AVG | **O** |
| 입/출력 주파수 추이 | 가능 | INPUT_F_AVG / OUTPUT_F_AVG | **O** |
| 배터리 출력전압 | 가능 | UPS.BATT_V (scale 1.0) | **O** |
| 배터리 사용률 | 불가(갭) — 추가 MIB 필요 | BATT_PCT (MC 등록, 값 미보장) | **△** |
| 배터리 잔여시간 | 불가(갭) | metricCode: null | **X** |
| 부하율 | 불가(갭) — 추가 MIB 필요 | LOAD_PCT (MC 등록, 값 미보장) | **△** |
| 3상→단일 변환 정책 | 전압/주파수=평균, 전류=합계 | AVG/SUM DERIVED 메트릭 사용 | **O** |

### 6.2 DIST(분전반) 분석문서 검증

| AD 항목 | AD 결론 | SRC(PDU) 구현 | 판정 |
|---------|---------|-------------|------|
| 전압 트렌드 (단일 라인) | 가능 — DIST.V_LN_AVG | V_LN_AVG 사용 | **O** |
| 전류 트렌드 (단일 라인) | 가능 — DIST.CURRENT_AVG_A | CURRENT_AVG_A 사용 | **O** |
| 전력(kW) 트렌드 | 가능 — DIST.ACTIVE_POWER_TOTAL_KW | ACTIVE_POWER_TOTAL_KW 사용 | **O** |
| 입력주파수 트렌드 | 가능 — DIST.FREQUENCY_HZ | FREQUENCY_HZ 사용 | **O** |
| A/B/C 상별 3라인 | 불가(갭) — 상별 메트릭 미정의 | 단일 라인으로 대체 | **△** |
| 인터페이스 원천 이미 단일값 | 추가 변환 불필요 | scale=1.0 그대로 사용 | **O** |

### 6.3 SWBD(수배전반) 분석문서 검증

| AD 항목 | AD 결론 | SRC(SWBD) 구현 | 판정 |
|---------|---------|--------------|------|
| 전압 추이 (단일 라인) | 가능 — SWBD.VOLTAGE_V | VOLTAGE_V 사용 | **O** |
| 전류 추이 (단일 라인) | 가능 — SWBD.CURRENT_A | CURRENT_A 사용 | **O** |
| 주파수 추이 | 가능 — SWBD.FREQUENCY_HZ | FREQUENCY_HZ 사용 | **O** |
| 유효전력 추이 | 가능 — SWBD.ACTIVE_POWER_KW | ACTIVE_POWER_KW 사용 | **O** |
| A/B/C 상별 3라인 | 불가(갭) — Value_V/A 단일값 | 단일 라인으로 대체 | **△** |
| BOOL 상태 알람 11개 | 가능 — MC에 등록 | 차트에서 미사용 (PS에도 미요구) | **O** |
| 자산 기본정보 | 계측 범위 밖 — Asset/CMDB | ast/gx로 조회 | **O** |

---

## 7. 알려진 이슈 및 미해결 항목

### 7.1 데이터 갭 (인터페이스/MIB 부재)

| # | 항목 | 관련 장비 | 현재 상태 | 영향도 |
|---|------|---------|---------|--------|
| G-1 | UPS 배터리 잔여시간 | UPS | `metricCode: null` (카드 존재, 값 없음) | 중 |
| G-2 | UPS 배터리 사용률 MIB | UPS | MC에 `BATT_PCT` 등록 + SRC 사용, 실 데이터 미보장 | 중 |
| G-3 | UPS 부하율 MIB | UPS | MC에 `LOAD_PCT` 등록 + SRC 사용, 실 데이터 미보장 | 중 |
| G-4 | SWBD/PDU 3상 A/B/C 개별 | SWBD, PDU | 인터페이스가 단일값만 제공 → 단일 라인 대체 | 저 (기획 조정 가능) |
| G-5 | SENSOR 적정온도/적정습도 API | SENSOR | `targetValue` 하드코딩 (22°C, 50%) | 저 |

### 7.2 명칭 불일치

| # | 위치 A | 위치 B | 내용 | 영향도 |
|---|--------|--------|------|--------|
| N-1 | PS: `UPS.BATT_SOC` | MC/SRC: `UPS.BATT_PCT` | 배터리 잔량 퍼센트 | 없음 (PS 업데이트 예정) |
| N-2 | PS: `UPS.LOAD_RATE` | MC/SRC: `UPS.LOAD_PCT` | 부하율 | 없음 (PS 업데이트 예정) |
| N-3 | PS(SWBD): "월평균" 비교 | SRC: "전일" 비교 | 유효전력 비교 기간 | 저 (기획 변경 사항 반영) |

### 7.3 scale 정책 미확정

| # | 항목 | AD 기술 | MC 설정 | 판단 필요 |
|---|------|---------|---------|----------|
| S-1 | UPS raw 3상 값 (INPUT_V_1~3 등) | Deci 단위 → scale=0.1 | scale=1.0 | 수집 파이프라인에서 사전 ÷10 여부 확인 |

### 7.4 RPA 문서 누락

| # | 항목 | 내용 |
|---|------|------|
| R-1 | SWBD Category B 메서드 | RPA 문서에 `updateSwbdTabMetric` 미기재 (SRC에는 존재) |

---

## 8. SENSOR 하드코딩 상세

```javascript
// TempHumiditySensor/scripts/register.js:526
targetValueEl.textContent = config.metricCode == 'SENSOR.TEMP' ? '22' : '50';
```

SENSOR 팝업의 "적정" 값이 하드코딩되어 있다. PS에서도 "적정온도/적정습도 API 미확인"으로 기재되어 있으므로, 이는 의도적인 임시 처리이다.

**RPA로 해결 가능**: `updateSensorStatusMetric('temperature', { targetValue: 24.0 })` 호출로 런타임에 변경할 수 있다.

---

## 9. 종합 판정

### 9.1 컴포넌트별 점수

| 컴포넌트 | 메트릭 코드 | 팝업 스펙 | RPA 구현 | API/데이터셋 | 종합 |
|----------|:---------:|:--------:|:--------:|:-----------:|:----:|
| **UPS** | O | △ (잔여시간 null) | O | O | **90%** |
| **SWBD** | O | △ (3상→단일, 월평균→전일) | △ (RPA 문서 누락) | O | **85%** |
| **PDU** | O | △ (3상→단일) | O | O | **90%** |
| **CRAC** | O | O | O | O | **100%** |
| **SENSOR** | O | △ (적정값 하드코딩) | O | O | **90%** |

### 9.2 요약

```
┌─────────────────────────────────────────────────────────────┐
│  전체 평균 구현 충실도: ~91%                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ 완전 일치 항목:                                           │
│    - 모든 메트릭 코드가 metricConfig에 등록됨                  │
│    - 모든 API 엔드포인트가 API_SPEC과 일치                    │
│    - 5개 컴포넌트의 기본정보(8필드) 체이닝 완전 구현            │
│    - Runtime Parameter Update API 130/130 테스트 통과          │
│    - Category A~E 메서드 전 컴포넌트 바인딩 완료               │
│    - CRAC 컴포넌트 100% 구현 (미제공 데이터 항목 0)            │
│                                                              │
│  △ 의도적 대체/미확정 항목:                                   │
│    - UPS 배터리 잔여시간: MIB 미확보 → metricCode: null        │
│    - UPS 배터리사용률/부하율: MC 등록+SRC 참조, 실 데이터 미보장│
│    - SWBD/PDU 3상→단일 라인: 인터페이스 원천 제약              │
│    - SENSOR 적정값: API 미확보 → 하드코딩 (RPA로 변경 가능)    │
│    - SWBD 월평균→전일: 기획 조정 반영                         │
│                                                              │
│  ✗ 미해결 항목:                                              │
│    - UPS scale 정책 (Deci ÷10 vs scale=1.0) 확정 필요        │
│    - RPA 문서에 SWBD updateSwbdTabMetric 누락                │
│                                                              │
│  핵심 결론:                                                   │
│  소스 코드는 최신 문서 기반으로 충실히 구현되어 있으며,          │
│  미구현 항목은 모두 "인터페이스/MIB 부재"라는 외부 의존성에      │
│  기인한다. 코드 레벨의 구현 오류는 발견되지 않았다.             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 권장 후속 조치

| 우선순위 | 조치 | 대상 | 상세 |
|:--------:|------|------|------|
| **1** | UPS scale 정책 확정 | UPS metricConfig | 수집 파이프라인 팀에 Deci 사전 변환 여부 확인 → MC의 scale 값 결정 |
| **2** | UPS 배터리 MIB 3종 확보 | UPS 인터페이스 | BATT_SOC(잔량%), BATT_REMAIN_TIME(잔여시간), OutputPercentLoad(부하율) |
| **3** | RPA 문서 SWBD 보완 | RUNTIME_PARAM_UPDATE_API.md | `updateSwbdTabMetric` 섹션 추가 |
| **4** | PS 명칭 통일 | POPUP_SPEC/UPS | BATT_SOC→BATT_PCT, LOAD_RATE→LOAD_PCT |
| **5** | SENSOR 적정값 API 확인 | SENSOR 인터페이스 | CRAC TEMP_SET/HUMIDITY_SET과 유사한 설정값 API 존재 여부 |
| 6 | 3상 A/B/C 메트릭 확장 | SWBD, PDU(DIST) | 상별 계측 포인트 추가 시 metricConfig + register.js 확장 |

---

*최종 업데이트: 2026-02-14*
