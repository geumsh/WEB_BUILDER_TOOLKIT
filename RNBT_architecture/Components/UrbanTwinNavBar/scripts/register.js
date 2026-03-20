/*
 * UrbanTwinNavBar Component - register
 * UrbanTwin 네비게이션 바 (검색 + 아이콘 버튼 + 텍스트 버튼)
 *
 * Events: @navBtnClicked, @searchSubmit
 */

const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._internalHandlers = {};

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {};

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
  click: {
    ".icon-btn": "@navBtnClicked",
    ".btn-advertise": "@navBtnClicked",
    ".btn-mypage": "@navBtnClicked",
  },
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
  const root = this.appendElement;

  // 검색 입력 핸들러
  this._internalHandlers.searchKeydown = (e) => {
    if (e.key === "Enter") {
      const keyword = e.target.value.trim();
      if (keyword) {
        Weventbus.emit("@searchSubmit", { keyword });
      }
    }
  };

  const searchInput = root.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      this._internalHandlers.searchKeydown,
    );
  }
}
