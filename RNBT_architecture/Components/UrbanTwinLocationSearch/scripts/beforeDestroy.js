/*
 * UrbanTwinLocationSearch Component - beforeDestroy
 * UrbanTwin 위치 검색 패널
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
    root.removeEventListener('click', this._internalHandlers.tagClick);

    const searchInput = root.querySelector('.search-input');
    if (searchInput) {
        searchInput.removeEventListener('keydown', this._internalHandlers.searchKeydown);
    }
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._activeFilter = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
