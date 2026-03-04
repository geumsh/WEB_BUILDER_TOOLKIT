/*
 * EventLog Component - beforeDestroy
 * 하단 이벤트 로그 패널 (테이블 형태)
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
    root.removeEventListener('click', this._internalHandlers.expandClick);
    root.removeEventListener('click', this._internalHandlers.toggleClick);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._selectedRowIndex = null;
this._eventsData = null;
this._collapsed = null;
this._autoEnabled = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
this.selectRow = null;
