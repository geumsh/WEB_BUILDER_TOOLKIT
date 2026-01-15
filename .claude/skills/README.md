# Skills 워크플로우 가이드

RNBT 컴포넌트 개발을 위한 Skills 사용 가이드입니다.

---

## 폴더 구조

```
.claude/
├── guides/
│   └── CODING_STYLE.md              # 참조 문서 (함수형 코딩 지침, CSS 원칙)
└── skills/
    ├── README.md                    # 이 문서
    ├── 1-figma/                     # Figma → Static (정적 퍼블리싱)
    │   ├── figma-to-html/
    │   └── figma-to-inline-svg/
    ├── 2-component/                 # Static → Dynamic (동적 변환)
    │   ├── create-component/
    │   ├── create-symbol-state-component/
    │   ├── create-standalone-component/
    │   └── create-self-contained-component/
    └── 3-page/                      # Component → Page (페이지 조합)
        └── create-project/
```

---

## 전체 워크플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│  1-figma (정적 퍼블리싱)                                             │
│                                                                      │
│  [figma-to-html] ─────────────────────┐                             │
│       │                               │                             │
│       │ 일반 컴포넌트                  │ 심볼/아이콘                  │
│       ▼                               ▼                             │
│  Static HTML/CSS              [figma-to-inline-svg]                 │
│                                       │                             │
│                                       ▼                             │
│                               인라인 SVG HTML                        │
└──────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2-component (동적 변환)                                             │
│                                                                      │
│  [create-component] ◄─────────────────┬──────► [create-symbol-state │
│       │                               │         -component]         │
│       │                               │               │             │
│       ▼                               │               ▼             │
│  동적 컴포넌트                         │        상태 기반 심볼        │
│       │                               │               │             │
│       └───────────────────────────────┴───────────────┘             │
│                               │                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 독립 경로 (Figma 없이)                                        │    │
│  │                                                              │    │
│  │  [create-standalone-component] → 일반 컴포넌트               │    │
│  │  [create-self-contained-component] → 자기완결 컴포넌트        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3-page (페이지 조합)                                                │
│                                                                      │
│                      [create-project]                                │
│                               │                                      │
│                               ▼                                      │
│                      완전한 프로젝트 구조                             │
│                      (Master/Page/컴포넌트/Mock서버)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Skill 목록

### 1-figma: Figma → Static (정적 퍼블리싱)

| Skill | 입력 | 출력 | 설명 |
|-------|------|------|------|
| **figma-to-html** | Figma node-id | HTML/CSS | 일반 컴포넌트용 정적 코드 |
| **figma-to-inline-svg** | Figma node-id | 인라인 SVG HTML | 심볼/아이콘용 (런타임 색상 제어) |

### 2-component: Static → Dynamic (동적 변환)

| Skill | 입력 | 출력 | 설명 |
|-------|------|------|------|
| **create-component** | Static HTML/CSS | RNBT 컴포넌트 | 일반 동적 컴포넌트 |
| **create-symbol-state-component** | 인라인 SVG HTML | 상태 기반 심볼 | CSS 변수로 색상 제어 |
| **create-standalone-component** | 없음 | RNBT 컴포넌트 | Components/ 폴더용 재사용 컴포넌트 |
| **create-self-contained-component** | 없음 | 자기완결 컴포넌트 | datasetInfo + Shadow DOM 팝업 |

### 3-page: Component → Page (페이지 조합)

| Skill | 입력 | 출력 | 설명 |
|-------|------|------|------|
| **create-project** | 컴포넌트들 | 완전한 프로젝트 | Master/Page/Mock서버 포함 |

---

## 상황별 Skill 선택

### "Figma 디자인이 있다"

```
Figma 링크/node-id
    │
    ├─ 일반 컴포넌트 → figma-to-html → create-component
    │
    └─ 심볼/아이콘 (색상 변경 필요) → figma-to-inline-svg → create-symbol-state-component
```

### "Figma 디자인이 없다"

```
요구사항만 있음
    │
    ├─ 재사용 가능한 UI 컴포넌트 → create-standalone-component
    │
    └─ 독립적으로 데이터 fetch하는 컴포넌트 → create-self-contained-component
```

### "전체 프로젝트를 새로 만든다"

```
create-project → Master/Page/컴포넌트/Mock서버 전체 구조
```

---

## Skill 간 연결

```
1-figma/figma-to-html
    └─→ 2-component/create-component
            └─→ 3-page/create-project

1-figma/figma-to-inline-svg
    └─→ 2-component/create-symbol-state-component
            └─→ 3-page/create-project

2-component/create-standalone-component ─→ 3-page/create-project

2-component/create-self-contained-component ─→ 3-page/create-project
```

---

## 참고 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| CODING_STYLE.md | `../guides/` | 함수형 코딩 지침, CSS 원칙 |
| RNBT README | `RNBT_architecture/README.md` | 아키텍처 설계 문서 |

---

## 주의사항

1. **정적/동적 분리**: Figma 단계에서는 스크립트 없이 순수 퍼블리싱만
2. **Figma MCP 필요**: 1-figma/ 폴더의 Skills는 Figma Desktop + MCP 서버 필요
3. **CODING_STYLE 참조**: 모든 코드 작성 시 `../guides/CODING_STYLE.md` 참조

