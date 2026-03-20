/*
 * UrbanTwinLocationCardList Component - beforeDestroy
 * UrbanTwin 위치 카드 리스트
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

this._locationsData = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
