/*
 * CelltrionHeader Component - beforeDestroy
 * 셀트리온 자동화 창고 헤더
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
    root.removeEventListener('click', this._internalHandlers.navClick);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._activeNavIndex = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
