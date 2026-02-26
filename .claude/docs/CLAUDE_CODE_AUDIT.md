# Claude Code 활용도 감사 보고서

> 감사 일자: 2026-02-20
> 대상: WEB_BUILDER_TOOLKIT 프로젝트
> 기준: Claude Code 2026년 2월 기준 최신 기능 및 권장 사항

---

## 1. 프로젝트 구성 현황

### 활용 중인 기능

| 기능 | 위치 | 상태 |
|------|------|------|
| Skills (6개) | `.claude/skills/{1-figma,2-component,3-page}/` | 최신 형식 사용 |
| 계층적 CLAUDE.md | 루트, Figma_Conversion, RNBT_architecture | 3개 파일 |
| 공유 지침 | `.claude/skills/SHARED_INSTRUCTIONS.md` | 191줄 |
| 코딩 가이드 | `.claude/guides/CODING_STYLE.md` | 534줄 |
| Auto Memory | `~/.claude/projects/.../memory/MEMORY.md` | 활용 중 |
| 디렉토리별 권한 | `{root,Figma_Conversion,RNBT_architecture}/.claude/settings.local.json` | 3개 파일 |
| Figma MCP | CLI 등록 (`claude mcp add`) | 동작 중 |

### 미활용 기능

| 기능 | 용도 |
|------|------|
| `.mcp.json` | 프로젝트 레벨 MCP 설정 공유 |
| `.claudeignore` | 불필요한 파일의 컨텍스트 소모 방지 |
| Hooks | 도구 실행 전후 자동화 (린트, 검증 리마인더 등) |
| `.claude/settings.json` | 팀 공유용 권한 설정 (현재 local만 사용) |
| Skill frontmatter 고급 옵션 | `context: fork`, `allowed-tools` 등 |
| `.claude/agents/` | 커스텀 서브에이전트 정의 |

---

## 2. 평가 상세

### 2.1 우수 — Skills 시스템

```
.claude/skills/
├── 1-figma/
│   ├── figma-to-html/SKILL.md
│   └── figma-to-inline-svg/SKILL.md
├── 2-component/
│   ├── create-standard-component/SKILL.md
│   ├── create-symbol-state-component/SKILL.md
│   └── create-component-with-popup/SKILL.md
├── 3-page/
│   └── create-project/SKILL.md
├── README.md
└── SHARED_INSTRUCTIONS.md
```

**강점:**

- 최신 `.claude/skills/<name>/SKILL.md` 형식 사용 (deprecated `.claude/commands/` 아님)
- YAML frontmatter에 `name`, `description` 올바르게 작성
- 3단계 파이프라인으로 논리적 분류 (figma → component → page)
- `SHARED_INSTRUCTIONS.md`로 공통 규칙 중앙 관리 — 6개 skill이 모두 참조
- 각 skill이 "작업 전 필수 읽기" 패턴으로 컨텍스트 손실 방지
- 금지 사항이 실제 실패 경험에 기반하여 구체적

### 2.2 우수 — 계층적 CLAUDE.md

```
CLAUDE.md (루트, ~200줄)
├── Figma_Conversion/CLAUDE.md (895줄)
└── RNBT_architecture/CLAUDE.md (94줄)
```

**강점:**

- 루트 CLAUDE.md가 전체 안내 + SKILL 선택 가이드 역할
- 디렉토리별 CLAUDE.md가 해당 컨텍스트에서만 로드됨
- RNBT_architecture/CLAUDE.md는 94줄로 간결

**문제점:** Figma_Conversion/CLAUDE.md가 895줄 (권장: 200줄 이내) → Issue D 참조

### 2.3 양호 — 권한 설정

```
루트 settings.local.json       — 49줄 (MCP + 빌드 도구 + git)
Figma_Conversion/              — 19줄 (MCP + serve + playwright)
RNBT_architecture/             — 13줄 (npm + curl)
```

**강점:**

- 디렉토리별 최소 권한 원칙 적용
- RNBT는 MCP 불필요하므로 제외됨

**문제점:** 루트 settings.local.json에 과거 커밋 메시지 규칙이 누적 → Issue A 참조

### 2.4 양호 — MCP 통합

**강점:**

- Figma MCP 4개 도구 (`get_metadata`, `get_code`, `get_image`, `get_variable_defs`) 문서화
- `dirForAssetWrites` 파라미터 활용법 명확
- MCP 등록 커맨드와 검증 방법 문서화

**문제점:** CLI 등록만 사용, `.mcp.json` 미사용 → Issue B 참조

---

## 3. 발견된 이슈

### Issue A: settings.local.json 오염 — 우선순위 높음

**현상:**

루트 `.claude/settings.local.json`에 과거 세션에서 허용한 git commit 명령이 개별 규칙으로 누적되어 있다. (27~36줄, 약 10개의 개별 커밋 메시지)

```json
// 불필요한 개별 규칙 (예시)
"Bash(git commit -m \"$\\(cat <<''EOF''\\ndocs: README.md 및 Agent Skill 분석 문서 추가...\")"
"Bash(git commit -m \"$\\(cat <<''EOF''\\nfix\\(skills\\): create-dashboard 템플릿을...\")"
```

**문제:**

- 설정 파일 가독성 저하
- 이미 44줄에 `"Bash(git commit:*)"` 범용 규칙이 존재하므로 개별 항목 전부 불필요

**해결:** 개별 git commit 규칙 전부 삭제. `"Bash(git commit:*)"` 하나로 충분.

---

### Issue B: .mcp.json 미사용 — 우선순위 높음

**현상:**

