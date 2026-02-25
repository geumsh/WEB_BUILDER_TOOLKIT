/*
 * EventLog Component - register
 * Subscribes to: eventLogData
 * Events: @eventRowClicked
 *
 * 이벤트 현황 하단 로그 패널
 * 이벤트 목록 테이블 + 등급별 카운트 표시
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        tableBody: '.table-body',
        tableHeader: '.table-header',
        statusCount: '.status-count',
        btnExpand: '.btn-expand',
        btnExpandIcon: '.btn-expand-icon'
    },
    severityClasses: {
        critical: 'status-dot-mini--critical',
        major: 'status-dot-mini--major',
        minor: 'status-dot-mini--minor',
        warning: 'status-dot-mini--warning',
        normal: 'status-dot-mini--normal'
    }
};

// ======================
// STATE
// ======================

this._selectedRowIndex = null;
this._isCollapsed = false;

// ======================
// BINDINGS
// ======================

this.renderEventLog = renderEventLog.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    eventLogData: ['renderEventLog']
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
        '.table-row': '@eventRowClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// INTERNAL HANDLERS (Row Selection)
// ======================

this._internalHandlers = {
    handleExpandToggle: () => {
        this._isCollapsed = !this._isCollapsed;

        const tableBody = this.appendElement.querySelector(config.selectors.tableBody);
        const tableHeader = this.appendElement.querySelector(config.selectors.tableHeader);
        const btnExpandIcon = this.appendElement.querySelector(config.selectors.btnExpandIcon);

        if (this._isCollapsed) {
            tableBody.style.display = 'none';
            tableHeader.style.display = 'none';
            btnExpandIcon.style.transform = 'rotate(180deg)';
        } else {
            tableBody.style.display = '';
            tableHeader.style.display = '';
            btnExpandIcon.style.transform = '';
        }
    },

    handleRowClick: (e) => {
        const row = e.target.closest('.table-row');
        if (!row) return;

        const tableBody = this.appendElement.querySelector(config.selectors.tableBody);
        const rows = tableBody.querySelectorAll('.table-row');
        const index = Array.from(rows).indexOf(row);

        // 같은 행 클릭 시 선택 해제
        if (this._selectedRowIndex === index) {
            row.classList.remove('table-row--selected');
            this._selectedRowIndex = null;
            return;
        }

        // 기존 선택 해제
        const prevSelected = tableBody.querySelector('.table-row--selected');
        if (prevSelected) {
            prevSelected.classList.remove('table-row--selected');
            // 기존 선택 행의 액션 버튼 제거
            const prevActions = prevSelected.querySelector('.row-actions');
            if (prevActions) prevActions.remove();
        }

        // 새 행 선택
        row.classList.add('table-row--selected');
        this._selectedRowIndex = index;

        // 선택된 행에 액션 버튼 추가
        addRowActions(row);
    }
};

this.appendElement.querySelector(config.selectors.tableBody)
    ?.addEventListener('click', this._internalHandlers.handleRowClick);

this.appendElement.querySelector(config.selectors.btnExpand)
    ?.addEventListener('click', this._internalHandlers.handleExpandToggle);

// ======================
// RENDER
// ======================

function renderEventLog(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { summary, events } = data;
    const { selectors, severityClasses } = config;

    // 1. 등급별 카운트 업데이트
    if (summary) {
        const countEls = this.appendElement.querySelectorAll(selectors.statusCount);
        go(
            countEls,
            each(el => {
                const severity = el.dataset.severity;
                if (severity && summary[severity] != null) {
                    el.textContent = summary[severity];
                }
            })
        );
    }

    // 2. 테이블 행 렌더링
    if (events) {
        const tableBody = this.appendElement.querySelector(selectors.tableBody);
        tableBody.innerHTML = '';
        this._selectedRowIndex = null;

        go(
            events,
            each(event => {
                const row = createRow(event, severityClasses);
                tableBody.appendChild(row);
            })
        );
    }
}

function createRow(event, severityClasses) {
    const row = document.createElement('div');
    row.className = 'table-row';

    const dotClass = severityClasses[event.severity] || severityClasses.normal;

    row.innerHTML = `
        <div class="td-status">
            <div class="status-dot-mini ${dotClass}"></div>
        </div>
        <div class="td-asset-id">
            <span class="row-text">${event.assetId || ''}</span>
        </div>
        <div class="td-location">
            <span class="row-text">${event.location || ''}</span>
        </div>
        <div class="td-time">
            <div class="td-time-inner">
                <span class="row-text row-text--time">${event.firstTime || ''}</span>
            </div>
        </div>
        <div class="td-time">
            <div class="td-time-inner">
                <span class="row-text row-text--time">${event.lastTime || ''}</span>
            </div>
        </div>
        <div class="td-group">
            <span class="row-text">${event.group || ''}</span>
        </div>
        <div class="td-message">
            <span class="row-text">${event.message || ''}</span>
        </div>
    `;

    return row;
}

function addRowActions(row) {
    // 이미 액션 버튼이 있으면 스킵
    if (row.querySelector('.row-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    actions.innerHTML = `
        <button class="btn-new"><span>신규</span></button>
        <button class="btn-row-action">
            <div class="icon-cctv">
                <img src="assets/cctv-icon.svg" alt="">
            </div>
            <span>영상</span>
        </button>
        <button class="btn-row-action"><span>영상</span></button>
    `;
    row.appendChild(actions);
}
