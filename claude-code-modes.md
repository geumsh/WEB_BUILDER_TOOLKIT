# Claude Code: Permission Modes & Extended Thinking

## 1. Permission Modes

Claude Code의 자율권 수준을 제어하는 설정. 한 번에 하나만 활성화 가능.

### VSCode Extension 기본 제공 (Shift+Tab 전환)

| 모드 | 설정값 | 동작 | 용도 |
|------|--------|------|------|
| **Ask before edits** | `default` | 파일 편집·터미널 명령마다 사용자 확인 요청 | 안전한 기본값. 중요한 코드베이스 작업 시 |
| **Edit automatically** | `acceptEdits` | 파일 편집 자동 승인, 터미널 명령만 확인 | 반복적 편집이 많은 작업 시 생산성 향상 |
| **Plan** | `plan` | 읽기·분석만 가능. 파일 수정·명령 실행 불가 | 코드 탐색, 아키텍처 설계, 계획 수립 |

### 추가 모드

| 모드 | 설정값 | 사용 환경 | 활성화 방법 |
|------|--------|-----------|-------------|
| **Act** | `bypassPermissions` | 샌드박스/VM 전용 | VSCode Settings → Claude Code → "Allow bypass permissions mode" |
| **Don't Ask** | `dontAsk` | CLI 전용 | `claude --permission-mode dontAsk` |

- **Act**: 모든 작업 자동 승인. 격리된 환경에서만 사용할 것.
- **Don't Ask**: 사전 승인된 도구만 실행, 나머지 자동 거부. 자동화 파이프라인에 적합.

### Permission Rules (추가 레이어)

Permission Mode와 별개로, 특정 도구에 대한 세밀한 규칙 설정 가능:

```json
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "Bash(npm run build)"],
    "deny": ["Bash(git push --force)"],
    "ask": ["WebFetch"]
  }
}
```

---

## 2. Extended Thinking (확장 사고 트리거 키워드)

응답 전 내부 추론의 깊이를 조절하는 키워드. 메시지 어디에든 포함하면 동작.

### 키워드 목록

| 키워드 | 사고 깊이 | 용도 |
|--------|-----------|------|
| `think` | 기본 | 일반적인 분석이 필요할 때 |
| `megathink` | 깊음 | 복잡한 로직, 다중 파일 관계 분석 |
| `ultrathink` | 최대 | 아키텍처 설계, 근본 원인 분석, 복잡한 디버깅 |

### 사용 예시

```
think. 이 함수의 동작을 설명해줘.

megathink. 이 모듈의 의존성 구조를 분석해줘.

ultrathink. RNBT_architecture의 컴포넌트 로딩 구조를 개선할 방법을 찾아줘.
```

키워드는 문장 앞, 중간, 끝 어디에 위치해도 동작한다.

---

## 3. 조합 전략

Permission Mode와 Extended Thinking은 **독립된 계층**이므로 자유롭게 조합 가능.

### 권장 조합

| 상황 | Permission Mode | Thinking | 예시 |
|------|----------------|----------|------|
| 복잡한 아키텍처 설계 | Plan | ultrathink | `ultrathink. 인증 시스템 리팩토링 계획을 세워줘` |
| 다중 파일 기능 구현 | Edit automatically | megathink | `megathink. 새 API 엔드포인트를 추가해줘` |
| 단순 버그 수정 | Ask before edits | think 또는 없음 | `이 에러 수정해줘` |
| 코드 탐색/이해 | Plan | think~megathink | `megathink. 이 모듈의 데이터 흐름을 설명해줘` |
| 위험한 리팩토링 | Ask before edits | ultrathink | `ultrathink. DB 스키마 마이그레이션을 진행해줘` |

### 판단 기준

```
확장 사고가 필요한가?
├── 복잡한 분석/설계 → ultrathink 또는 megathink
├── 일반적 작업 → think 또는 생략
└── 단순 작업 → 생략

계획 승인이 필요한가?
├── 다중 파일 변경, 아키텍처 결정 → Plan 모드
├── 반복 편집, 명확한 작업 → Edit automatically
└── 중요한 코드, 첫 작업 → Ask before edits
```
