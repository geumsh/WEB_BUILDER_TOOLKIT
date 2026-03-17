/*
 * Chart1 Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each, go } = fx;

// ======================
// RESIZE OBSERVER CLEANUP
// ======================

if (this.resizeObserver) {
    this.resizeObserver.disconnect();
    this.resizeObserver = null;
}

// ======================
// ECHARTS CLEANUP
// ======================

if (this.chartInstance) {
    this.chartInstance.dispose();
    this.chartInstance = null;
}

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

if (this._internalHandlers.tabClick) {
    this.appendElement.removeEventListener('click', this._internalHandlers.tabClick);
}

// ======================
// STATE CLEANUP
// ======================

this._activeTab = null;
this._internalHandlers = null;
this.renderData = null;
