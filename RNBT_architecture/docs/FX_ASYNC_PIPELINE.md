# fx 비동기 파이프라인 — 왜 Array 체인으로는 안 되는가

## 실제 코드 — 3D 객체 클릭 핸들러

> 출처: `Examples/Simple3DStatus/page/page_scripts/before_load.js`

```javascript
'@3dObjectClicked': async ({ event: { intersects }, targetInstance: { datasetInfo, meshStatusConfig } }) => {
    go(
        intersects,
        fx.L.filter(intersect => fx.find(c => c.meshName === intersect.object.name, meshStatusConfig)),
        fx.take(1),
        fx.each(target => fx.go(
            datasetInfo,
            fx.L.map(info => ({
                datasetName: info.datasetName,
                param: info.getParam(target.object, meshStatusConfig)
            })),
            fx.L.filter(({ param }) => param),
            fx.L.map(({ datasetName, param }) =>
                Wkit.fetchData(this, datasetName, param)
                    .catch(err => (console.warn(err), { response: { data: {} } }))
            ),
            fx.each(({ response: { data } }) => showAlert(
                `Data ID : ${data.id}, Label : ${data.label}, Status: ${data.status}, Color: ${data.color}`
            ))
        ))
    )
}
```

이 파이프라인의 핵심은 **`L.map`에서 Promise를 반환하고, fx가 이를 자동으로 resolve하여 다음 `each`에 실제 값을 전달**한다는 점이다.

`fetchData`의 결과가 파이프라인 밖으로 빠지지 않고 다음 단계(`each`)로 흘러가므로, 이후에 추가 가공(필터, 변환 등)을 자유롭게 체이닝할 수 있다.

---

## 같은 로직을 Array 체인으로 작성하면?

```javascript
datasetInfo
    .map(info => ({
        datasetName: info.datasetName,
        param: info.getParam(target.object, meshStatusConfig)
    }))
    .filter(({ param }) => param)
    .map(({ datasetName, param }) =>
        Wkit.fetchData(this, datasetName, param)  // ← Promise 반환
    )
    .forEach(result => {
        // result는 Promise 객체 자체!
        // result.response.data → undefined
        console.log(result);  // Promise { <pending> }
    });
```

### 문제

| | Array 체인 | fx 파이프라인 |
|---|---|---|
| `.map()`이 Promise를 반환하면 | `Promise[]` 배열이 됨 | 자동으로 resolve 후 다음 단계로 전달 |
| `.forEach()`가 받는 값 | `Promise` 객체 | resolve된 실제 값 |
| 비동기 에러 처리 | `.catch()` 연결 불가 | 파이프라인 내에서 처리 가능 |

`Array.prototype.map`과 `forEach`는 콜백의 반환값이 Promise인지 전혀 신경쓰지 않는다.

---

## Array 체인으로 비동기를 처리하려면

```javascript
// 방법 1: for...of + await
const items = datasetInfo
    .map(info => ({
        datasetName: info.datasetName,
        param: info.getParam(target.object, meshStatusConfig)
    }))
    .filter(({ param }) => param);

for (const { datasetName, param } of items) {
    const result = await Wkit.fetchData(this, datasetName, param);
    console.log(result);
}

// 방법 2: Promise.all
const results = await Promise.all(
    datasetInfo
        .map(info => ({
            datasetName: info.datasetName,
            param: info.getParam(target.object, meshStatusConfig)
        }))
        .filter(({ param }) => param)
        .map(({ datasetName, param }) =>
            Wkit.fetchData(this, datasetName, param)
        )
);
results.forEach(result => console.log(result));
```

동작은 하지만, **파이프라인이 끊기거나 구조가 달라진다.**

---

## fx 파이프라인의 비동기 처리 원리

fx의 `go`, `each`, `map`, `reduce` 등은 내부적으로 값이 Promise인지 확인한다:

```
값 → 함수 적용 → 결과가 Promise?
                    ├─ Yes → .then()으로 다음 함수 연결
                    └─ No  → 즉시 다음 함수 적용
```

덕분에 동기/비동기 코드의 구조가 동일하게 유지된다:

```javascript
// 동기 — 배열 처리
fx.go(
    [1, 2, 3],
    fx.map(n => n * 2),
    fx.filter(n => n > 2),
    fx.each(console.log)
);

// 비동기 — fetch 포함, 구조 동일
fx.go(
    [1, 2, 3],
    fx.map(id => fetch(`/api/${id}`)),  // Promise 반환
    fx.each(res => console.log(res))    // resolve된 값을 받음
);
```

---

## 요약

- **동기 작업만 있으면** `Array.prototype` 체인으로 충분하다
- **비동기가 파이프라인 중간에 끼는 순간** Array 체인은 깨진다
- fx 파이프라인은 Promise를 자동으로 resolve하여 동기/비동기 구분 없이 같은 코드 구조를 유지한다
- 이것이 함수형 파이프라인 라이브러리를 사용하는 실질적인 이유 중 하나다

---

## 관련 문서

- [FX_API.md](FX_API.md) — fx 함수 레퍼런스
- [WKIT_API.md](WKIT_API.md) — `Wkit.fetchData` 등 API
