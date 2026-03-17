/*
 * FrameHeader Component - beforeDestroy
 * 글로벌 네비게이션 헤더
 */

const { removeCustomEvents } = Wkit;
const { each, go } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

go(
    Object.entries(this.subscriptions),
    each(([topic]) => GlobalDataPublisher.unsubscribe(topic, this))
);

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

if (this._internalHandlers.gnbClick) {
    this.appendElement.removeEventListener('click', this._internalHandlers.gnbClick);
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

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
this.setActiveMenu = null;
this.subscriptions = null;
this.customEvents = null;
