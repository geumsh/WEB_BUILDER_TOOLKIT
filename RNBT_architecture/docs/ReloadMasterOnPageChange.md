# reload_master_on_page_change 설정 분석

## 분석 일자: 2026-02-26

## 핵심 결론

`reload_master_on_page_change = true` 일 때, **같은 마스터를 사용하는 페이지 간 전환에서도 마스터 레이어를 완전히 파괴하고 새로 생성**합니다.

"다른 마스터로 이동"하는 흐름과 완전히 동일한 경로를 타며, 마스터 컴포넌트 전체의 라이프사이클(beforeDestroy → destroy → register → completed)이 실행됩니다.

---

## 설정 위치

**파일**: `packages/static/files/custom/config/config.json`

```json
{
  "viewer": {
    "reload_master_on_page_change": true
  }
}
```

**읽기**: `ConfigManager.ts:643-648`

```typescript
get reloadMasterOnPageChange() {
  if (this._configInfo.viewer &&
      this._configInfo.viewer.hasOwnProperty('reload_master_on_page_change')) {
    return this._configInfo.viewer.reload_master_on_page_change;
  }
  return false;  // 기본값: 마스터 유지 (성능 최적화)
}
```

---

## 동작 비교

| 설정값 | 같은 마스터 여부 | useSameMaster | 마스터 파괴/재생성 | beforeDestroy 실행 |
|--------|----------------|---------------|-------------------|-------------------|
| `true` | 같음 | `false` (강제) | O | O |
| `false` (기본) | 같음 | `true` | X (유지) | X |
| `false` (기본) | 다름 | `false` | O | O |

---

## 설계 의도

같은 마스터라도 전체 라이프사이클을 돌리는 이유:

1. **일관성**: "다른 마스터로 이동"과 "같은 마스터에서 재로드"가 동일한 코드 경로를 탐. 별도의 "부분 갱신" 경로를 만들면 두 경로 사이에서 미묘한 차이나 버그 발생 가능
2. **정합성**: register에서 등록한 이벤트 리스너나 초기화 로직이 매 페이지 전환마다 정확히 destroy → register 쌍으로 실행됨. destroy 없이 register만 재실행하면 이벤트 리스너 중복 등록 문제 발생
3. **단순성**: 하나의 코드 경로(전부 파괴 → 전부 생성)로 통일되어 유지보수가 간결함

---

## 실행 흐름 상세

### 1단계: useSameMaster 결정

**파일**: `OpenPageCommand.ts:142-148`

```typescript
if (beforePageInfo) {
  if (window.wemb.configManager.reloadMasterOnPageChange) {
    this.useSameMaster = false;  // 같은 마스터라도 강제로 false
  } else {
    this.useSameMaster = beforePageInfo.master === pageData.page_info.master;
  }
}
```

### 2단계: 기존 페이지 언로드 이벤트

**파일**: `OpenPageCommand.ts:157-162`

```
dispatchBeforeUnLoadScriptEvent({ skipMasterPageScript: false })
  → 마스터 페이지 스크립트의 BEFORE_UNLOAD 실행됨 (스킵 안함)
```

### 3단계: 마스터 레이어 파괴

```
OpenPageCommand.ts:179  viewerProxy.closedPage(false)
  → ViewerProxy.ts:139       sendNotification(NOTI_CLOSED_PAGE, false)
    → ViewerAreaMainContainerMediator.ts:35  this.view.noti_closedPage(false)
      → ViewerAreaMainContainer.vue:125     this._mainPageComponent.clearPage(false)
```

**핵심 분기**: `PageComponentCore.ts:220-241`

```typescript
clearPage(useSameMaster = false) {
  this._clearLayerListMap.forEach((layerInstance) => {
    if (useSameMaster) {
      if (layerInstance.name !== '_masterLayer') {
        layerInstance.clear();   // masterLayer 스킵
      }
    } else {
      layerInstance.clear();     // ★ masterLayer 포함 전부 clear
    }
  });

  if (useSameMaster) {
    // masterLayer 컴포넌트만 남김
    this._comInstanceList = this._comInstanceList.filter(
      inst => inst.layerName === 'masterLayer'
    );
  } else {
    this._comInstanceList = [];  // ★ 전부 제거
  }
}
```

### 4단계: 컴포넌트별 destroy 호출 경로

