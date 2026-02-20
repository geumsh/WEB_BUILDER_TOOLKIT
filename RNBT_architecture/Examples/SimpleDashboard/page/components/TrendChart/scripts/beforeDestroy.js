/**
 * Page - TrendChart Component - beforeDestroy.js
 *
 * 호출 시점: 컴포넌트 제거 직전
 *
 * 책임:
 * - ECharts 인스턴스 정리
 * - ResizeObserver 해제
 * - 구독 해제
 * - 이벤트 핸들러 해제
 * - 참조 정리
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;

// ======================
// CLEANUP
// ======================

if (this.resizeObserver) {
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
}

if (this.chartInstance) {
    this.chartInstance.dispose();
    this.chartInstance = null;
}

if (this.subscriptions) {
    fx.go(
        Object.entries(this.subscriptions),
        fx.each(([topic, _]) => unsubscribe(topic, this))
    );
    this.subscriptions = null;
}

if (this.customEvents) {
    removeCustomEvents(this, this.customEvents);
    this.customEvents = null;
}

this.renderChart = null;

console.log('[TrendChart] Destroyed');
