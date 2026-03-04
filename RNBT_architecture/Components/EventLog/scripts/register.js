/*
 * EventLog Component - register
 * 하단 이벤트 로그 패널 (테이블 형태)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_rowClicked, @TBD_ackClicked, @TBD_allClicked, @TBD_expandClicked, @TBD_soundToggled
 *
 * Expected Data Structure:
 * {
 *   title: "이벤트 현황",
 *   summary: { critical: 3, major: 11, minor: 24, warning: 927, normal: 327 },
 *   columns: [
 *     { key: "level", label: "등급", width: 36 },
 *     { key: "assetId", label: "자산ID", width: 140 },
 *     ...
 *   ],
 *   events: [
 *     {
 *       level: "critical",
 *       assetId: "변압기 #302",
 *       location: "전기실",
 *       firstTime: "2026-02-27 09:33:00",
 *       lastTime: "2026-02-27 09:33:00",
 *       group: "구분A",
 *       message: "냉방 용량 부족 감지",
 *       isNew: true
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
    columnsKey: 'TBD_columns',
    eventsKey: 'TBD_events',
    eventFields: {
        level: 'TBD_level',
        assetId: 'TBD_assetId',
        location: 'TBD_location',
        firstTime: 'TBD_firstTime',
        lastTime: 'TBD_lastTime',
        group: 'TBD_group',
        message: 'TBD_message',
        isNew: 'TBD_isNew'
    },
    summaryOrder: ['critical', 'major', 'minor', 'warning', 'normal'],
    // 컬럼별 CSS 클래스 매핑
    columnClasses: {
        level: 'td-grade',
        assetId: 'td-asset-id',
        location: 'td-location',
        firstTime: 'td-first-time',
        lastTime: 'td-last-time',
        group: 'td-group',
        message: 'td-message'
    },
    headerClasses: {
        level: 'th-grade',
        assetId: 'th-asset-id',
        location: 'th-location',
        firstTime: 'th-first-time',
        lastTime: 'th-last-time',
        group: 'th-group',
        message: 'th-message'
    },
    timeFields: ['firstTime', 'lastTime']
};

// ======================
// STATE
// ======================

this._selectedRowIndex = null;
this._eventsData = null;
this._collapsed = false;
this._autoEnabled = true;
this._internalHandlers = {};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this.selectRow = selectRow.bind(this, config);

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
        '.table-row': '@TBD_rowClicked',
        '.btn-ack': '@TBD_ackClicked',
        '.btn-all': '@TBD_allClicked',
        '.sound-btn': '@TBD_soundToggled'
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
            TBD_summary: { critical: 3, major: 11, minor: 24, warning: 927, normal: 327 },
            TBD_columns: [
                { key: 'level', label: '등급', width: 36 },
                { key: 'assetId', label: '자산ID', width: 140 },
                { key: 'location', label: '위치', width: 120 },
                { key: 'firstTime', label: '최초발생시간', width: 200 },
                { key: 'lastTime', label: '마지막발생시간', width: 200 },
                { key: 'group', label: '구분(업무그룹)', width: 120 },
                { key: 'message', label: '메시지' }
            ],
            TBD_events: [
                { TBD_level: 'major',    TBD_assetId: '변압기 #302', TBD_location: '전기실', TBD_firstTime: '2026-02-27 09:33:00', TBD_lastTime: '2026-02-27 09:33:00', TBD_group: '구분A', TBD_message: '배터리 잔량 저하 (현재35%) 이벤트 내용', TBD_isNew: false },
                { TBD_level: 'minor',    TBD_assetId: 'UPS #105',    TBD_location: '전산실', TBD_firstTime: '2026-02-27 09:31:22', TBD_lastTime: '2026-02-27 09:32:45', TBD_group: '구분B', TBD_message: '정격 전류 초과 근접 (현재 부하 92%)', TBD_isNew: false },
                { TBD_level: 'critical', TBD_assetId: '항온항습기 #7', TBD_location: '전산실 B존', TBD_firstTime: '2026-02-27 09:28:10', TBD_lastTime: '2026-02-27 09:33:00', TBD_group: '구분A', TBD_message: '냉방 용량 부족 감지 (전산실 B존)', TBD_isNew: true },
                { TBD_level: 'normal',   TBD_assetId: '온도센서 #42', TBD_location: '기계실', TBD_firstTime: '2026-02-27 09:25:00', TBD_lastTime: '2026-02-27 09:25:00', TBD_group: '구분B', TBD_message: '온도 임계치 초과 (32.5 ℃)', TBD_isNew: false },
                { TBD_level: 'major',    TBD_assetId: '발전기 #201',  TBD_location: '발전실', TBD_firstTime: '2026-02-27 09:20:15', TBD_lastTime: '2026-02-27 09:30:00', TBD_group: '구분A', TBD_message: '연료 잔량 부족 (현재 18%)', TBD_isNew: true },
                { TBD_level: 'warning',  TBD_assetId: '배전반 #003',  TBD_location: '전기실', TBD_firstTime: '2026-02-27 09:15:30', TBD_lastTime: '2026-02-27 09:29:00', TBD_group: '구분C', TBD_message: '절연 저항 저하 감지', TBD_isNew: false },
                { TBD_level: 'critical', TBD_assetId: 'PDU #088',    TBD_location: '서버실 A', TBD_firstTime: '2026-02-27 09:10:00', TBD_lastTime: '2026-02-27 09:33:00', TBD_group: '구분A', TBD_message: '과부하 경보 (사용률 98%)', TBD_isNew: true },
                { TBD_level: 'minor',    TBD_assetId: '축전지 #015',  TBD_location: '축전지실', TBD_firstTime: '2026-02-27 09:05:44', TBD_lastTime: '2026-02-27 09:28:12', TBD_group: '구분B', TBD_message: '셀 전압 불균형 감지 (편차 0.3V)', TBD_isNew: false },
                { TBD_level: 'normal',   TBD_assetId: '소방펌프 #2',  TBD_location: '지하1층', TBD_firstTime: '2026-02-27 08:55:00', TBD_lastTime: '2026-02-27 08:55:00', TBD_group: '구분C', TBD_message: '정기 자동 점검 완료', TBD_isNew: false },
                { TBD_level: 'warning',  TBD_assetId: 'CRAC #012',   TBD_location: '전산실', TBD_firstTime: '2026-02-27 08:48:30', TBD_lastTime: '2026-02-27 09:27:00', TBD_group: '구분A', TBD_message: '냉매 압력 이상 (고압 경보)', TBD_isNew: false },
                { TBD_level: 'major',    TBD_assetId: 'ATS #001',    TBD_location: '수전실', TBD_firstTime: '2026-02-27 08:40:00', TBD_lastTime: '2026-02-27 09:25:00', TBD_group: '구분A', TBD_message: '절체 지연 감지 (응답 시간 초과)', TBD_isNew: false },
                { TBD_level: 'minor',    TBD_assetId: '누수센서 #33', TBD_location: '기계실', TBD_firstTime: '2026-02-27 08:30:10', TBD_lastTime: '2026-02-27 08:30:10', TBD_group: '구분B', TBD_message: '미세 누수 감지 (구역 C-12)', TBD_isNew: false }
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
    const titleEl = this.appendElement.querySelector('.log-title');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 서머리 배지
    const summary = data[config.summaryKey];
    if (summary) {
        renderSummary.call(this, config, summary);
    }

    // 테이블 헤더
    const columns = data[config.columnsKey];
    if (columns && Array.isArray(columns)) {
        renderTableHeader.call(this, config, columns);
    }

    // 이벤트 행
    const events = data[config.eventsKey];
    if (events && Array.isArray(events)) {
        this._eventsData = events;
        renderRows.call(this, config, events);
    }
}

function renderSummary(config, summary) {
    const container = this.appendElement.querySelector('.status-items');
    if (!container) return;
    container.innerHTML = '';

    fx.go(
        config.summaryOrder,
        fx.each(level => {
            const count = summary[level] ?? 0;
            const item = document.createElement('div');
            item.className = 'status-item';
            item.innerHTML = `
                <div class="status-dot ${level}"></div>
                <span class="count">${count}</span>
            `;
            container.appendChild(item);
        })
    );
}

function renderTableHeader(config, columns) {
    const headerEl = this.appendElement.querySelector('.table-header');
    if (!headerEl) return;
    headerEl.innerHTML = '';

    fx.go(
        columns,
        fx.each(col => {
            const cell = document.createElement('div');
            const cssClass = config.headerClasses[col.key] || '';
            cell.className = `th-cell ${cssClass}`;
            cell.textContent = col.label;
            headerEl.appendChild(cell);
        })
    );
}

function renderRows(config, events) {
    const bodyEl = this.appendElement.querySelector('.table-body');
    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    fx.go(
        events,
        fx.each((event, index) => {
            const row = createRow.call(this, config, event, index);
            bodyEl.appendChild(row);
        })
    );
}

function createRow(config, event, index) {
    const { eventFields, columnClasses, timeFields } = config;
    const level = event[eventFields.level] || 'normal';
    const isSelected = this._selectedRowIndex === index;

    const row = document.createElement('div');
    row.className = 'table-row';
    row.dataset.index = index;
    if (isSelected) row.classList.add('row-selected');

    // 등급 (status dot)
    const gradeCell = document.createElement('div');
    gradeCell.className = `td-cell ${columnClasses.level}`;
    gradeCell.innerHTML = `<div class="row-dot ${level}"></div>`;
    row.appendChild(gradeCell);

    // 나머지 컬럼
    const fieldOrder = ['assetId', 'location', 'firstTime', 'lastTime', 'group', 'message'];
    fx.go(
        fieldOrder,
        fx.each(field => {
            const cell = document.createElement('div');
            cell.className = `td-cell ${columnClasses[field] || ''}`;
            const value = event[eventFields[field]] || '-';
            const isTime = timeFields.includes(field);
            cell.innerHTML = `<span class="${isTime ? 'text-time' : 'text-default'}">${value}</span>`;
            row.appendChild(cell);
        })
    );

    // 선택된 행: 액션 버튼
    if (isSelected && event[eventFields.isNew]) {
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        actions.innerHTML = `
            <button class="btn-new"><span>신규</span></button>
            <button class="btn-row-action">
                <div class="icon-cctv"><img src="./assets/icon-cctv.svg" alt=""></div>
                <span>영상</span>
            </button>
            <button class="btn-row-action"><span>영상</span></button>
        `;
        row.appendChild(actions);
    }

    return row;
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.rowClick = (e) => {
        const row = e.target.closest('.table-row');
        if (row) {
            const index = parseInt(row.dataset.index, 10);
            this.selectRow(index);
        }
    };

    this._internalHandlers.expandClick = (e) => {
        const btn = e.target.closest('.btn-expand');
        if (!btn) return;
        const bottomLog = root.querySelector('.bottom-log');
        if (!bottomLog) return;

        this._collapsed = !this._collapsed;
        root.style.overflow = this._collapsed ? 'hidden' : '';
        bottomLog.style.transition = 'transform 0.3s ease';
        bottomLog.style.transform = this._collapsed
            ? 'translateY(calc(100% - 48px))'
            : '';

        const icon = btn.querySelector('.icon-expand');
        if (icon) {
            icon.style.transition = 'transform 0.3s ease';
            icon.style.transform = this._collapsed ? 'rotate(180deg)' : '';
        }
    };

    this._internalHandlers.toggleClick = (e) => {
        const toggle = e.target.closest('.toggle-switch') || e.target.closest('.toggle-pill');
        if (!toggle) return;

        this._autoEnabled = !this._autoEnabled;
        const pill = root.querySelector('.toggle-pill');
        const knob = root.querySelector('.toggle-knob');
        const bg = root.querySelector('.toggle-switch-bg');
        const label = root.querySelector('.auto-label');

        if (knob) {
            knob.style.transition = 'transform 0.2s ease';
            knob.style.transform = this._autoEnabled ? '' : 'translateX(0)';
        }
        if (root.querySelector('.toggle-switch')) {
            root.querySelector('.toggle-switch').style.justifyContent =
                this._autoEnabled ? 'flex-end' : 'flex-start';
        }
        if (bg) {
            bg.style.opacity = this._autoEnabled ? '' : '0.3';
        }
        if (label) {
            label.style.color = this._autoEnabled ? '#94a3b8' : '#4a5568';
        }
    };

    root.addEventListener('click', this._internalHandlers.rowClick);
    root.addEventListener('click', this._internalHandlers.expandClick);
    root.addEventListener('click', this._internalHandlers.toggleClick);
}

function selectRow(config, index) {
    // 이전 선택 해제
    const prevRow = this.appendElement.querySelector('.table-row.row-selected');
    if (prevRow) prevRow.classList.remove('row-selected');

    this._selectedRowIndex = index;

    // 전체 다시 렌더링 (액션 버튼 표시/숨김 처리)
    if (this._eventsData) {
        renderRows.call(this, config, this._eventsData);
    }
}
