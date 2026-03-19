/*
 * CelltrionTempHumidity Component - beforeDestroy
 * 셀트리온 구역별 온습도 현황 카드
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

fx.go(
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
// ECHART CLEANUP
// ======================

if (this._chart) {
    this._chart.dispose();
    this._chart = null;
}

// ======================
// STATE CLEANUP
// ======================

this._data = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
