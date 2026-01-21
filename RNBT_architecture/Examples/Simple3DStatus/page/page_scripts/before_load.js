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

this.eventBusHandlers = Object.assign(this.eventBusHandlers || {}, {
    /**
     * 3D 객체 클릭 이벤트 핸들러
     *
     * bind3DEvents에서 발행한 이벤트를 처리
     * intersects 배열에서 클릭된 객체 정보 추출
     */
    '@3dObjectClicked': async ({ event, targetInstance }) => {
        const intersects = event.intersects;
        if (!intersects || intersects.length === 0) {
            console.log('[Page] 3D click - no intersection');
            return;
        }

        const clickedObject = intersects[0].object;
        console.log('[Page] 3D object clicked:', clickedObject.name);

        // datasetInfo가 있으면 상세 데이터 fetch
        const { datasetInfo } = targetInstance;
        if (datasetInfo?.length) {
            for (const { datasetName, getParam } of datasetInfo) {
                const param = getParam ? getParam(clickedObject) : null;
                if (!param) continue;

                try {
                    const data = await fetchData(this, datasetName, param);
                    console.log('[Page] Equipment detail:', data);
                    // 확장 포인트: 상세 정보 팝업 표시 등
                } catch (err) {
                    console.error(`[Page] fetchData(${datasetName}) failed:`, err);
                }
            }
        }
    }
});

onEventBusHandlers(this.eventBusHandlers);

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
