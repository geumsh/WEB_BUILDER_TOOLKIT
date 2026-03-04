/*
 * ViewButtons Component - beforeDestroy
 * 원형 아이콘 버튼 그룹 (범용)
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
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

const root = this.appendElement;
if (this._internalHandlers) {
    root.removeEventListener('click', this._internalHandlers.btnClick);
}
this._internalHandlers = null;

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
