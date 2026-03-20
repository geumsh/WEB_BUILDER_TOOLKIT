/*
 * UrbanTwinLocationPopup Component - beforeDestroy
 * UrbanTwin 위치 상세 팝업
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
// INTERNAL HANDLER CLEANUP
// ======================

const root = this.appendElement;
if (this._internalHandlers) {
    root.removeEventListener('click', this._internalHandlers.toggleClick);
}
this._internalHandlers = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
