/*
 * EventBrowser Component - beforeDestroy
 * 이벤트 브라우저 클린업
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
    root.removeEventListener("click", this._internalHandlers.rowClick);
    root.removeEventListener("click", this._internalHandlers.filterClick);
    root.removeEventListener("click", this._internalHandlers.resetClick);
    root.removeEventListener("click", this._internalHandlers.deleteClick);
    root.removeEventListener("click", this._internalHandlers.collapseClick);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._selectedRowIndex = null;
this._eventsData = null;
this._columnsData = null;
this._collapsed = null;
this._activeFilters = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
this.selectRow = null;
