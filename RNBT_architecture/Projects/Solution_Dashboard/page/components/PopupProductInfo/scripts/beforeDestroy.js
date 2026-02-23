/*
 * PopupProductInfo Component - beforeDestroy
 */

const { unsubscribe } = GlobalDataPublisher;
const { each, go } = fx;

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

this.renderInfo = null;
