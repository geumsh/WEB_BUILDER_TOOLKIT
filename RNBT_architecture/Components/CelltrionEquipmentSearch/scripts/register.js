/*
 * CelltrionEquipmentSearch Component - register
 * 셀트리온 설비 검색 리스트 패널
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_equipmentSelected
 *
 * Expected Data Structure:
 * {
 *   equipments: [
 *     {
 *       name: "Conveyor Belt C4",
 *       sub: "Normal Operation",
 *       img: "./assets/etv.png",
 *       zone: "ZONE 1",
 *       battery: 75,
 *       status: "normal",
 *       statusLabel: "정상",
 *       selected: false
 *     }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._data = null;
this._selectedIndex = null;
this._searchKeyword = '';
this._internalHandlers = {};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this);

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
        '.eqs-row': '@TBD_equipmentSelected'
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
            equipments: [
                { name: 'Conveyor Belt C4', sub: 'Normal Operation', img: './assets/etv.png', zone: 'ZONE 1', battery: 75, status: 'normal', statusLabel: '정상' },
                { name: 'Air Balance', sub: 'Normal Operation', img: './assets/air-balance.png', zone: 'ZONE 1', battery: 45, status: 'normal', statusLabel: '정상' },
                { name: 'AMR Forklift B4', sub: 'High Precision Unit', img: './assets/amr.png', zone: 'ZONE 3', battery: 88, status: 'normal', statusLabel: '정상', selected: true },
                { name: 'CCTV A2', sub: 'Normal Operation', img: './assets/cctv.png', zone: 'ZONE 2', battery: 35, status: 'warning', statusLabel: '정상' },
                { name: 'Dock D2', sub: 'Normal Operation', img: './assets/dock.png', zone: 'ZONE 1', battery: 65, status: 'normal', statusLabel: '정상' },
                { name: 'AGV D1', sub: 'Normal Operation', img: './assets/agv.png', zone: 'ZONE 2', battery: 7, status: 'danger', statusLabel: '고장' },
                { name: 'Pallet Stacker A3', sub: 'Normal Operation', img: './assets/pallet-stacker.png', zone: 'ZONE 1', battery: 91, status: 'normal', statusLabel: '정상' },
                { name: 'Palletizing Robot D1', sub: 'Normal Operation', img: './assets/palletizing-robot.png', zone: 'ZONE 1', battery: 41, status: 'normal', statusLabel: '정상' },
                { name: 'UP/DN Table LIFT B2', sub: 'Normal Operation', img: './assets/table-lift.png', zone: 'ZONE 1', battery: 59, status: 'normal', statusLabel: '정상' },
                { name: 'X-RAY A2', sub: 'Normal Operation', img: './assets/xray.png', zone: 'ZONE 1', battery: 28, status: 'normal', statusLabel: '정상' }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data || !data.equipments) return;
    this._data = data.equipments;

    // 선택된 항목 인덱스 찾기
    const selectedIdx = data.equipments.findIndex(eq => eq.selected);
    if (selectedIdx >= 0) this._selectedIndex = selectedIdx;

    applyFilter.call(this);
}

function renderRows(equipments) {
    const container = this.appendElement.querySelector('.eqs-contents');
    if (!container) return;
    container.innerHTML = '';

    equipments.forEach((eq, index) => {
        const row = createRow(eq, index, this._selectedIndex);
        container.appendChild(row);
    });
}

function createRow(eq, index, selectedIndex) {
    const isSelected = index === selectedIndex;
    const row = document.createElement('div');
    row.className = `eqs-row${isSelected ? ' eqs-row--selected' : ''}`;
    row.dataset.index = index;
    row._eqData = eq;

    const barWidth = Math.round(eq.battery * 0.95);
    const barClass = eq.status === 'danger' ? 'eqs-battery-bar--danger'
        : eq.status === 'warning' ? 'eqs-battery-bar--warning'
        : 'eqs-battery-bar--normal';
    const statusClass = `eqs-cell-status--${eq.status}`;

    row.innerHTML = `
        <div class="eqs-cell-name">
            <div class="eqs-cell-img"><img src="${eq.img}" alt=""></div>
            <div class="eqs-cell-txt">
                <p class="eqs-cell-name-title">${eq.name}</p>
                <p class="eqs-cell-name-sub">${eq.sub}</p>
            </div>
        </div>
        <div class="eqs-cell-zone"><p class="eqs-cell-zone-text">${eq.zone}</p></div>
        <div class="eqs-cell-battery">
            <div class="eqs-battery-track"><div class="eqs-battery-bar ${barClass}" style="width: ${barWidth}px;"></div></div>
            <p class="eqs-battery-text">${eq.battery}%</p>
        </div>
        <div class="eqs-cell-status ${statusClass}"><p class="eqs-status-text">${eq.statusLabel}</p></div>
    `;

    return row;
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.rowClick = (e) => {
        const row = e.target.closest('.eqs-row[data-index]');
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        this._selectedIndex = index;
        applyFilter.call(this);
    };

    this._internalHandlers.searchInput = (e) => {
        this._searchKeyword = e.target.value.toLowerCase();
        applyFilter.call(this);
    };

    root.addEventListener('click', this._internalHandlers.rowClick);

    const searchInput = root.querySelector('.eqs-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', this._internalHandlers.searchInput);
    }
}

function applyFilter() {
    if (!this._data) return;

    let filtered = this._data;
    if (this._searchKeyword) {
        const kw = this._searchKeyword;
        filtered = filtered.filter(eq =>
            eq.name.toLowerCase().includes(kw) ||
            eq.zone.toLowerCase().includes(kw) ||
            eq.sub.toLowerCase().includes(kw)
        );
    }

    renderRows.call(this, filtered);
}
