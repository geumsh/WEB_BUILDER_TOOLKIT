/*
 * CelltrionLeftPanel Component - beforeDestroy
 * 셀트리온 좌측 사이드바
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
    const searchInput = root.querySelector('.cargo-search-input');
    if (searchInput) {
        searchInput.removeEventListener('input', this._internalHandlers.cargoSearch);
    }
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._locationData = null;
this._cargoData = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
