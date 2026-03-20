/*
 * UrbanTwinNavBar Component - beforeDestroy
 * UrbanTwin 네비게이션 바
 */

const { removeCustomEvents } = Wkit;

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
    const searchInput = root.querySelector('.search-input');
    if (searchInput) {
        searchInput.removeEventListener('keydown', this._internalHandlers.searchKeydown);
    }
}
this._internalHandlers = null;
