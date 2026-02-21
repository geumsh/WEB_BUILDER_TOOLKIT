# Hooks를 활용한 프로젝트 일관성 보장

## 1. 문제: 텍스트 규칙의 한계

### 1.1 현재 구조

> **2026-02-21 업데이트:** SKILL 문서 중복 제거 완료 (커밋 `5a349ad`).
> 각 규칙은 이제 한 곳(SHARED_INSTRUCTIONS.md 또는 Figma_Conversion/CLAUDE.md)에만 존재하고,
> SKILL은 참조 링크로 연결. **남은 과제는 "강제(enforcement)"**.

프로젝트 규칙이 **단일 출처에 텍스트로 존재**한다:

```
SHARED_INSTRUCTIONS.md → "unsubscribe는 2-arg", "{ response } 패턴", "preview.html inline CSS"
Figma_Conversion/CLAUDE.md → "MCP 도구: get_design_context, get_screenshot"
CODING_STYLE.md        → CSS 원칙, fx.js 패턴
```

각 SKILL은 이 문서들을 참조하도록 지시하고, 고유 내용만 보유한다.

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
중복 제거로 "여러 문서 간 불일치" 문제는 해결됨.
남은 문제는 "텍스트 규칙의 강제력 부재":

Claude Code가 참조 문서를 읽었더라도:
  - 컨텍스트 윈도우 압축 후 규칙이 유실될 수 있다
  - 규칙을 "알고" 있어도 실수로 위반할 수 있다
  - SKILL이 참조 문서 읽기를 지시하지만, 실제로 읽는지 보장할 수 없다

→ 텍스트 규칙만으로는 100% 준수를 보장할 수 없다.
→ Hook은 컨텍스트와 무관하게 규칙을 강제하는 안전망 역할.
```

---

## 2. 해결: Hooks로 규칙을 실행 가능하게 만든다

### 2.1 핵심 원리

```
[현재] 규칙이 단일 출처에 텍스트로 존재 (중복 제거 완료)
       → Claude가 참조 문서를 읽어야 효력 발생
       → 읽었더라도 컨텍스트 압축 시 유실 위험
       → 읽지 않으면 규칙 자체를 모름

[Hook 도입 후] 텍스트 규칙 + Hook 스크립트가 이중 안전망
               → 도구 실행 시 자동 검증
               → 컨텍스트 압축과 무관하게 항상 동작
               → 문서는 "설명", Hook이 "강제"
```

### 2.2 역할 분리

| 역할 | 현재 (텍스트 단일 출처) | Hook 도입 후 |
|------|----------------------|-------------|
| 규칙 정의 | 참조 문서 1곳에 작성 (완료) | 동일 (변경 없음) |
| 규칙 강제 | 없음 (Claude가 읽고 따르기를 기대) | Hook 스크립트가 자동 검증 |
| 위반 감지 | 수동 감사 (사후 발견) | 도구 실행 시 즉시 차단/경고 |

**Hook의 가치:**

- 중복 제거는 이미 완료 — Hook은 "강제"를 담당
- Claude가 참조 문서를 읽지 않았더라도 규칙 위반을 잡아냄
- 컨텍스트 압축 후에도 검증이 유지됨

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

**Hook 도입 효과:**

```
현재: SHARED_INSTRUCTIONS.md 1곳에 규칙 존재 (중복 제거 완료)
      → Claude가 읽지 않으면 위반 가능
Hook: 파일 수정 시 자동 검증 → 읽지 않아도 위반 차단
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

**Hook 도입 효과:**

```
현재: SHARED_INSTRUCTIONS.md 1곳에 규칙 존재 (중복 제거 완료)
Hook: beforeDestroy.js 수정 시 3-arg 패턴 자동 차단
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

**Hook 도입 효과:**

```
현재: Figma_Conversion/CLAUDE.md 1곳에 도구명 정의 (중복 제거 완료)
Hook: .md 파일 수정 시 폐기된 도구명 자동 차단
      → MCP 업데이트 시 도구명 불일치 재발 방지
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

### 4.1 규칙 강제 수준

```
                     중복 제거 후 (현재)    Hook 도입 후
                     ─────────────────    ──────────
preview.html CSS     1곳 설명              1곳 설명 + Hook 강제
unsubscribe args     1곳 설명              1곳 설명 + Hook 강제
MCP 도구명           1곳 설명              1곳 설명 + Hook 강제
{ response } 패턴    1곳 설명              1곳 설명 + Hook 강제
                     ─────────────────    ──────────
강제 메커니즘         없음 (읽기 의존)      4개 Hook 자동 검증
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
현재:   Claude가 참조 문서를 읽어야 효력 발생
        → SKILL이 읽기를 지시하지만 강제할 수 없음
        → 컨텍스트 압축 후 규칙 유실 가능

Hook:   컨텍스트와 무관하게 항상 동작
        → 참조 문서를 읽지 않았더라도 위반 차단
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

### 6.3 문서는 여전히 필요

```
중복 제거 + Hook 도입 후에도 규칙 "설명"은 문서에 남아야 한다.
  - 왜 이 규칙이 존재하는지 (맥락)
  - 규칙의 정확한 정의 (기준)
  - Claude가 참조 문서를 읽었을 때 이해할 수 있는 설명

현재 구조:
  - 설명: 참조 문서 1곳 (중복 제거 완료)
  - 강제: Hook (도입 예정)
```

---

## 7. 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Phase 1 완료: 중복 제거 (커밋 5a349ad)                      │
│                                                             │
│    규칙 A ──→ 참조 문서 1곳 (단일 출처)                      │
│    규칙 B ──→ 참조 문서 1곳 (단일 출처)                      │
│    SKILL  ──→ 참조 링크 + 고유 내용만                        │
│                                                             │
│    ✅ 불일치 위험 제거                                       │
│    ⚠️ Claude가 참조 문서를 읽어야 효력 발생                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 2 예정: Hook 도입                                     │
│                                                             │
│    규칙 A ──→ 참조 문서 (설명) + Hook A (강제)               │
│    규칙 B ──→ 참조 문서 (설명) + Hook B (강제)               │
│                                                             │
│    ✅ 불일치 위험 제거 (Phase 1에서 완료)                     │
│    ✅ 읽지 않아도 위반 차단 (Hook이 보장)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

핵심: 중복 제거(Phase 1)로 "한 곳에 쓰기"는 완료.
      Hook(Phase 2)은 "자동으로 강제하기"를 추가하는 안전망.
```

---

*작성일: 2026-02-20*
*업데이트: 2026-02-21 — 중복 제거 완료 반영 (Phase 1 → Phase 2 구조로 변경)*
*관련 커밋: 364da59, 7495432, 821fe4d (불일치 20건 수정), 5a349ad (SKILL 중복 제거)*
*관련 문서: CLAUDE_CODE_AUDIT.md Issue F*
