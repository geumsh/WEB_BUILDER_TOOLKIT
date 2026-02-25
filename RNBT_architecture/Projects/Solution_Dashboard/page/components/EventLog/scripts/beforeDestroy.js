/*
 * EventLog Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each, go } = fx;

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

const tableBody = this.appendElement.querySelector('.table-body');
if (tableBody && this._internalHandlers?.handleRowClick) {
    tableBody.removeEventListener('click', this._internalHandlers.handleRowClick);
}

const btnExpand = this.appendElement.querySelector('.btn-expand');
if (btnExpand && this._internalHandlers?.handleExpandToggle) {
    btnExpand.removeEventListener('click', this._internalHandlers.handleExpandToggle);
}

this._internalHandlers = null;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions || {}),
    each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderEventLog = null;

// ======================
// STATE CLEANUP
// ======================

this._selectedRowIndex = null;
this._isCollapsed = null;
