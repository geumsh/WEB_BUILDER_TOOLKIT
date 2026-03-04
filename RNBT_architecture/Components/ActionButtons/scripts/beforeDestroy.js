/*
 * ActionButtons Component - beforeDestroy
 * 텍스트 버튼 그룹 (범용 - N개 버튼 지원)
 */

const { removeCustomEvents } = Wkit;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic]) => GlobalDataPublisher.unsubscribe(topic, this))
);

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

if (this._internalHandlers.btnClick) {
    this.appendElement.removeEventListener('click', this._internalHandlers.btnClick);
}

// ======================
// STATE CLEANUP
// ======================

this._activeKey = null;
this._buttonsData = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
this.setActive = null;
this._internalHandlers = null;
