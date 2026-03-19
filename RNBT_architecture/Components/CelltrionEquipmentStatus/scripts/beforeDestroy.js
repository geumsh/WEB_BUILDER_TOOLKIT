/*
 * CelltrionEquipmentStatus Component - beforeDestroy
 * 셀트리온 설비현황 카드
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

if (this._charts) {
    Object.values(this._charts).forEach(chart => {
        if (chart) chart.dispose();
    });
    this._charts = null;
}

// ======================
// STATE CLEANUP
// ======================

this._data = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
