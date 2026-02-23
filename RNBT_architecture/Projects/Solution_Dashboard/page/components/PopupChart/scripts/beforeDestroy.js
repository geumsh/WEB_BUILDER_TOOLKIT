/*
 * PopupChart Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each, go } = fx;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

this.appendElement.removeEventListener('@tabChanged', this.switchTab);
this.switchTab = null;
this.bindEventHandlers = null;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions || {}),
    each(([topic, fnList]) =>
        each(fn => this[fn] && unsubscribe(topic, this, this[fn]), fnList)
    )
);
this.subscriptions = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderChart = null;
