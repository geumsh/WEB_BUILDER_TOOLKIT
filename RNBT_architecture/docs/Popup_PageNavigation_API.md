# 팝업 및 페이지 이동 API

뷰어 런타임에서 사용할 수 있는 팝업과 페이지 이동 API입니다.

---

## 팝업 (Popup)

현재 페이지 위에 다른 페이지를 오버레이로 표시합니다.

### 팝업 열기

```javascript
wemb.popupManager.open(pageName, options);
```

```javascript
// 예시
wemb.popupManager.open('myPopupPage', {
  width: 400,
  height: 300,
  title: '알림',
  params: { userId: 123 }
});
```

### 팝업 닫기

```javascript
wemb.popupManager.closed(pageName);  // 특정 팝업 닫기
wemb.popupManager.clear();           // 모든 팝업 닫기

// 팝업 내부에서 자신을 닫기
wemb.popupManager.closed(this.name);
```

### 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `width` | string \| number | 페이지 너비의 1/2 | 팝업 너비 |
| `height` | string \| number | 페이지 높이의 1/2 | 팝업 높이 |
| `x` | string \| number | 중앙 | X 위치 (좌측 기준) |
| `y` | string \| number | 중앙 | Y 위치 (상단 기준) |
| `title` | string | 페이지명 | 헤더 타이틀 |
| `params` | object | - | 팝업에 전달할 데이터 |

**크기/위치 단위:**
- 숫자: px로 처리 (`400` → 400px)
- 문자열: 그대로 적용 (`'50%'`, `'400px'`)
- `%` 값은 현재 페이지 크기 기준

```javascript
// 예시: 페이지 중앙에서 약간 위쪽에 400x300 팝업
wemb.popupManager.open('alert', {
  width: 400,
  height: 300,
  x: '50%',   // 페이지 가로 중앙
  y: 100      // 상단에서 100px
});
```

### 파라미터 접근

팝업 페이지의 `beforeLoad`, `loaded` 이벤트에서:

```javascript
console.log(this.params);  // { userId: 123 }
```

---

## 페이지 이동 (Navigate)

### 페이지 이동

```javascript
wemb.pageManager.openPageByName(pageName, params);
```

```javascript
// 예시
wemb.pageManager.openPageByName('dashboard', { filter: 'active' });
```

### 파라미터 접근

이동한 페이지의 `beforeLoad`, `loaded` 이벤트에서:

```javascript
console.log(this.params);  // { filter: 'active' }
```

---

*최종 업데이트: 2025-01-28*