```
layerInstance.clear()                          // TwoLayerCore.ts:28
  → removeChildAll()                           // WVDisplayObjectContainer.ts:226
    → removeChildAt(0) 반복                    // WVDisplayObjectContainer.ts:213
      → comInstance.destroy()                  // 각 마스터 컴포넌트마다

destroy()                                      // WVDisplayObject.ts:514
  → _beforeDestroy()                           // WVComponent.ts:590
    → dispatchEvent(BEFORE_DESTROY)            // ★ beforeDestroy WScript 실행
    → _onViewerDestroy()
  → _onDestroy()
    → dispatchEvent(DESTROY)                   // ★ destroy WScript 실행
```

### 5단계: 마스터 레이어 재생성

**파일**: `OpenPageCommand.ts:255-260`

```typescript
if (!this.useSameMaster && pageData.page_info.type !== 'master') {
  // 마스터 레이어 컴포넌트 정보를 생성 목록에 추가
  this.publicProxy.setComInstanceInfoListInMasterLayer(pageData.content_info.master_layer);
  comInstanceInfoList = comInstanceInfoList.concat(
    this.publicProxy.getComInstanceInfoListInMasterLayer()
  );
}
```

### 6단계: 마스터 컴포넌트 라이프사이클 재실행

**파일**: `OpenPageCommand.ts:536-549`

```typescript
viewerProxy.comInstanceList.forEach((instance: WVComponent) => {
  // useSameMaster=false이므로 마스터 컴포넌트도 스킵하지 않음
  if (instance.layerName == WORK_LAYERS.MASTER_LAYER)
    if (this.useSameMaster) return;  // ← 여기서 걸리지 않음

  instance._onViewerCompleted();                          // 뷰어 라이프사이클
  instance[WVCOMPONENT_METHOD_INFO.ON_LAOAD_PAGE]();      // onLoadPage
  instance.dispatchWScriptEvent(WVComponentScriptEvent.COMPLETED);  // completed WScript
});
```

---

## 전체 타임라인

```
reload_master_on_page_change = true, 같은 마스터 간 전환 시:

┌─────────────────────────────────────────────────────────────────┐
│ [기존 페이지 종료]                                                │
│                                                                  │
│   ① beforeUnLoad 실행 (마스터 페이지 스크립트 포함)                 │
│   ② 마스터 레이어 포함 전체 clear                                  │
│     → 마스터 컴포넌트 beforeDestroy WScript 실행                   │
│     → 마스터 컴포넌트 destroy WScript 실행                         │
│     → DOM 제거, 이벤트 해제, 참조 정리                              │
│   ③ unLoaded 실행 (마스터 페이지 스크립트 포함)                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [새 페이지 생성]                                                  │
│                                                                  │
│   ④ beforeLoad 실행 (마스터 페이지 스크립트 포함)                   │
│   ⑤ 마스터 컴포넌트 인스턴스 새로 생성 (DOM, 이벤트 등)              │
│   ⑥ 일반 레이어 컴포넌트 인스턴스 생성                              │
│   ⑦ 마스터 + 일반 컴포넌트 register WScript 실행                   │
│   ⑧ ready 실행 (마스터 페이지 스크립트 포함)                        │
│   ⑨ 리소스(이미지, 3D 모델) 로딩                                   │
│   ⑩ 마스터 + 일반 컴포넌트 completed WScript 실행                  │
│   ⑪ loaded 실행 (마스터 페이지 스크립트 포함)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 참조 파일

| 파일 | 라인 | 역할 |
|------|------|------|
| `static/files/custom/config/config.json` | 20 | 설정값 |
| `common/src/wemb/wv/managers/ConfigManager.ts` | 643-648 | 설정값 읽기 |
| `viewer/src/viewer/controller/viewer/OpenPageCommand.ts` | 144-145 | useSameMaster 강제 false |
| `common/src/wemb/wv/components/page/PageComponentCore.ts` | 220-241 | clearPage 분기 (마스터 포함 여부) |
| `common/src/wemb/wv/layer/TwoLayerCore.ts` | 28-32 | 레이어 clear → removeChildAll |
| `common/src/wemb/core/display/WVDisplayObjectContainer.ts` | 211-237 | removeChildAt → destroy 호출 |
| `common/src/wemb/core/component/WVComponent.ts` | 590-594 | beforeDestroy WScript dispatch |
| `common/src/wemb/core/display/WVDisplayObject.ts` | 514-516 | destroy 진입점 |

---

*관련 문서: [PageScript_ExecutionTiming.md](PageScript_ExecutionTiming.md), [MasterPageScript.md](MasterPageScript.md)*
