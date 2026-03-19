/*
 * CelltrionEventLog Component - register
 * 셀트리온 자동화 창고 이벤트 현황 카드 패널
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_cardClicked, @TBD_filterChanged, @TBD_searchChanged
 *
 * Expected Data Structure:
 * {
 *   title: "이벤트 현황",
 *   summary: { all: 24, normal: 24, critical: 24, warning: 5 },
 *   events: [
 *     {
 *       level: "critical",
 *       time: "10:42:15",
 *       location: "2층 냉장구역 C존 #T5521",
 *       description: "허용 온도 범위를 초과하여 의약품 보관 기준을 벗어났습니다.",
 *       tag: "온도 이상"
 *     }
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
    summaryKey: 'TBD_summary',
    eventsKey: 'TBD_events',
    eventFields: {
        level: 'TBD_level',
        time: 'TBD_time',
        location: 'TBD_location',
        description: 'TBD_description',
        tag: 'TBD_tag'
    },
    filterOrder: ['all', 'normal', 'critical', 'warning'],
    levelIcons: {
        critical: './assets/icon-critical.svg',
        warning: './assets/icon-warning.svg',
        normal: './assets/icon-normal.svg'
    }
};

// ======================
// STATE
// ======================

this._eventsData = null;
this._activeFilter = 'all';
this._searchKeyword = '';
this._collapsed = false;
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
        '.event-card': '@TBD_cardClicked'
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
            TBD_title: '이벤트 현황',
            TBD_summary: { all: 3, normal: 1, critical: 1, warning: 1 },
            TBD_events: [
                { TBD_level: 'critical', TBD_time: '10:42:15', TBD_location: '2층 냉장구역 C존 #T5521', TBD_description: '허용 온도 범위를 초과하여 의약품 보관 기준을 벗어났습니다.', TBD_tag: '온도 이상' },
                { TBD_level: 'warning',  TBD_time: '10:40:00', TBD_location: '2층 피킹구역 B존 #P3302', TBD_description: '작업 물량 증가로 인해 출고 지연이 예상됩니다.', TBD_tag: '지연 경고' },
                { TBD_level: 'normal',   TBD_time: '10:38:22', TBD_location: '1층 입고구역 A라인 #R1102', TBD_description: '화물 ID #CARGO-91562가 입고 처리 완료되었습니다.', TBD_tag: '입고 완료' }
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

    // 필터 탭
    const summary = data[config.summaryKey];
    if (summary) {
        renderFilterTabs.call(this, config, summary);
    }

    // 이벤트 카드
    const events = data[config.eventsKey];
    if (events && Array.isArray(events)) {
        this._eventsData = events;
        applyFilter.call(this, config);
    }
}

function renderFilterTabs(config, summary) {
    const container = this.appendElement.querySelector('.filter-tabs');
    if (!container) return;
    container.innerHTML = '';

    fx.go(
        config.filterOrder,
        fx.each(level => {
            const count = summary[level] ?? 0;
            const tab = document.createElement('div');
            tab.className = `filter-tab filter-tab--${level}`;
            tab.dataset.level = level;
            if (this._activeFilter !== 'all' && this._activeFilter !== level && level !== 'all') {
                tab.classList.add('filter-inactive');
            }
            tab.innerHTML = `
                <p class="filter-tab-label">${level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}</p>
                <div class="filter-tab-badge">
                    <p class="filter-tab-count">${count}</p>
                </div>
            `;
            container.appendChild(tab);
        })
    );
}

function renderCards(config, events) {
    const container = this.appendElement.querySelector('.cards-content');
    if (!container) return;
    container.innerHTML = '';

    events.forEach((event) => {
        const card = createCard(config, event);
        container.appendChild(card);
    });
}

function createCard(config, event) {
    const { eventFields, levelIcons } = config;
    const level = event[eventFields.level] || 'normal';
    const iconSrc = levelIcons[level] || levelIcons.normal;

    const card = document.createElement('div');
    card.className = `event-card event-card--${level}`;
    card._eventData = event;

    card.innerHTML = `
        <div class="card-top">
            <div class="card-header">
                <div class="card-level">
                    <div class="card-level-icon">
                        <img src="${iconSrc}" alt="">
                    </div>
                    <p class="card-level-text">${level.toUpperCase()}</p>
                </div>
                <p class="card-time">${event[eventFields.time] || ''}</p>
            </div>
            <div class="card-body">
                <div class="card-location">
                    <p class="card-location-text">${event[eventFields.location] || ''}</p>
                </div>
                <div class="card-description">
                    <p class="card-description-text">${event[eventFields.description] || ''}</p>
                </div>
            </div>
        </div>
        <div class="card-tag">
            <p class="card-tag-text">${event[eventFields.tag] || ''}</p>
        </div>
    `;

    return card;
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.filterClick = (e) => {
        const tab = e.target.closest('.filter-tab[data-level]');
        if (!tab) return;
        const level = tab.dataset.level;

        this._activeFilter = (this._activeFilter === level) ? 'all' : level;
        applyFilter.call(this, config);
        updateFilterUI.call(this);
    };

    this._internalHandlers.searchInput = (e) => {
        this._searchKeyword = e.target.value.toLowerCase();
        applyFilter.call(this, config);
    };

    this._internalHandlers.toggleClick = (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        this._collapsed = !this._collapsed;
        const eventLog = root.querySelector('.event-log');
        if (eventLog) {
            eventLog.classList.toggle('event-log--collapsed', this._collapsed);
        }
    };

    root.addEventListener('click', this._internalHandlers.filterClick);
    root.addEventListener('click', this._internalHandlers.toggleClick);

    const searchInput = root.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', this._internalHandlers.searchInput);
    }
}

function updateFilterUI() {
    const tabs = this.appendElement.querySelectorAll('.filter-tab[data-level]');
    tabs.forEach(tab => {
        const level = tab.dataset.level;
        const isActive = this._activeFilter === 'all' || this._activeFilter === level || level === 'all';
        tab.classList.toggle('filter-inactive', !isActive);
    });
}

function applyFilter(config) {
    if (!this._eventsData) return;

    let events = this._eventsData;

    // 레벨 필터
    if (this._activeFilter !== 'all') {
        events = events.filter(e => e[config.eventFields.level] === this._activeFilter);
    }

    // 검색 필터
    if (this._searchKeyword) {
        const keyword = this._searchKeyword;
        events = events.filter(e => {
            const desc = (e[config.eventFields.description] || '').toLowerCase();
            const loc = (e[config.eventFields.location] || '').toLowerCase();
            const tag = (e[config.eventFields.tag] || '').toLowerCase();
            return desc.includes(keyword) || loc.includes(keyword) || tag.includes(keyword);
        });
    }

    renderCards.call(this, config, events);
}
