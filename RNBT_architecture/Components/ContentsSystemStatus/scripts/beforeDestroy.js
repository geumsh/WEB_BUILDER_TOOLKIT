/*
 * ContentsSystemStatus Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

this.renderData = null;

console.log('[ContentsSystemStatus] destroyed');
