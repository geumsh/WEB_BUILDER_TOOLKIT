/*
 * Page - CpuStatus Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// Dispose all ECharts instances
this.charts.forEach(chart => chart?.dispose());

// Unsubscribe from topics
fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

// Remove event bindings
removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// Null cleanup
this.renderData = null;
this.charts = null;

console.log('[CpuStatus] destroy - cleanup completed');
