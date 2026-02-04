/*
 * EventStatus Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

this.renderData = null;

console.log('[EventStatus] destroyed');
