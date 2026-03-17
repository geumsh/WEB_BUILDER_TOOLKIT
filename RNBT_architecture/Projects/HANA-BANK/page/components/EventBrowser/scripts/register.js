/*
 * EventBrowser Component - register
 * 이벤트 브라우저 (테이블 + 필터 + 접기)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_rowClicked, @TBD_deleteClicked, @TBD_resetClicked
 *
 * Expected Data Structure:
 * {
 *   summary: { 심각: 23, 경계: 10, 주의: 8, 정상: 216 },
 *   columns: [
 *     { key: "level", label: "등급", width: 122 },
 *     { key: "group", label: "업무그룹", width: 135 },
 *     ...
 *   ],
 *   events: [
 *     {
 *       level: "심각",
 *       group: "업무A",
 *       task: "태스크명",
 *       host: "호스트A",
 *       time: "2025-03-17 09:00:00",
 *       solution: "솔루션A",
 *       area: "영역A",
 *       content: "이벤트 내용"
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
    summaryKey: "TBD_summary",
    columnsKey: "TBD_columns",
    eventsKey: "TBD_events",
    eventFields: {
        level: "TBD_level",
        group: "TBD_group",
        task: "TBD_task",
        host: "TBD_host",
        time: "TBD_time",
        solution: "TBD_solution",
        area: "TBD_area",
        content: "TBD_content",
    },
    summaryOrder: ["심각", "경계", "주의", "정상"],
    summaryMeta: {
        "심각": {
            cssClass: "critical",
            dotImg: "./assets/dc1b586bd7be301000547f2aa94c8a80974995e0.svg",
            rowDotImg: "./assets/f8c96fe5aec848e875d2f64fd50e8c17fc2d4d7a.svg",
        },
        "경계": {
            cssClass: "warning",
            dotImg: "./assets/41835b7ef08121b1457c6ec0f844fd99834b0c30.svg",
            rowDotImg: "./assets/3fad991e559f2aab32ceaec0ccd8f0c1dc56e6db.svg",
        },
        "주의": {
            cssClass: "caution",
            dotImg: "./assets/6c6aaa9c177c588d408997943b32c4740898a829.svg",
            rowDotImg: "./assets/d107558bfde3ce070c5fff37e7bfc41300f0a6d6.svg",
        },
        "정상": {
            cssClass: "normal",
            dotImg: "./assets/9f1ad830ab21c2b805c4cdb15123f5cd40f87791.svg",
            rowDotImg: "./assets/282c62b57f173f0c5886bbbd35d43cf04cdf9a86.svg",
        },
    },
};

// ======================
// STATE
// ======================

this._selectedRowIndex = null;
this._eventsData = null;
this._columnsData = null;
this._collapsed = false;
this._internalHandlers = {};
this._activeFilters = new Set();

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this.selectRow = selectRow.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    TBD_topicName: ["renderData"],
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each((fn) => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        ".eb-row": "@TBD_rowClicked",
        ".eb-btn-delete": "@TBD_deleteClicked",
        ".eb-btn-reset": "@TBD_resetClicked",
    },
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            TBD_summary: { "심각": 23, "경계": 10, "주의": 8, "정상": 216 },
            TBD_columns: [
                { key: "level", label: "등급", width: 122 },
                { key: "group", label: "업무그룹", width: 135 },
                { key: "task", label: "업무명", width: 135 },
                { key: "host", label: "호스트명", width: 135 },
                { key: "time", label: "발생시간", width: 165 },
                { key: "solution", label: "솔루션", width: 135 },
                { key: "area", label: "영역", width: 135 },
                { key: "content", label: "내용" },
            ],
            TBD_events: [
                { TBD_level: "심각", TBD_group: "인프라", TBD_task: "DB모니터링", TBD_host: "DB-SVR-01", TBD_time: "2025-03-17 09:33:00", TBD_solution: "Scouter", TBD_area: "데이터센터", TBD_content: "CPU 사용률 95% 초과" },
                { TBD_level: "심각", TBD_group: "네트워크", TBD_task: "방화벽관리", TBD_host: "FW-CORE-02", TBD_time: "2025-03-17 09:31:22", TBD_solution: "SNMP", TBD_area: "IDC-A동", TBD_content: "패킷 드랍률 급증 감지" },
                { TBD_level: "주의", TBD_group: "서버", TBD_task: "WAS관리", TBD_host: "WAS-AP-03", TBD_time: "2025-03-17 09:28:10", TBD_solution: "Jennifer", TBD_area: "클라우드", TBD_content: "힙 메모리 사용률 80% 도달" },
                { TBD_level: "정상", TBD_group: "스토리지", TBD_task: "백업관리", TBD_host: "NAS-BK-01", TBD_time: "2025-03-17 09:25:00", TBD_solution: "NetBackup", TBD_area: "백업센터", TBD_content: "일일 백업 정상 완료" },
                { TBD_level: "정상", TBD_group: "보안", TBD_task: "IDS관리", TBD_host: "IDS-GW-01", TBD_time: "2025-03-17 09:20:15", TBD_solution: "Snort", TBD_area: "DMZ", TBD_content: "정기 패턴 업데이트 완료" },
                { TBD_level: "경계", TBD_group: "인프라", TBD_task: "전력관리", TBD_host: "UPS-MAIN-01", TBD_time: "2025-03-17 09:15:30", TBD_solution: "PowerMon", TBD_area: "전기실", TBD_content: "배터리 잔량 40% 이하 경보" },
                { TBD_level: "심각", TBD_group: "네트워크", TBD_task: "스위치관리", TBD_host: "SW-DIST-05", TBD_time: "2025-03-17 09:10:00", TBD_solution: "SNMP", TBD_area: "IDC-B동", TBD_content: "포트 CRC 에러 급증" },
                { TBD_level: "주의", TBD_group: "서버", TBD_task: "OS관리", TBD_host: "LNX-WEB-12", TBD_time: "2025-03-17 09:05:44", TBD_solution: "Zabbix", TBD_area: "클라우드", TBD_content: "디스크 사용률 75% 도달" },
            ],
        },
    },
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 서머리 배지
    const summary = data[config.summaryKey];
    if (summary) {
        renderSummary.call(this, config, summary);
    }

    // 테이블 헤더
    const columns = data[config.columnsKey];
    if (columns && Array.isArray(columns)) {
        this._columnsData = columns;
        renderTableHeader.call(this, config, columns);
    }

    // 이벤트 행
    const events = data[config.eventsKey];
    if (events && Array.isArray(events)) {
        this._eventsData = events;
        this._selectedRowIndex = null;
        applyFilter.call(this, config);
    }
}

function renderSummary(config, summary) {
    const container = this.appendElement.querySelector(".eb-status-group");
    if (!container) return;
    container.innerHTML = "";

    fx.go(
        config.summaryOrder,
        fx.each((level) => {
            const count = summary[level] ?? 0;
            const meta = config.summaryMeta[level];
            const badge = document.createElement("div");
            badge.className = `eb-status-badge badge-${meta.cssClass}`;
            badge.dataset.level = level;
            badge.innerHTML = `
                <div class="eb-badge-block">
                    <div class="eb-badge-box">
                        <div class="eb-badge-label-group">
                            <div class="eb-status-dot dot-${meta.cssClass}">
                                <img src="${meta.dotImg}" alt="">
                                <div class="eb-dot-stroke stroke-${meta.cssClass}"></div>
                            </div>
                            <span class="eb-badge-name">${level}</span>
                        </div>
                        <div class="eb-badge-divider divider-${meta.cssClass}"></div>
                    </div>
                    <span class="eb-badge-count">${count}</span>
                </div>
            `;
            container.appendChild(badge);
        })
    );
}

function renderTableHeader(config, columns) {
    const headerEl = this.appendElement.querySelector(".eb-table-header");
    if (!headerEl) return;
    headerEl.innerHTML = "";

    fx.go(
        columns,
        fx.each((col, i) => {
            const th = document.createElement("div");
            th.className = "eb-th";
            if (col.width) {
                th.style.width = col.width + "px";
            } else {
                th.style.flex = "1 0 0";
                th.style.minWidth = "0";
            }
            th.textContent = col.label;
            headerEl.appendChild(th);
        })
    );
}

function renderRows(config, events) {
    const bodyEl = this.appendElement.querySelector(".eb-table-body");
    if (!bodyEl) return;
    bodyEl.innerHTML = "";

    events.forEach((event, index) => {
        const row = createRow.call(this, config, event, index);
        bodyEl.appendChild(row);
    });
}

function createRow(config, event, index) {
    const { eventFields, summaryMeta } = config;
    const level = event[eventFields.level] || "정상";
    const meta = summaryMeta[level] || summaryMeta["정상"];
    const isSelected = this._selectedRowIndex === index;

    const row = document.createElement("div");
    row.className = "eb-row";
    row.dataset.index = index;
    row._eventData = event;
    if (isSelected) row.classList.add("eb-row-active");

    // 등급 셀 (status dot + label)
    const levelCell = document.createElement("div");
    levelCell.className = "eb-cell eb-cell-status";
    levelCell.style.width = "122px";
    levelCell.innerHTML = `
        <div class="eb-row-status-group">
            <div class="eb-row-dot dot-${meta.cssClass}">
                <img src="${meta.rowDotImg}" alt="">
                <div class="eb-dot-stroke stroke-${meta.cssClass}"></div>
            </div>
            <span class="eb-row-status-label${isSelected ? " active-text" : ""}">${level}</span>
        </div>
    `;
    row.appendChild(levelCell);

    // 나머지 컬럼
    const fieldOrder = ["group", "task", "host", "time", "solution", "area", "content"];
    const columns = this._columnsData || [];

    fx.go(
        fieldOrder,
        fx.each((field) => {
            const col = columns.find((c) => c.key === field);
            const value = event[eventFields[field]] || "-";
            const cell = document.createElement("div");
            cell.className = "eb-cell";

            if (col && col.width) {
                cell.style.width = col.width + "px";
            } else {
                cell.className += " eb-cell-flex";
            }

            const span = document.createElement("span");
            span.textContent = value;
            if (isSelected) span.classList.add("active-text");
            cell.appendChild(span);
            row.appendChild(cell);
        })
    );

    return row;
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    // 행 클릭 → 선택
    this._internalHandlers.rowClick = (e) => {
        const row = e.target.closest(".eb-row");
        if (!row) return;
        const index = parseInt(row.dataset.index, 10);
        this.selectRow(index);
    };

    // 배지 클릭 → 필터 토글
    this._internalHandlers.filterClick = (e) => {
        const badge = e.target.closest(".eb-status-badge[data-level]");
        if (!badge) return;
        const level = badge.dataset.level;
        if (this._activeFilters.has(level)) {
            this._activeFilters.delete(level);
        } else {
            this._activeFilters.add(level);
        }
        this._selectedRowIndex = null;
        updateFilterUI.call(this);
        applyFilter.call(this, config);
    };

    // 초기화 버튼
    this._internalHandlers.resetClick = (e) => {
        const btn = e.target.closest('.eb-btn-reset');
        if (!btn) return;
        this._activeFilters.clear();
        this._selectedRowIndex = null;
        updateFilterUI.call(this);
        applyFilter.call(this, config);
    };

    // 삭제 버튼
    this._internalHandlers.deleteClick = (e) => {
        const btn = e.target.closest('.eb-btn-delete');
        if (!btn || this._selectedRowIndex === null || !this._eventsData) return;

        // 필터 적용된 리스트에서 해당 이벤트 찾기
        const filteredEvents = getFilteredEvents.call(this, config);
        const targetEvent = filteredEvents[this._selectedRowIndex];
        if (targetEvent) {
            const realIndex = this._eventsData.indexOf(targetEvent);
            if (realIndex !== -1) {
                this._eventsData.splice(realIndex, 1);
            }
        }
        this._selectedRowIndex = null;
        // 서머리 카운트 갱신
        updateSummaryCounts.call(this, config);
        applyFilter.call(this, config);
    };

    // 접기/펼치기 (arrow-up = 접기, arrow-down = 펼치기)
    this._internalHandlers.collapseClick = (e) => {
        const arrowBtn = e.target.closest(".eb-arrow-btn");
        if (!arrowBtn) return;
        const action = arrowBtn.dataset.action;

        const tableHeader = root.querySelector(".eb-table-header");
        const tableBody = root.querySelector(".eb-table-body");

        if (action === "arrow-up" && !this._collapsed) {
            this._collapsed = true;
            if (tableHeader) tableHeader.style.display = "none";
            if (tableBody) tableBody.style.display = "none";
            root.classList.add("eb-collapsed");
        } else if (action === "arrow-down" && this._collapsed) {
            this._collapsed = false;
            if (tableHeader) tableHeader.style.display = "";
            if (tableBody) tableBody.style.display = "";
            root.classList.remove("eb-collapsed");
        }
    };

    root.addEventListener("click", this._internalHandlers.rowClick);
    root.addEventListener("click", this._internalHandlers.filterClick);
    root.addEventListener("click", this._internalHandlers.resetClick);
    root.addEventListener("click", this._internalHandlers.deleteClick);
    root.addEventListener("click", this._internalHandlers.collapseClick);
}

// ======================
// FILTER & SELECT
// ======================

function getFilteredEvents(config) {
    if (!this._eventsData) return [];
    if (this._activeFilters.size === 0) return this._eventsData;
    return this._eventsData.filter(
        (e) => this._activeFilters.has(e[config.eventFields.level])
    );
}

function applyFilter(config) {
    const events = getFilteredEvents.call(this, config);
    renderRows.call(this, config, events);
}

function updateFilterUI() {
    const badges = this.appendElement.querySelectorAll(
        ".eb-status-badge[data-level]"
    );
    const hasFilter = this._activeFilters.size > 0;
    badges.forEach((badge) => {
        const level = badge.dataset.level;
        badge.classList.toggle(
            "filter-active",
            this._activeFilters.has(level)
        );
        badge.classList.toggle(
            "filter-inactive",
            hasFilter && !this._activeFilters.has(level)
        );
    });
}

function updateSummaryCounts(config) {
    if (!this._eventsData) return;
    const counts = {};
    config.summaryOrder.forEach((level) => (counts[level] = 0));
    this._eventsData.forEach((e) => {
        const level = e[config.eventFields.level];
        if (counts[level] !== undefined) counts[level]++;
    });

    const badges = this.appendElement.querySelectorAll(
        ".eb-status-badge[data-level]"
    );
    badges.forEach((badge) => {
        const level = badge.dataset.level;
        const countEl = badge.querySelector(".eb-badge-count");
        if (countEl && counts[level] !== undefined) {
            countEl.textContent = counts[level];
        }
    });
}

function selectRow(config, index) {
    this._selectedRowIndex = index;
    applyFilter.call(this, config);
}
