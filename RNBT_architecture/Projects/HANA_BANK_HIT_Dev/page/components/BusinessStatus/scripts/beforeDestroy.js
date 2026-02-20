/*
 * Page - BusinessStatus Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// Unsubscribe from topics
fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

// Remove event bindings
removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// Null cleanup
this.renderData = null;

console.log('[BusinessStatus] destroy - cleanup completed');
