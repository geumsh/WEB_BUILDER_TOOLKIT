/*
 * Page - before_load
 * ECO (Energy & Cooling Operations) Dashboard
 *
 * Responsibilities:
 * - Register event bus handlers
 * - Setup 3D raycasting
 *
 * 이벤트 핸들러:
 * - 3D 클릭: @assetClicked (모든 3D 팝업 컴포넌트 공통)
 * - AssetList: @hierarchyNodeSelected, @hierarchyChildrenRequested, @assetSelected, @refreshClicked
 * - i18n: @localeChanged
 */

const { onEventBusHandlers, initThreeRaycasting, withSelector, makeIterator, getInstanceById, getInstanceByName } = Wkit;

// ======================
// EVENT BUS HANDLERS
// ======================

this.eventBusHandlers = {
    // ─────────────────────────────────────────
    // 3D 클릭 이벤트 (3D 팝업 컴포넌트 공통)
    // ─────────────────────────────────────────

    '@assetClicked': ({ event, targetInstance }) => {
        console.log('[Page] Asset clicked:', targetInstance.name, targetInstance.id);
        targetInstance.showDetail();
    },

    // ─────────────────────────────────────────
    // AssetList 이벤트
    // ─────────────────────────────────────────

    '@assetSelected': ({ event, targetInstance }) => {
        console.log('[Page] @assetSelected:', { event, targetInstance });
    },

    '@assetNodeSelected': ({ event, targetInstance }) => {
        console.log('[Page] @assetNodeSelected:', { event, targetInstance });
    },
};

onEventBusHandlers(this.eventBusHandlers);

// ======================
// 3D RAYCASTING SETUP
// ======================

this.raycastingEvents = withSelector(this.appendElement, 'canvas', canvas =>
    fx.go(
        [{ type: 'click' }],
        fx.map(event => ({
            ...event,
            handler: initThreeRaycasting(canvas, event.type)
        }))
    )
);

console.log('[Page] before_load - ECO Dashboard event handlers & raycasting ready');
