/*
 * Header Component - register
 * 모니모 통합대시보드 GNB 헤더 (메뉴 전환 + 시계)
 *
 * Subscribes to: TBD_headerData
 * Events: @gnbClicked, @logoutClicked
 *
 * Expected Data Structure:
 * {
 *   TBD_menus: [
 *     { key: "overview", label: "종합현황" },
 *     { key: "business", label: "비지니스현황" },
 *     { key: "infra", label: "인프라현황" },
 *     { key: "itops", label: "IT운영관리" }
 *   ],
 *   TBD_activeKey: "infra",
 *   TBD_userName: "홍길동"
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    menusKey: 'TBD_menus',
    activeKeyKey: 'TBD_activeKey',
    userNameKey: 'TBD_userName',
    menuFields: { key: 'key', label: 'label' },
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
    // TBD_headerData: ['renderData']
};

go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.menu-item': '@gnbClicked',
        '.btn-logout': '@logoutClicked',
    }
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

    const userName = data[config.userNameKey];
    if (userName) {
        const nameEl = this.appendElement.querySelector('.user-name-text .name');
        if (nameEl) nameEl.textContent = userName;
    }

    const activeKey = data[config.activeKeyKey];
    if (activeKey !== undefined) {
        this._activeKey = activeKey;
    }

    const menus = data[config.menusKey];
    if (menus && Array.isArray(menus)) {
        this._menusData = menus;
        renderMenus.call(this, config, menus);
    }
}

function renderMenus(config, menus) {
    const { menuFields } = config;
    const menuContainer = this.appendElement.querySelector('.menu');
    if (!menuContainer) return;
    menuContainer.innerHTML = '';

    go(
        menus,
        each(menu => {
            const key = menu[menuFields.key] || '';
            const label = menu[menuFields.label] || '';
            const isActive = key === this._activeKey;

            const item = document.createElement('div');
            item.className = 'menu-item';
            item.dataset.key = key;

            if (isActive) {
                item.classList.add('active');
                item.innerHTML = `
                    <span class="menu-item-text">${label}</span>
                    <div class="menu-item-glow"></div>
                `;
            } else {
                item.innerHTML = `<span class="menu-item-text">${label}</span>`;
            }

            menuContainer.appendChild(item);
        })
    );
}

function setActiveMenu(config, key) {
    if (this._activeKey === key) return;
    this._activeKey = key;

    if (this._menusData) {
        renderMenus.call(this, config, this._menusData);
    }
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.menuClick = (e) => {
        const item = e.target.closest('.menu-item');
        if (item && item.dataset.key) {
            this.setActiveMenu(item.dataset.key);
        }
    };

    root.addEventListener('click', this._internalHandlers.menuClick);
}

// ======================
// CLOCK
// ======================

function startClock() {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateEl = this.appendElement.querySelector('.date-text');
    const dayEl = this.appendElement.querySelector('.day-text');
    const timeEl = this.appendElement.querySelector('.time-text');

    function updateClock() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const day = dayNames[now.getDay()];
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');

        if (dateEl) dateEl.textContent = `${y}/${m}/${d}`;
        if (dayEl) dayEl.textContent = day;
        if (timeEl) timeEl.textContent = `${h}:${min}:${s}`;
    }

    updateClock();
    this._clockInterval = setInterval(updateClock, 1000);
}
