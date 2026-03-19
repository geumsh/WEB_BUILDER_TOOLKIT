/*
 * CelltrionEquipmentSearch Component - beforeDestroy
 * 셀트리온 설비 검색 리스트 패널
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
    root.removeEventListener('click', this._internalHandlers.rowClick);

    const searchInput = root.querySelector('.eqs-search-input');
    if (searchInput) {
        searchInput.removeEventListener('input', this._internalHandlers.searchInput);
    }
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._data = null;
this._selectedIndex = null;
this._searchKeyword = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
