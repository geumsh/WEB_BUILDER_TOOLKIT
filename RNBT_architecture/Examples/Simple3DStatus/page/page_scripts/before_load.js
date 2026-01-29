/**
 * Page - before_load.js (3D)
 *
 * 호출 시점: 페이지 진입 직후, Page 컴포넌트들이 초기화되기 전
 *
 * 책임:
 * - Page 레벨 이벤트 버스 핸들러 등록
 * - 3D Raycasting 초기화
 */

const { onEventBusHandlers, initThreeRaycasting, fetchData, withSelector } = Wkit;

// ======================
// EVENT BUS HANDLERS (3D 포함)
// ======================

this.pageEventBusHandlers = {
    /**
     * 3D 객체 클릭 이벤트 핸들러
     *
     * bind3DEvents에서 발행한 이벤트를 처리
     * intersects 배열에서 클릭된 객체 정보 추출
     */
    '@3dObjectClicked': async ({ event: { intersects }, targetInstance: { datasetInfo, meshStatusConfig } }) => {
        go(
            intersects,
            fx.L.filter(intersect => fx.find(c => c.meshName === intersect.object.name, meshStatusConfig)),
            fx.take(1),
            fx.each(target => fx.go(
                datasetInfo,
                fx.L.map((info) => ({ datasetName: info.datasetName, param: info.getParam(target.object, meshStatusConfig) })),
                fx.L.filter(({ param }) => param),
                fx.L.map(({ datasetName, param }) => Wkit.fetchData(this, datasetName, param).catch((err) => (console.warn(err), { response: { data: {} } }))),
                fx.each(({ response: { data } }) => showAlert(
                    `Data ID : ${data.id}, Label : ${data.label}, Status: ${data.status}, Color: ${data.color}`))
            ))
        )

    }
};

onEventBusHandlers(this.pageEventBusHandlers);

// ======================
// 3D RAYCASTING SETUP
// ======================

/**
 * 3D Raycasting 초기화
 *
 * canvas 요소에 click 이벤트 리스너를 등록하여
 * 3D 공간에서의 클릭을 감지
 */
this.raycastingEvents = withSelector(this.appendElement, 'canvas', canvas =>
    fx.go(
        [
            { type: 'click' }
            // { type: 'mousemove' },  // hover 필요시 활성화
            // { type: 'dblclick' }    // 더블클릭 필요시 활성화
        ],
        fx.map(event => ({
            ...event,
            handler: initThreeRaycasting(canvas, event.type)
        }))
    )
);

console.log('[Page] before_load - 3D event handlers and raycasting initialized');

// ======================
// SWEETALERT2 HELPERS
// ======================

async function loadSweetAlert() {
    if (window.Swal) return;

    await loadCSS('https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js');
}

async function showAlert(message) {
    await loadSweetAlert();
    Swal.fire(message);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadCSS(href) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
    });
}