MCP 서버가 CLI로만 등록되어 `~/.claude.json` (개인 환경)에만 존재한다. 프로젝트에 `.mcp.json`이 없다.

**문제:**

- 다른 환경/팀원은 수동으로 MCP 등록 필요
- 프로젝트의 MCP 의존성이 코드로 추적되지 않음

**해결:**

```json
// 프로젝트 루트 .mcp.json
{
  "mcpServers": {
    "figma-desktop": {
      "type": "http",
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

---

### Issue C: .claudeignore 미사용 — 우선순위 중간

**현상:**

`.claudeignore` 파일이 없어서 Claude Code가 탐색 시 불필요한 파일을 포함할 수 있다.

**문제:**

- `node_modules/`, `package-lock.json`, `screenshots/*.png` 등이 컨텍스트에 노출
- 특히 110개 SVG 에셋 파일이 검색 결과에 포함될 수 있음

**해결:**

```gitignore
# .claudeignore
node_modules/
package-lock.json
**/screenshots/
**/*.png
**/*.jpg
```

---

### Issue D: Figma_Conversion/CLAUDE.md 과다 — 우선순위 중간

**현상:**

`Figma_Conversion/CLAUDE.md`가 895줄. 공식 권장은 200줄 이내.

**문제:**

- 이 디렉토리에서 작업할 때마다 895줄이 시스템 프롬프트에 로드됨
- `figma-to-html` SKILL.md와 상당 부분 중복
- 컨텍스트 윈도우 소모 과다

**해결안:**

```
현재:
  Figma_Conversion/CLAUDE.md (895줄)

권장:
  Figma_Conversion/CLAUDE.md (~100줄)     — 핵심 원칙 + 참조 링크
  .claude/guides/FIGMA_WORKFLOW.md        — 상세 워크플로우 (skill이 Read로 참조)
  .claude/guides/FIGMA_MCP_USAGE.md       — MCP 도구 사용법 상세
```

CLAUDE.md는 항상 로드되지만, guides는 skill이 필요시에만 Read하므로 평소 컨텍스트 절약.

---

### Issue E: settings.json (공유) 미사용 — 우선순위 낮음

**현상:**

`settings.local.json`만 존재. 이 파일은 git에 추적되지 않으므로 팀 공유 불가.

**해결안:**

```
.claude/settings.json       — 공통 권한 (MCP, serve, playwright)  ← 신규
.claude/settings.local.json — 개인 환경 (powershell 경로 등)      ← 기존 정리
```

---

### Issue F: Hooks 미활용 — 우선순위 낮음

**현상:**

Hooks 기능을 전혀 사용하지 않고 있다.

**활용 가능 시나리오:**

| 훅 이벤트 | 용도 |
|-----------|------|
| `PostToolUse` (Write\|Edit on *.css) | CSS 수정 후 px 단위/Flexbox 원칙 리마인더 |
| `PostToolUse` (Write\|Edit on *.js) | JS 수정 후 `{ response }` 패턴 검증 |
| `Stop` | 작업 완료 시 스크린샷 검증 여부 확인 |

현재 이 규칙들이 CLAUDE.md와 SKILL.md에 텍스트로 존재하지만, hooks로 자동화하면 누락 방지가 더 확실하다.

---

### Issue G: Skill frontmatter 최신 옵션 미활용 — 우선순위 낮음

**현상:**

Skill frontmatter가 `name`과 `description`만 사용.

**활용 가능 옵션:**

```yaml
---
name: figma-to-html
description: ...
context: fork          # 격리된 서브에이전트에서 실행 → 메인 컨텍스트 보호
allowed-tools: Read, Write, Edit, Bash, mcp__figma-desktop__*  # 도구 제한
---
```

`context: fork`는 각 skill이 4~5개 문서를 매번 읽는 현재 구조에서 메인 컨텍스트 윈도우를 보호하는 데 효과적. 단, fork 컨텍스트에서는 이전 대화 맥락이 유실되므로 skill이 자체 완결적일 때만 적합.

---

## 4. 우선순위 요약

| 순위 | 이슈 | 작업량 | 효과 |
|------|------|--------|------|
| 1 | **A. settings.local.json 정리** | 5분 | 가독성, 유지보수성 |
| 2 | **B. .mcp.json 생성** | 5분 | 환경 재현성, 팀 공유 |
| 3 | **C. .claudeignore 추가** | 5분 | 컨텍스트 효율성 |
| 4 | **D. Figma CLAUDE.md 분할** | 30분 | 컨텍스트 윈도우 절약 |
| 5 | **E. settings.json 분리** | 15분 | 팀 공유 |
| 6 | **F. Hooks 도입** | 20분 | 검증 자동화 |
| 7 | **G. Skill frontmatter 확장** | 10분 | 컨텍스트 보호 |

---

## 5. 총평

이 프로젝트는 Claude Code를 **단순 코드 생성 도구가 아닌 개발 파이프라인의 핵심 엔진**으로 활용하고 있다. 특히:

- **Skills 파이프라인** (figma → component → project)은 Claude Code의 skill 시스템을 설계 의도에 가장 부합하게 사용하는 사례
- **SHARED_INSTRUCTIONS.md + 필수 읽기 패턴**은 컨텍스트 손실 문제에 대한 실용적 해결책
- **경험 기반 금지 사항**은 실제 실패에서 학습한 구체적 규칙으로, 일반적인 가이드라인보다 효과적

위의 이슈들은 "잘못된 것"이 아니라 "더 나아질 수 있는 것"에 해당한다. Issue A~C는 5분 내 해결 가능하므로 즉시 적용을 권장한다.

---

*감사 수행: Claude Opus 4.6*
