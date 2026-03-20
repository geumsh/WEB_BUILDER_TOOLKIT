/*
 * UrbanTwinLocationSearch Component - register
 * UrbanTwin 위치 검색 패널 (검색 + 필터 태그 + 카운트)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_searchChanged, @TBD_filterChanged, @TBD_addClicked, @TBD_filterBtnClicked
 *
 * Expected Data Structure:
 * {
 *   totalCount: 10,
 *   categories: [
 *     { label: "전체", value: "all", active: true },
 *     { label: "상업시설", value: "commercial" },
 *     { label: "오피스", value: "office" },
 *     { label: "쇼핑몰", value: "shopping" },
 *     { label: "리테일", value: "retail" },
 *     { label: "문화시설", value: "cultural" }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    totalCountKey: 'TBD_totalCount',
    categoriesKey: 'TBD_categories',
    categoryFields: {
        label: 'TBD_label',
        value: 'TBD_value',
        active: 'TBD_active'
    }
};

// ======================
// STATE
// ======================

this._activeFilter = 'all';
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
        '.add-btn': '@TBD_addClicked',
        '.filter-btn': '@TBD_filterBtnClicked'
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
            TBD_totalCount: 10,
            TBD_categories: [
                { TBD_label: '전체', TBD_value: 'all', TBD_active: true },
                { TBD_label: '상업시설', TBD_value: 'commercial' },
                { TBD_label: '오피스', TBD_value: 'office' },
                { TBD_label: '쇼핑몰', TBD_value: 'shopping' },
                { TBD_label: '리테일', TBD_value: 'retail' },
                { TBD_label: '문화시설', TBD_value: 'cultural' }
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

    // 총 카운트
    const count = data[config.totalCountKey];
    if (count !== undefined) {
        const countEl = this.appendElement.querySelector('.count-number');
        if (countEl) countEl.textContent = count;
    }

    // 필터 태그
    const categories = data[config.categoriesKey];
    if (categories && Array.isArray(categories)) {
        // active 카테고리 찾기
        const activeItem = categories.find(c => c[config.categoryFields.active]);
        if (activeItem) this._activeFilter = activeItem[config.categoryFields.value];
        renderFilterTags.call(this, config, categories);
    }
}

function renderFilterTags(config, categories) {
    const container = this.appendElement.querySelector('.filter-tags');
    if (!container) return;
    container.innerHTML = '';

    categories.forEach((cat) => {
        const value = cat[config.categoryFields.value] || '';
        const label = cat[config.categoryFields.label] || '';

        const btn = document.createElement('button');
        btn.className = 'tag';
        btn.dataset.value = value;
        if (value === this._activeFilter) {
            btn.classList.add('tag--active');
        }
        btn.textContent = label;
        container.appendChild(btn);
    });
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    // 필터 태그 클릭
    this._internalHandlers.tagClick = (e) => {
        const tag = e.target.closest('.tag[data-value]');
        if (!tag) return;
        const value = tag.dataset.value;
        if (value === this._activeFilter) return;

        this._activeFilter = value;

        // active 상태 UI 업데이트
        root.querySelectorAll('.tag').forEach(t => {
            t.classList.toggle('tag--active', t.dataset.value === value);
        });

        Weventbus.emit('@TBD_filterChanged', { filter: value });
    };

    // 검색 입력
    this._internalHandlers.searchKeydown = (e) => {
        if (e.key === 'Enter') {
            const keyword = e.target.value.trim();
            Weventbus.emit('@TBD_searchChanged', { keyword });
        }
    };

    root.addEventListener('click', this._internalHandlers.tagClick);

    const searchInput = root.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', this._internalHandlers.searchKeydown);
    }
}
