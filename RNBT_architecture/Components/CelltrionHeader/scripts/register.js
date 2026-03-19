/*
 * CelltrionHeader Component - register
 * 셀트리온 자동화 창고 헤더 (CI + 네비게이션 + 아이콘)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_navClicked, @TBD_iconClicked
 *
 * Expected Data Structure:
 * {
 *   title: "자동화 창고 통합 모니터링 시스템",
 *   navItems: [
 *     { label: "대시보드", active: true },
 *     { label: "통합관제" },
 *     { label: "설비 및 자산관리" },
 *     { label: "이동자원" },
 *     { label: "안전 및 보안" }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    navItemsKey: 'TBD_navItems',
    navFields: {
        label: 'TBD_label',
        active: 'TBD_active'
    }
};

// ======================
// STATE
// ======================

this._activeNavIndex = 0;
this._internalHandlers = {};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    TBD_topicName: ['renderData']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.nav-btn': '@TBD_navClicked',
        '.icon-btn': '@TBD_iconClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            TBD_title: '자동화 창고 통합 모니터링 시스템',
            TBD_navItems: [
                { TBD_label: '대시보드', TBD_active: true },
                { TBD_label: '통합관제' },
                { TBD_label: '설비 및 자산관리' },
                { TBD_label: '이동자원' },
                { TBD_label: '안전 및 보안' }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 타이틀
    const titleEl = this.appendElement.querySelector('.header-title');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 네비게이션
    const navItems = data[config.navItemsKey];
    if (navItems && Array.isArray(navItems)) {
        // active 인덱스 찾기
        const activeIdx = navItems.findIndex(item => item[config.navFields.active]);
        if (activeIdx >= 0) this._activeNavIndex = activeIdx;
        renderNav.call(this, config, navItems);
    }
}

function renderNav(config, navItems) {
    const container = this.appendElement.querySelector('.nav');
    if (!container) return;
    container.innerHTML = '';

    navItems.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.index = index;
        if (index === this._activeNavIndex) {
            btn.classList.add('nav-btn--active');
        }
        btn.innerHTML = `<span class="nav-btn-label">${item[config.navFields.label] || ''}</span>`;
        container.appendChild(btn);
    });
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.navClick = (e) => {
        const btn = e.target.closest('.nav-btn[data-index]');
        if (!btn) return;
        const index = parseInt(btn.dataset.index, 10);
        if (index === this._activeNavIndex) return;

        this._activeNavIndex = index;

        // active 상태 업데이트
        root.querySelectorAll('.nav-btn').forEach((el, i) => {
            el.classList.toggle('nav-btn--active', i === index);
        });
    };

    root.addEventListener('click', this._internalHandlers.navClick);
}
