# AssetTree

자산 선택 및 레이어 추가를 위한 전체 자산 트리 컴포넌트

## 개요

- **목적**: 자산 선택 → 이벤트 발행 (레이어 추가용)
- **구성**: Tree Only (Table 없음)
- **상호작용**: 드래그 앤 드롭

## AssetList와의 차이

| 항목 | AssetList | AssetTree |
|------|-----------|-----------|
| 용도 | 자산 모니터링/조회 | 자산 선택 → 레이어 추가 |
| 구성 | Tree + Table | Tree Only |
| Tree 표시 | 컨테이너만 | 모든 자산 |
| 선택 | 테이블 행 클릭 | 노드 드래그 |
| 출력 | 상세 조회 이벤트 | 드래그/드롭 이벤트 |

## 기능

### 트리 표시
- 모든 자산 표시 (컨테이너 + 단말)
- `canHaveChildren` 구분 없이 전체 트리 렌더링

### 검색
- 실시간 검색 필터링
- 매칭 노드 하이라이트
- 상위 경로 자동 펼침

### 드래그 앤 드롭
- 모든 노드 드래그 가능
- 단일 선택
- 컨테이너 선택 시 해당 자산만 (하위 포함 안 됨)

## 이벤트

### @assetDragStart
드래그 시작 시 발행

```javascript
{
  asset: {
    id: "rack-001",
    name: "Rack-A",
    type: "rack",
    canHaveChildren: true,
    parentId: "room-001"
  }
}
```

### @assetDropped
드롭 완료 시 발행

```javascript
{
  asset: { ... }
}
```

## 데이터 구독

```javascript
subscriptions: {
  'assetTree': ['renderTree']
}
```

## 파일 구조

```
AssetTree/
├── views/
│   └── component.html
├── styles/
│   └── component.css
├── scripts/
│   ├── register.js
│   └── beforeDestroy.js
├── preview.html
└── README.md
```

## 프리뷰

```bash
# 브라우저에서 직접 열기
preview.html
```

프리뷰에는 드롭 존이 포함되어 드래그 앤 드롭 테스트 가능

## API

### GET /api/assets/tree

전체 자산 트리 조회 (컨테이너 + 단말 모두 포함)

```json
{
  "data": {
    "items": [
      {
        "id": "building-001",
        "name": "본관",
        "type": "building",
        "canHaveChildren": true,
        "status": "normal",
        "children": [...]
      }
    ]
  }
}
```
