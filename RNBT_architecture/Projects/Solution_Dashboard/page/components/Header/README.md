# Header

범용 헤더 컴포넌트. 로고, GNB 네비게이션, 토글 버튼, 원형 버튼, 날짜/시간을 표시한다.

## Config 구조

```javascript
{
    logo: {
        symbolText: 'E',              // 로고 심볼 글자
        logoText: 'eCOBIT',           // 로고 텍스트
    },
    navItems: [                        // GNB 네비게이션 항목
        { label: '상면관리', active: true },
        { label: '설비현황' },
        { label: '대응절차' },
        { label: '모의훈련' },
        { label: '이력관리' },
    ],
    toggleItems: [                     // 토글 버튼 항목
        { label: '대시보드', active: true },
        { label: '리포트' },
    ],
    circleButtons: [                   // 원형 아이콘 버튼
        { id: 'settings', active: true },
        { id: 'user', active: false },
        { id: 'logout', active: false },
    ],
    datetime: {
        visible: true,                 // 날짜/시간 표시 여부
    },
}
```

### navItems / toggleItems

| 필드 | 타입 | 설명 |
|------|------|------|
| `label` | string | 표시 텍스트 |
| `active` | boolean | 활성 상태 (배열 내 하나만 `true`) |

### circleButtons

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 버튼 식별자 (페이지에서 구분용) |
| `active` | boolean | `true`면 밝은 아이콘, `false`면 어두운 아이콘 |

## Public API

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `setConfig` | `(partialConfig)` | 부분 설정 병합 + 해당 영역만 재렌더 |
| `setActiveNav` | `(index)` | 활성 네비게이션 변경 (0-based) |
| `setActiveToggle` | `(index)` | 활성 토글 변경 (0-based) |
| `setButtonState` | `(id, active)` | 특정 원형 버튼의 활성 상태 변경 |

### 사용 예시

```javascript
// 네비게이션 항목 변경
instance.setActiveNav(2);  // '대응절차' 활성화

// 토글 변경
instance.setActiveToggle(1);  // '리포트' 활성화

// 버튼 상태 변경
instance.setButtonState('user', true);

// 부분 설정 변경 (로고만 변경)
instance.setConfig({
    logo: { symbolText: 'H', logoText: 'HANA' },
});

// 네비게이션 항목 자체를 변경
instance.setConfig({
    navItems: [
        { label: '대시보드', active: true },
        { label: '모니터링' },
        { label: '설정' },
    ],
});

// 날짜/시간 숨기기
instance.setConfig({
    datetime: { visible: false },
});
```

## 발행 이벤트 (Custom Events)

| 이벤트 | 발생 시점 | payload |
|--------|----------|---------|
| `@headerNavClicked` | GNB 네비 클릭 | `{ event, targetInstance }` |
| `@headerToggleClicked` | 토글 버튼 클릭 | `{ event, targetInstance }` |
| `@headerButtonClicked` | 원형 버튼 클릭 | `{ event, targetInstance }` |

### 페이지에서 이벤트 수신 예시

```javascript
// 페이지의 register.js에서
this.bindEvent = {
    '@headerNavClicked': function (e) {
        var clickedLink = e.target.closest('.gnb-link');
        var index = Number(clickedLink.dataset.index);
        console.log('Nav clicked:', index);
    },
    '@headerToggleClicked': function (e) {
        var clickedBtn = e.target.closest('.btn-type-a');
        var index = Number(clickedBtn.dataset.index);
        console.log('Toggle clicked:', index);
    },
    '@headerButtonClicked': function (e) {
        var clickedBtn = e.target.closest('.btn-type-b');
        var id = clickedBtn.dataset.id;
        console.log('Button clicked:', id);
    },
};
```

## 내부 동작

### GNB 네비게이션
- 클릭 시 활성 항목 자동 전환 (내부 핸들러)
- 활성 항목은 민트색 그라디언트 텍스트 + 하단 프레임 바
- 비활성 항목은 `#e4ebf6` 텍스트

### 토글 버튼
- 클릭 시 활성 항목 자동 전환 (내부 핸들러)
- 활성: 민트색 그라디언트 배경 + 어두운 텍스트
- 비활성: 어두운 배경 + `#94a3b8` 텍스트

### 원형 버튼
- 활성: 밝은 배경 + 흰색 아이콘 (`#F8FAFC`)
- 비활성: 어두운 배경 + 회색 아이콘 (`#94A3B8`)
- 클릭해도 상태 자동 전환 없음 (페이지에서 `setButtonState`로 제어)

### 날짜/시간
- 1초 간격 자동 갱신
- 형식: `16시 28분 38초` / `2026.02.26`
- `datetime.visible: false`로 비활성화 가능

## 커스터마이징 가이드

### 다른 프로젝트에서 사용할 때

1. **로고 변경**: `setConfig({ logo: { symbolText: 'H', logoText: 'HANA' } })`
2. **네비 항목 변경**: `setConfig({ navItems: [...] })`
3. **토글 항목 변경**: `setConfig({ toggleItems: [...] })`
4. **버튼 개수/ID 변경**: `setConfig({ circleButtons: [...] })`
5. **시간 숨기기**: `setConfig({ datetime: { visible: false } })`

### 아이콘 교체

`assets/` 폴더의 SVG를 교체하면 원형 버튼 아이콘이 변경된다.

| 파일 | 용도 |
|------|------|
| `btn-icon-active.svg` | 활성 버튼 아이콘 (기본: 톱니바퀴, `#F8FAFC`) |
| `btn-icon-idle.svg` | 비활성 버튼 아이콘 (기본: 톱니바퀴, `#94A3B8`) |
| `gnb-active-frame.svg` | GNB 활성 항목 하단 바 |

## 파일 구조

```
Header/
├── views/component.html        # HTML 구조 (동적 영역은 빈 슬롯)
├── styles/component.css        # #header-container 네스팅 CSS
├── scripts/
│   ├── register.js             # 초기화, Config API, 렌더링, 이벤트
│   └── beforeDestroy.js        # 정리
├── assets/
│   ├── gnb-active-frame.svg    # GNB 활성 하단 바
│   ├── btn-icon-active.svg     # 버튼 아이콘 (활성)
│   └── btn-icon-idle.svg       # 버튼 아이콘 (비활성)
├── preview.html                # 독립 테스트 (인터랙티브)
└── README.md                   # 이 문서
```
