/*
 * Popup Component - register
 * 테이블 팝업 (동적 헤더/데이터 렌더링)
 *
 * Subscribes to: TBD_popupData
 * Events: @popupCloseClicked
 *
 * Expected Data Structure:
 * {
 *   TBD_title: "테이블스페이스현황",
 *   TBD_columns: ["수집일시", "호스트명", "인스턴스명", ...],
 *   TBD_rows: [
 *     ["2025-06-08 13:00", "원앱 운영DB1", "PIFP", ...],
 *     ...
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    columnsKey: 'TBD_columns',
    rowsKey: 'TBD_rows',
};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this._internalHandlers = {};

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    // TBD_popupData: ['renderData']
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
        '.btn-close': '@popupCloseClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // Show popup
    const wrapper = this.appendElement.querySelector('.popup-wrapper');
    if (wrapper) wrapper.style.display = '';

    // Title
    const title = data[config.titleKey];
    if (title) {
        const titleEl = this.appendElement.querySelector('.title-text');
        if (titleEl) titleEl.textContent = title;
    }

    // Columns
    const columns = data[config.columnsKey];
    if (columns && Array.isArray(columns)) {
        renderHeader.call(this, columns);
    }

    // Rows
    const rows = data[config.rowsKey];
    if (rows && Array.isArray(rows)) {
        renderBody.call(this, rows);
    }
}

function renderHeader(columns) {
    const thead = this.appendElement.querySelector('.popup-table thead');
    if (!thead) return;

    thead.innerHTML = '<tr>' +
        columns.map(col => `<th>${col}</th>`).join('') +
        '</tr>';
}

function renderBody(rows) {
    const tbody = this.appendElement.querySelector('.popup-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    go(
        rows,
        each(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = row.map(cell => `<td>${cell}</td>`).join('');
            tbody.appendChild(tr);
        })
    );
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.closeClick = () => {
        const wrapper = root.querySelector('.popup-wrapper');
        if (wrapper) wrapper.style.display = 'none';
    };

    root.querySelector('.btn-close')
        ?.addEventListener('click', this._internalHandlers.closeClick);
}

// ======================
// PUBLIC METHODS
// ======================

this.show = () => {
    const wrapper = this.appendElement.querySelector('.popup-wrapper');
    if (wrapper) wrapper.style.display = '';
};

this.hide = () => {
    const wrapper = this.appendElement.querySelector('.popup-wrapper');
    if (wrapper) wrapper.style.display = 'none';
};

// ======================
// MOCK DATA (주석 해제하면 즉시 표시)
// ======================

// this.renderData({
//     response: {
//         data: {
//             TBD_title: '테이블스페이스현황',
//             TBD_columns: ['수집일시', '호스트명', '인스턴스명', '테이블스페이스명', '총용량(GB)', '남은용량(GB)', '사용율(%)'],
//             TBD_rows: [
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '5', '95.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '12', '88.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '17', '83.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '20', '80.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '25', '75.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '28', '72.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '39', '61.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '41', '59.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '42', '58.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '44', '56.00%'],
//                 ['2025-06-08 13:00', '원앱 운영DB1', 'PIFP', 'PIFPDB01', '100', '46', '54.00%'],
//             ]
//         }
//     }
// });
