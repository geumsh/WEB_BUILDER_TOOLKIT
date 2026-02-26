# Tests

Playwright 기반 E2E 테스트입니다.

## 환경 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | 18+ |
| npm | 9+ |
| @playwright/test | 1.57.0 |

## 설치

```bash
cd RNBT_architecture

# 의존성 설치
npm install

# Playwright 브라우저 다운로드 (chromium만 필요)
npx playwright install chromium
```

## 테스트 대상 서버

`playwright.config.ts`의 `baseURL`에 설정된 서버가 실행 중이어야 합니다.

```
baseURL: http://10.23.128.203:9000
```

테스트는 이 서버의 `/renobit` 경로로 접속하여 로그인 후 에디터/뷰어를 조작합니다.

## 실행

```bash
# headless 실행
npm test

# 브라우저 화면 보면서 실행
npm run test:headed

# Playwright UI 모드 (디버깅에 유용)
npm run test:ui
```

## 테스트 파일

| 파일 | 내용 |
|------|------|
| `example.spec.ts` | 로그인 → 에디터 조작 → 컴포넌트 라이프사이클 검증 |

## 테스트 결과 확인

```bash
# HTML 리포트 열기 (테스트 실행 후)
npx playwright show-report
```

실패 시 스크린샷이 자동 저장됩니다 (`screenshot: 'only-on-failure'`).
