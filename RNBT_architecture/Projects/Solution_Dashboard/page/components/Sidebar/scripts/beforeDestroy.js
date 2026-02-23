/*
 * Sidebar Component - beforeDestroy
 */

const { removeCustomEvents } = Wkit;
const { unsubscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

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

this.renderTree = null;
