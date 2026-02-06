# metricConfig.json vs 메트릭 코드 명세 비교 분석

> 작성일: 2026-02-06
> 대상: `metricConfig.json` (88개 항목) vs 메트릭 코드 명세 문서

---

## 개요

ECO 프로젝트의 `metricConfig.json`이 메트릭 코드 명세를 정확히 반영하고 있는지 전수 비교한 결과를 정리한다.

**결론: 87/88 항목 일치 (98.9% 커버리지)**

누락 1건(`UPS.INPUT_F_AVG`)을 제외하면 전체적으로 잘 동기화되어 있으나, 표기 수준의 차이가 여러 건 존재한다.

---

## [A] 명세에 정의되어 있으나 metricConfig.json에 누락된 항목

### 심각도: 높음 (코드에서 실제 사용 중)

| 코드 | 설명 |
|------|------|
| `UPS.INPUT_F_AVG` | 입력주파수(3상 평균) |

- 명세 3.3.1의 파생 메트릭 5개 중 "입력주파수 평균"에 해당
  - `OUTPUT_F_AVG`는 있는데 `INPUT_F_AVG`는 없음
- **UPS 컴포넌트 코드에서 실제 사용 중**:
  ```js
  // register.js
  metricCodes: [..., 'UPS.INPUT_F_AVG', 'UPS.OUTPUT_F_AVG']
  statsKeyMap: { 'UPS.INPUT_F_AVG': 'avg' }
  chart.tabs.frequency.inputCode: 'UPS.INPUT_F_AVG'
  ```
- mock_server에서도 데이터 생성 중
- **조치**: 명세 + metricConfig.json 양쪽에 추가 필요
  ```json
  "UPS.INPUT_F_AVG": {
    "label": "입력주파수(3상 평균)",
    "description": "AVG(UPS.INPUT_F_1, UPS.INPUT_F_2, UPS.INPUT_F_3)",
    "valueType": "NUMBER",
    "unit": "Hz",
    "scale": 1.0,
    "interface": "DERIVED"
  }
  ```

### 심각도: 낮음 (의도적 미반영)

명세 3.5.3의 DIST Optional 메타 항목 6개:

| 코드 | 설명 |
|------|------|
| `DIST.IPV4` | IPv4 주소 |
| `DIST.SUBUNIT_TYPE_LIST` | 서브유닛 타입 목록 |
| `DIST.SUBUNIT_ID_LIST` | 서브유닛 ID 목록 |
| `DIST.SUBUNIT_STATE_LIST` | 서브유닛 상태 목록 |
| `DIST.PT_VALIDITY` | PT 데이터 유효성 |
| `DIST.SUBUNIT_VALIDITY` | 서브유닛 데이터 유효성 |

명세에서 "asset 메타/extra에 저장" 명시되어 있으므로 의도적 제외. 조치 불필요.

---

## [B] metricConfig.json에만 있고 명세에 없는 항목

| 코드 | label | 용도 |
|------|-------|------|
| `UPS.LOAD_PCT` | 부하율 (%) | powerStatus 카드 |
| `UPS.BATT_PCT` | 배터리 사용률 (%) | powerStatus 카드 |
| `UPS.STATUS_CODE` | 상태 코드 (NUMBER) | powerStatus 카드 |

- 3개 모두 UPS 컴포넌트의 powerStatus 카드에서 사용
- **조치**: 명세에 항목 추가 필요하거나, 별도 카테고리로 문서화 필요

---

## [C] description 불일치 (의미 동일, 표기 다름)

| metric_code | metricConfig.json | 명세 |
|-------------|------------------|------|
| `CRAC.RETURN_TEMP` | 인입(환기) 온도 | 인입(RA) 온도 |
| `CRAC.RETURN_HUMIDITY` | 인입(환기) 습도 | 인입(RA) 습도 |
| `CRAC.HEAT_STATUS` | 난방 동작상태 | 가열/재열 동작 |
| `CRAC.SUPPLY_TEMP` | 공급(급기) 온도 | 공급/급기 온도(대표) |

- 의미는 동일하나 표기 방식이 다름
- **조치**: 어느 쪽을 기준으로 할지 합의 필요

---

## [D] label 표기 차이 (UPS 3상 항목 18개)

```
metricConfig.json: "입력전압 R" / "입력전압 S" / "입력전압 T"
명세:              "입력전압 1상" / "입력전압 2상" / "입력전압 3상"
```

해당 항목 (각 3개씩 총 18개):
- `UPS.INPUT_V_{1,2,3}` — 입력전압
- `UPS.INPUT_F_{1,2,3}` — 입력주파수
- `UPS.INPUT_A_{1,2,3}` — 입력전류
- `UPS.OUTPUT_V_{1,2,3}` — 출력전압
- `UPS.OUTPUT_F_{1,2,3}` — 출력주파수
- `UPS.OUTPUT_A_{1,2,3}` — 출력전류

- metricConfig.json은 R/S/T 표기, 명세는 1상/2상/3상 표기
- **조치**: UI에서 label을 직접 사용하는 경우 표기 합의 필요

---

## [E] unit 인코딩 차이

```
metricConfig.json: "°C"  (U+00B0 DEGREE SIGN + C)
명세:              "℃"   (U+2103 DEGREE CELSIUS)
```

해당 항목:
- `SENSOR.TEMP`, `CRAC.RETURN_TEMP`, `CRAC.TEMP_SET`, `CRAC.SUPPLY_TEMP`, `DIST.TEMP_C`

- 시각적으로 동일하나 유니코드가 다름
- **조치**: 문자열 비교(===)에서 불일치 발생 가능. 매칭이나 필터링 로직이 있다면 통일 필요.

---

## [F] 그룹별 일치 현황

| 그룹 | 일치 | 비고 |
|------|------|------|
| SENSOR.* | 3/3 | 완전 일치 |
| CRAC.* | 12/12 | description 미세 차이 4건 |
| UPS 3상 | 18/18 | label 표기 차이 (R/S/T vs 1상/2상/3상) |
| UPS 배터리 | 9/9 | 완전 일치 |
| UPS 파생(DERIVED) | 4/5 | `INPUT_F_AVG` 1건 누락 |
| UPS 추가 | 3/0 | 명세에 없음 (LOAD_PCT, BATT_PCT, STATUS_CODE) |
| SWBD BOOL | 11/11 | 완전 일치 |
| SWBD NUMBER | 10/10 | 완전 일치 |
| DIST PT2300 | 5/5 | 완전 일치 |
| DIST SU2350 | 13/13 | 완전 일치 |

---

## 조치 우선순위

| 우선순위 | 항목 | 조치 내용 |
|----------|------|-----------|
| 1 (필수) | `UPS.INPUT_F_AVG` | 명세에 추가 + metricConfig.json에 추가 |
| 2 (권장) | `UPS.LOAD_PCT` 외 3건 | 명세에 항목 추가 |
| 3 (선택) | CRAC description 4건 | 표기 합의 후 통일 |
| 4 (선택) | UPS label R/S/T 18건 | 표기 기준 합의 |
| 5 (선택) | unit °C vs ℃ | 코드 내 매칭 로직 확인 후 판단 |

---

*이 문서는 현재 metricConfig.json과 명세 간 차이를 기록한 것이며, 실제 수정은 명세 확정 후 진행한다.*
