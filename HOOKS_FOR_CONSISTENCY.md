# Hooks를 활용한 프로젝트 일관성 보장

## 1. 문제: 텍스트 규칙의 한계

### 1.1 현재 구조

프로젝트 규칙이 **여러 문서에 텍스트로 분산**되어 있다:

```
CLAUDE.md              → "preview.html에서 로컬 CSS <link> 금지"
SKILL.md               → "CSS는 <style>로 인라인"
SHARED_INSTRUCTIONS.md → "unsubscribe는 2-arg"
CODING_STYLE.md        → "{ response } 패턴 사용"
README.md              → "MCP 도구: get_design_context, get_screenshot"
```

### 1.2 실제 발생한 문제

SKILL↔예제 일관성 감사에서 **20건의 불일치**가 발견되었다:

| 유형 | 건수 | 원인 |
|------|------|------|
| MCP 도구명 불일치 | 5건 | 동일 정보가 3곳에 분산 |
| preview.html 로컬 CSS `<link>` | 10건 | 규칙이 암묵적, 검증 없음 |
| unsubscribe 3-arg 패턴 | 3건 | SKILL 템플릿만 수정, 기존 예제 미반영 |
| 기타 패턴 불일치 | 2건 | 문서↔코드 간 동기화 누락 |

### 1.3 근본 원인

```
텍스트 규칙은 "읽히지 않으면 존재하지 않는 것"이다.

Claude Code가 SKILL.md를 읽었더라도:
  - 컨텍스트 윈도우 압축 후 규칙이 유실될 수 있다
  - 여러 문서의 규칙이 충돌하면 어떤 것을 따를지 불명확하다
  - 규칙을 "알고" 있어도 실수로 위반할 수 있다

→ 텍스트 규칙만으로는 100% 준수를 보장할 수 없다.
```

---

## 2. 해결: Hooks로 규칙을 실행 가능하게 만든다

### 2.1 핵심 원리

```
[Before] 규칙이 텍스트로 여러 문서에 분산
         → Claude가 읽어야 효력 발생
         → 문서 간 불일치 위험
         → 컨텍스트 압축 시 유실 위험

[After]  규칙이 Hook 스크립트로 한 곳에 존재
         → 도구 실행 시 자동 검증
         → 컨텍스트 압축과 무관하게 항상 동작
         → 문서는 "설명"만, Hook이 "강제"
```

### 2.2 중복 감소 메커니즘

Hooks가 중복을 줄이는 방식은 **역할 분리**다:

| 역할 | Before (텍스트만) | After (Hooks 도입) |
|------|-------------------|-------------------|
| 규칙 정의 | CLAUDE.md, SKILL.md, SHARED, CODING_STYLE 모두에 작성 | 한 곳에만 작성 (설명용) |
| 규칙 강제 | 없음 (Claude의 기억에 의존) | Hook 스크립트가 자동 검증 |
| 위반 감지 | 수동 감사 (사람이 발견) | 도구 실행 시 즉시 차단/경고 |

**결과:**

- 동일 규칙을 여러 문서에 반복 작성할 필요가 없다
- 한 곳에서 규칙을 변경하면 Hook이 즉시 반영한다
- "문서를 업데이트했는데 다른 문서는 안 했다" 문제가 사라진다

---

## 3. 구체적 적용: 이번 감사에서 발견된 불일치별 Hook 설계

### 3.1 preview.html 로컬 CSS `<link>` 방지

**문제:** 10개 preview.html이 `<link href="styles/component.css">`를 사용
**현재 방식:** SKILL.md에 "CSS는 인라인으로" 텍스트 규칙
**Hook 해결:**

```
이벤트:   PostToolUse (matcher: Write|Edit)
트리거:   preview.html 파일이 수정될 때
동작:     로컬 CSS <link> 패턴이 있으면 경고 메시지 반환
효과:     Claude가 즉시 인라인으로 수정
```

**스크립트 로직 (의사코드):**

```bash
#!/bin/bash
# .claude/hooks/validate-preview-css.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# preview.html 파일만 대상
if [[ "$FILE_PATH" != *"preview.html" ]]; then
  exit 0
fi

# 로컬 CSS <link> 패턴 검사 (CDN 제외)
if grep -q '<link.*href="styles/' "$FILE_PATH" 2>/dev/null; then
  echo '{"decision":"block","reason":"preview.html에 로컬 CSS <link>가 발견되었습니다. CSS는 반드시 <style> 태그로 인라인해야 합니다. styles/component.css 내용을 읽어서 <style> 블록으로 교체해주세요."}'
  exit 0
fi

exit 0
```

