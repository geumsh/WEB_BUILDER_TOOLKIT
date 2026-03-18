/*
 * Header Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each, go } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions),
    each(([topic]) => unsubscribe(topic, this))
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

if (this._internalHandlers.menuClick) {
    this.appendElement.removeEventListener('click', this._internalHandlers.menuClick);
}

// ======================
// CLOCK CLEANUP
// ======================

if (this._clockInterval) {
    clearInterval(this._clockInterval);
}

// ======================
// STATE CLEANUP
// ======================

this._activeKey = null;
this._menusData = null;
this._clockInterval = null;
this._internalHandlers = null;
this.renderData = null;
this.setActiveMenu = null;
