# 모바일 이벤트 대응: Raycasting 좌표 변환

3D Raycasting의 마우스 좌표 → NDC 변환을 모바일 터치 이벤트에서도 동작하도록 업데이트하는 가이드.

---

## 1. 현재 구현

`makeRaycastingFn()` (Wkit.js:256-277)

```javascript
function makeRaycastingFn(rootElement, raycaster, mouse, scene, camera) {
  return function (event) {
    mouse.x = (event.offsetX / rootElement.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / rootElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // ...
  };
}
```

**데스크톱 환경에서는 정상 동작한다.** `event.offsetX/offsetY`는 이벤트 대상 요소 기준의 상대 좌표이며, `rootElement`가 canvas인 경우 자식 요소가 없으므로 항상 정확하다.

---

## 2. 모바일 환경의 문제점

### 2.1 `offsetX/offsetY` 미존재

터치 이벤트 객체에는 `offsetX`가 없다.

```javascript
// 마우스 이벤트
event.offsetX   // ✅ 존재
event.clientX   // ✅ 존재

// 터치 이벤트
event.offsetX          // ❌ undefined
event.clientX          // ❌ undefined
event.touches[0].clientX   // ✅ 여기에 있음
```

### 2.2 좌표 위치가 다름

| 속성 | 마우스 이벤트 | 터치 이벤트 |
|------|-------------|------------|
| `event.clientX` | ✅ | ❌ |
| `event.offsetX` | ✅ | ❌ |
| `event.touches[0].clientX` | ❌ | ✅ |
| `event.touches[0].offsetX` | ❌ | ❌ (비표준) |

### 2.3 `offsetX`의 근본적 한계

`offsetX`는 **이벤트 리스너를 등록한 요소**가 아니라 **실제 클릭된 요소(`event.target`)** 기준이다. `rootElement` 내부에 자식 DOM이 있으면 좌표가 틀어질 수 있다. (canvas에는 해당 없으나, div 컨테이너 사용 시 문제 발생)

---

## 3. 권장 수정 방안

### 3.1 `getBoundingClientRect()` + `clientX` 방식

마우스와 터치 이벤트 **모두** `clientX/clientY`를 제공한다 (터치는 `touches[0]`에). `getBoundingClientRect()`로 요소 위치를 빼면 어떤 환경에서든 정확한 상대 좌표를 얻을 수 있다.

### 3.2 Before / After

**Before (현재):**

```javascript
function makeRaycastingFn(rootElement, raycaster, mouse, scene, camera) {
  return function (event) {
    mouse.x = (event.offsetX / rootElement.clientWidth) * 2 - 1;
    mouse.y = -(event.offsetY / rootElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    // ... 이하 동일
  };
}
```

**After (모바일 대응):**

```javascript
function makeRaycastingFn(rootElement, raycaster, mouse, scene, camera) {
  return function (event) {
    const rect = rootElement.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches[0].clientX;
    const clientY = event.clientY ?? event.touches[0].clientY;

    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    // ... 이하 동일
  };
}
```

### 3.3 변경 포인트 요약

| 항목 | Before | After |
|------|--------|-------|
| 좌표 소스 | `event.offsetX` | `event.clientX ?? event.touches[0].clientX` |
| 기준점 보정 | 불필요 (offsetX가 상대좌표) | `clientX - rect.left` |
| 크기 기준 | `rootElement.clientWidth` | `rect.width` |
| 마우스 대응 | ✅ | ✅ |
| 터치 대응 | ❌ | ✅ |
| 자식 요소 안전 | ❌ (target 기준) | ✅ (항상 rootElement 기준) |

### 3.4 `changedTouches` 고려

`touchend` 이벤트에서는 `event.touches`가 빈 배열이다. 터치 종료 시점의 좌표가 필요하면 `changedTouches`를 사용해야 한다.

```javascript
const touch = event.touches?.[0] ?? event.changedTouches?.[0];
const clientX = event.clientX ?? touch?.clientX;
const clientY = event.clientY ?? touch?.clientY;
```

---

## 4. 영향 범위

### 수정 대상

| 함수 | 파일 | 위치 | 이유 |
|------|------|------|------|
| `makeRaycastingFn()` | `Utils/Wkit.js` | 256-277행 | `offsetX/offsetY` 사용 |

### 수정 불필요

| 함수 | 이유 |
|------|------|
| `makeHandler()` | 좌표 변환 미사용 (이벤트 타입과 셀렉터만 참조) |
| `make3DHandler()` | 좌표 변환 미사용 (Weventbus emit만 수행) |
| `delegate()` | 좌표 변환 미사용 (`event.target.closest` 사용) |

### 이벤트 리스너 등록 (`initThreeRaycasting`)

`initThreeRaycasting(target, eventName)`은 외부에서 `eventName`을 전달받으므로, 호출부에서 터치 이벤트 이름(`touchstart`, `touchmove` 등)을 전달하면 별도 수정 없이 동작한다. 단, 좌표 변환이 수정되어야 터치 좌표가 올바르게 처리된다.

---

## 관련 문서

- [WKIT_API.md](/RNBT_architecture/docs/WKIT_API.md) - Wkit 전체 API
- [EVENT_HANDLING.md](/RNBT_architecture/docs/EVENT_HANDLING.md) - 이벤트 처리 원칙
- [3D_Hover_Feature.md](/RNBT_architecture/docs/3D_Hover_Feature.md) - 3D 호버 기능
