/*
 * FrameHeader Component - register
 * 글로벌 네비게이션 헤더 (로고, GNB, 시계, 액션 버튼)
 *
 * Subscribes to: TBD_headerData
 * Events: @gnbClicked, @headerActionClicked
 *
 * Expected Data Structure:
 * {
 *   menus: [
 *     { key: "overview", label: "종합현황" },
 *     { key: "executive", label: "임원현황" },
 *     ...
 *   ],
 *   activeKey: "system"
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
  menusKey: "TBD_menus",
  activeKeyKey: "TBD_activeKey",
  menuFields: {
    key: "key",
    label: "label",
  },
  iconSrc: "./assets/e1871278b22da1080d53be256d6678d09a0ec9c9.svg",
};

// ======================
// STATE
// ======================

this._activeKey = null;
this._menusData = null;
this._clockInterval = null;
this._internalHandlers = {};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this.setActiveMenu = setActiveMenu.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
  TBD_headerData: ["renderData"],
};

go(
  Object.entries(this.subscriptions),
  each(([topic, fnList]) =>
    each((fn) => this[fn] && subscribe(topic, this, this[fn]), fnList),
  ),
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
  click: {
    ".btn-gnb": "@gnbClicked",
    ".action-btn": "@headerActionClicked",
  },
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);
startClock.call(this);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
  const { data } = response;
  if (!data) return;

  const menus = data[config.menusKey];
  const activeKey = data[config.activeKeyKey];

  if (activeKey !== undefined) {
    this._activeKey = activeKey;
  }

  if (menus && Array.isArray(menus)) {
    this._menusData = menus;
    renderMenus.call(this, config, menus);
  }
}

function renderMenus(config, menus) {
  const { menuFields } = config;
  const gnb = this.appendElement.querySelector(".gnb");
  if (!gnb) return;
  gnb.innerHTML = "";

  go(
    menus,
    each((menu) => {
      const key = menu[menuFields.key] || "";
      const label = menu[menuFields.label] || "";
      const isActive = key === this._activeKey;

      const btn = document.createElement("div");
      btn.className = "btn-gnb";
      btn.dataset.key = key;

      if (isActive) {
        btn.classList.add("active");
        btn.innerHTML = `
                    <div class="btn-bg">
                        <div class="btn-bg-solid"></div>
                        <div class="btn-bg-gradient"></div>
                    </div>
                    <div class="btn-content">
                        <span class="btn-text">${label}</span>
                        <div class="btn-icon">
                            <img src="${config.iconSrc}" alt="">
                        </div>
                    </div>
                    <div class="btn-border-overlay"></div>
                `;
      } else {
        btn.innerHTML = `<span class="btn-text">${label}</span>`;
      }

      gnb.appendChild(btn);
    }),
  );
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
  const root = this.appendElement;

  this._internalHandlers.gnbClick = (e) => {
    const btn = e.target.closest(".btn-gnb");
    if (btn && btn.dataset.key) {
      this.setActiveMenu(btn.dataset.key);
    }
  };

  root.addEventListener("click", this._internalHandlers.gnbClick);
}

function setActiveMenu(config, key) {
  if (this._activeKey === key) return;
  this._activeKey = key;

  if (this._menusData) {
    renderMenus.call(this, config, this._menusData);
  }
}

// ======================
// CLOCK
// ======================

function startClock() {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dateEl = this.appendElement.querySelector(".date-text");
  const timeEl = this.appendElement.querySelector(".time-text");

  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const day = dayNames[now.getDay()];
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");

    if (dateEl) dateEl.textContent = `${y}-${m}-${d}(${day})`;
    if (timeEl) timeEl.textContent = `${h}:${min}:${s}`;
  }

  updateClock();
  this._clockInterval = setInterval(updateClock, 1000);
}