**설정:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/validate-preview-css.sh"
          }
        ]
      }
    ]
  }
}
```

**문서 중복 감소 효과:**

```
Before: 3곳에 규칙 명시 필요 (SKILL.md, SHARED_INSTRUCTIONS.md, CODING_STYLE.md)
After:  Hook 스크립트 1개 + 설명 문서 1곳
```

---

### 3.2 unsubscribe 패턴 검증

**문제:** beforeDestroy.js에서 `unsubscribe(topic, instance, handler)` 3-arg 패턴 사용
**현재 방식:** SHARED_INSTRUCTIONS.md에 "2-arg만 사용" 텍스트 규칙
**Hook 해결:**

```
이벤트:   PostToolUse (matcher: Write|Edit)
트리거:   beforeDestroy.js 파일이 수정될 때
동작:     unsubscribe 호출에서 3번째 인자가 있으면 경고
효과:     Claude가 즉시 2-arg로 수정
```

**스크립트 로직 (의사코드):**

```bash
#!/bin/bash
# .claude/hooks/validate-unsubscribe.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# beforeDestroy.js 파일만 대상
if [[ "$FILE_PATH" != *"beforeDestroy.js" ]]; then
  exit 0
fi

# unsubscribe 3-arg 패턴 검사
# 정상: unsubscribe(topic, this)
# 위반: unsubscribe(topic, this, handler)
if grep -P 'unsubscribe\([^)]+,[^)]+,[^)]+\)' "$FILE_PATH" 2>/dev/null; then
  echo '{"decision":"block","reason":"beforeDestroy.js에서 unsubscribe 3-arg 패턴이 발견되었습니다. GlobalDataPublisher.unsubscribe()는 (topic, instance) 2개 인자만 받습니다. 3번째 인자를 제거해주세요."}'
  exit 0
fi

exit 0
```

**문서 중복 감소 효과:**

```
Before: SHARED_INSTRUCTIONS.md + CODING_STYLE.md + SKILL 템플릿 3곳에 규칙 반복
After:  Hook 스크립트 1개가 강제 + SHARED_INSTRUCTIONS.md 1곳에 설명
```

---

### 3.3 MCP 도구명 일관성 검증

**문제:** `get_image`, `get_metadata` 등 폐기된 MCP 도구명이 문서에 잔존
**현재 방식:** 수동 감사로 발견
**Hook 해결:**

```
이벤트:   PostToolUse (matcher: Write|Edit)
트리거:   .md 파일이 수정될 때
동작:     폐기된 MCP 도구명이 포함되어 있으면 경고
효과:     Claude가 즉시 현재 도구명으로 수정
```

**스크립트 로직 (의사코드):**

```bash
#!/bin/bash
# .claude/hooks/validate-mcp-names.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .md 파일만 대상
if [[ "$FILE_PATH" != *.md ]]; then
  exit 0
fi

# 폐기된 MCP 도구명 검사
DEPRECATED_NAMES="get_metadata|get_code|get_image|get_variable_defs"
if grep -qE "$DEPRECATED_NAMES" "$FILE_PATH" 2>/dev/null; then
  echo '{"decision":"block","reason":"폐기된 MCP 도구명이 발견되었습니다. 현재 도구: get_design_context (디자인 정보+코드), get_screenshot (PNG 캡처). 폐기된 이름을 현재 이름으로 교체해주세요."}'
  exit 0
fi

exit 0
```

**문서 중복 감소 효과:**

```
Before: MCP 도구명이 README.md, CLAUDE.md, Figma_Conversion/CLAUDE.md 3곳에 분산
        → 하나를 업데이트하면 나머지도 수동으로 찾아서 업데이트해야 함
After:  Hook이 폐기된 이름 사용을 차단
        → 어떤 문서든 수정 시 자동 감지
        → 3곳 모두 동기화할 필요 없이, 수정되는 시점에 교정
```

---

### 3.4 `{ response }` 패턴 검증

**문제:** register.js에서 `response` 대신 `{ response }`를 사용해야 하는 규칙
**현재 방식:** CODING_STYLE.md에 텍스트 규칙
**Hook 해결:**

```
이벤트:   PostToolUse (matcher: Write|Edit)
트리거:   register.js 파일이 수정될 때
동작:     구독 콜백에서 비구조화 패턴이 아닌 경우 경고
효과:     Claude가 즉시 { response } 패턴으로 수정
```

**스크립트 로직 (의사코드):**

```bash
#!/bin/bash
# .claude/hooks/validate-response-pattern.sh
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# register.js 파일만 대상
if [[ "$FILE_PATH" != *"register.js" ]]; then
  exit 0
fi

# subscribe 콜백에서 (response) 패턴 검사 (구조분해가 아닌 경우)
# 정상: ({ response }) => { ... }
# 위반: (response) => { ... }
if grep -P 'subscribe\([^)]*,\s*\(response\)\s*=>' "$FILE_PATH" 2>/dev/null; then
  echo '{"decision":"block","reason":"register.js에서 subscribe 콜백이 (response) 패턴을 사용합니다. ({ response }) 구조분해 패턴을 사용해주세요. datasetName 기반 { response } 패턴이 표준입니다."}'
  exit 0
fi

exit 0
```

---

## 4. 도입 전후 비교

### 4.1 규칙 문서화 부담

```
                     Before              After
                     ──────              ─────
preview.html CSS     3곳 명시            1곳 설명 + Hook 강제
unsubscribe args     3곳 명시            1곳 설명 + Hook 강제
MCP 도구명           3곳 동기화          Hook이 폐기명 차단
{ response } 패턴    2곳 명시            1곳 설명 + Hook 강제
                     ──────              ─────
