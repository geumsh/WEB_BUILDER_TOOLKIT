/*
 * Page - before_unload
 * ECO (Energy & Cooling Operations) Dashboard
 *
 * Responsibilities:
 * - Clear GlobalDataPublisher mappings
 * - Stop refresh intervals
 * - Clear event bus handlers
 * - Clear 3D raycasting
 * - Dispose all 3D resources
 */

const { offEventBusHandlers, disposeAllThreeResources, withSelector } = Wkit;
const { go, each } = fx;

onPageUnLoad.call(this);

function onPageUnLoad() {
    clearGlobalDataPublisher.call(this);
    clearIntervals.call(this);
    clearEventBus.call(this);
    clearRaycasting.call(this);
    clearThreeResources.call(this);
}

// ======================
// GLOBAL DATA PUBLISHER CLEANUP
// ======================

function clearGlobalDataPublisher() {
    if (this.pageDataMappings) {
        go(
            this.pageDataMappings,
            each(({ topic }) => GlobalDataPublisher.unregisterMapping(topic))
        );
        this.pageDataMappings = null;
    }
    this.pageParams = null;
}

// ======================
// INTERVAL CLEANUP
// ======================

function clearIntervals() {
    if (this.stopAllIntervals) {
        this.stopAllIntervals();
    }
    this.pageIntervals = null;
}

// ======================
// EVENT BUS CLEANUP
// ======================

function clearEventBus() {
    offEventBusHandlers.call(this, this.pageEventBusHandlers);
    this.pageEventBusHandlers = null;
}

// ======================
// 3D RAYCASTING CLEANUP
// ======================

function clearRaycasting() {
    withSelector(this.appendElement, 'canvas', canvas => {
        // mousedown 핸들러 정리 (드래그 감지용)
        if (this.onCanvasMouseDown) {
            canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
            this.onCanvasMouseDown = null;
        }

        // raycasting 핸들러 정리
        if (this.raycastingEvents) {
            go(
                this.raycastingEvents,
                each(({ type, handler }) => canvas.removeEventListener(type, handler))
            );
            this.raycastingEvents = null;
        }
    });
}

// ======================
// 3D RESOURCES CLEANUP
// ======================

function clearThreeResources() {
    // 모든 3D 컴포넌트 일괄 정리:
    // - subscriptions 해제
    // - customEvents, datasetInfo 참조 제거
    // - geometry, material, texture dispose
    // - Scene background 정리
    disposeAllThreeResources(this);
}

console.log('[Page] before_unload - ECO Dashboard cleanup completed (GlobalDataPublisher, intervals, events, 3D resources)');
