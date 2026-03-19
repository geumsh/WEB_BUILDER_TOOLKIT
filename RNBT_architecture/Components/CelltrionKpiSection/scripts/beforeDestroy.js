/*
 * CelltrionKpiSection Component - beforeDestroy
 * 셀트리온 자동화 창고 KPI 카드 섹션
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
// STATE CLEANUP
// ======================

this._cardsData = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