총 문서화 지점        11곳               4곳 설명 + 4개 Hook
```

### 4.2 불일치 감지 시점

```
Before: 수동 감사 시 발견 (사후)
        → 이미 20건의 불일치가 누적된 후 발견

After:  파일 수정 시 즉시 감지 (사전)
        → 불일치가 생성되는 순간 차단
```

### 4.3 컨텍스트 윈도우 의존성

```
Before: Claude가 규칙 문서를 읽어야 효력 발생
        → 컨텍스트 압축 후 규칙 유실 가능
        → 긴 세션에서 규칙 망각 가능

After:  Hook은 컨텍스트와 무관하게 항상 동작
        → 압축 후에도 검증 유지
        → 세션 길이에 영향받지 않음
```

---

## 5. 구현 계획

### 5.1 파일 구조

```
.claude/
├── settings.json          ← Hook 이벤트 등록
└── hooks/
    ├── validate-preview-css.sh
    ├── validate-unsubscribe.sh
    ├── validate-mcp-names.sh
    └── validate-response-pattern.sh
```

### 5.2 settings.json Hook 설정

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/validate-preview-css.sh",
            "statusMessage": "preview.html CSS 검증 중..."
          },
          {
            "type": "command",
            "command": ".claude/hooks/validate-unsubscribe.sh",
            "statusMessage": "unsubscribe 패턴 검증 중..."
          },
          {
            "type": "command",
            "command": ".claude/hooks/validate-mcp-names.sh",
            "statusMessage": "MCP 도구명 검증 중..."
          },
          {
            "type": "command",
            "command": ".claude/hooks/validate-response-pattern.sh",
            "statusMessage": "{ response } 패턴 검증 중..."
          }
        ]
      }
    ]
  }
}
```

### 5.3 도입 단계

```
Phase 1: 경고 모드 (현재 계획)
         → PostToolUse에서 위반 감지 시 경고 메시지 반환
         → Claude가 자발적으로 수정
         → 개발 흐름을 차단하지 않음

Phase 2: 차단 모드 (안정화 후)
         → PreToolUse에서 위반 감지 시 실행 자체를 차단
         → 위반 코드가 파일에 쓰이기 전에 방지
         → 더 강력하지만, 오탐(false positive) 가능성 주의
```

---

## 6. 한계와 주의사항

### 6.1 Hooks가 해결하지 못하는 것

| 한계 | 설명 |
|------|------|
| 의미적 일관성 | "코드가 규칙을 따르는가"는 검증 가능하지만, "설계가 올바른가"는 불가 |
| 신규 규칙 발견 | Hook은 알려진 규칙만 검증. 새로운 불일치 유형은 여전히 수동 감사 필요 |
| 복잡한 패턴 | 정규식으로 표현 불가능한 규칙 (예: "컴포넌트 구조가 Figma 레이아웃과 일치하는가") |

### 6.2 오탐 방지

```
예: validate-mcp-names.sh가 "get_image 함수" 같은 무관한 텍스트도 잡을 수 있음

대응:
  - 파일 경로 필터를 좁게 설정 (특정 디렉토리만)
  - 컨텍스트를 함께 검사 (줄 단위가 아닌 주변 패턴 포함)
  - Phase 1에서 경고 모드로 운영하며 오탐 패턴 수집
  - 수집 후 정규식 정밀화
```

### 6.3 문서 완전 제거는 불가

```
Hook 도입 후에도 규칙 "설명"은 문서에 남아야 한다.
  - 왜 이 규칙이 존재하는지 (맥락)
  - 규칙의 정확한 정의 (기준)

다만, 동일 규칙을 여러 문서에 "반복 작성"할 필요가 없어진다.
  - 설명은 1곳 (SHARED_INSTRUCTIONS.md 또는 CODING_STYLE.md)
  - 강제는 Hook
```

---

## 7. 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  텍스트 규칙만 사용할 때:                                     │
│                                                             │
│    규칙 A ──→ 문서 1, 문서 2, 문서 3  (3곳에 중복 작성)       │
│    규칙 B ──→ 문서 1, 문서 4          (2곳에 중복 작성)       │
│    규칙 C ──→ 문서 2, 문서 3, 문서 5  (3곳에 중복 작성)       │
│                                                             │
│    → 11개 문서화 지점 + 수동 동기화 + 수동 감사               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Hooks 도입 후:                                              │
│                                                             │
│    규칙 A ──→ 문서 1 (설명) + Hook A (강제)                  │
│    규칙 B ──→ 문서 1 (설명) + Hook B (강제)                  │
│    규칙 C ──→ 문서 1 (설명) + Hook C (강제)                  │
│                                                             │
│    → 3개 문서화 지점 + 자동 검증 + 즉시 감지                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

핵심: Hooks는 "규칙을 여러 곳에 써놓고 읽히길 바라는 것"에서
      "한 곳에 쓰고, 자동으로 강제하는 것"으로 전환한다.
```

---

*작성일: 2026-02-20*
*관련 커밋: 364da59, 7495432, 821fe4d (불일치 20건 수정)*
*관련 문서: CLAUDE_CODE_AUDIT.md Issue F*
