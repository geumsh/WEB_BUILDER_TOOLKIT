/*
 * Popup Component - beforeDestroy
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

if (this._internalHandlers.closeClick) {
    this.appendElement.querySelector('.btn-close')
        ?.removeEventListener('click', this._internalHandlers.closeClick);
}

// ======================
// STATE CLEANUP
// ======================

this._internalHandlers = null;
this.renderData = null;
this.show = null;
this.hide = null;
