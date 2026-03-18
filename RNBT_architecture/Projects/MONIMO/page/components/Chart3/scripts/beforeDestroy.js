/*
 * Chart3 Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions),
    each(([topic]) => unsubscribe(topic, this))
);
this.subscriptions = null;

// ======================
// ECHART CLEANUP
// ======================

if (this._chart) {
    this._chart.dispose();
}

// ======================
// STATE CLEANUP
// ======================

this._chart = null;
this._chartData = null;
this.renderData = null;
