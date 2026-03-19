/*
 * CelltrionEventLog Component - beforeDestroy
 * 셀트리온 자동화 창고 이벤트 현황 카드 패널
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

fx.go(
  Object.entries(this.subscriptions),
  each(([topic, _]) => unsubscribe(topic, this)),
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
  root.removeEventListener("click", this._internalHandlers.filterClick);
  root.removeEventListener("click", this._internalHandlers.toggleClick);

  const searchInput = root.querySelector(".search-input");
  if (searchInput) {
    searchInput.removeEventListener(
      "input",
      this._internalHandlers.searchInput,
    );
  }
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._eventsData = null;
this._activeFilter = null;
this._searchKeyword = null;
this._collapsed = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
