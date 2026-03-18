/*
 * DataPlatform Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
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
// STATE CLEANUP
// ======================

this._instancesData = null;
this.renderData = null;
