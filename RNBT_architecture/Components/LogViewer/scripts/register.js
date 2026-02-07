/*
 * LogViewer Component - register
 * 실시간 로그 뷰어
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_clearClicked, @TBD_scrollToggled
 *
 * Expected Data Structure:
 * {
 *   title: "System Logs",
 *   logs: [
 *     { time: "10:23:45", level: "info", message: "Server started" },
 *     { time: "10:23:46", level: "error", message: "Connection failed" }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG (정적 선언)
// ======================

const config = {
    titleKey: 'TBD_title',
    logsKey: 'TBD_logs',
    logFields: {
        time: 'TBD_time',
        level: 'TBD_level',
        message: 'TBD_message'
    },
    maxLogs: 100
};

// ======================
// STATE
// ======================

this._autoScroll = true;
this._internalHandlers = {};

// ======================
// BINDINGS (바인딩)
// ======================

this.renderData = renderData.bind(this, config);
this.appendLog = appendLog.bind(this, config);
this.clearLogs = clearLogs.bind(this);
this.toggleAutoScroll = toggleAutoScroll.bind(this);

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
        '.btn-clear': '@TBD_clearClicked',
        '.btn-scroll': '@TBD_scrollToggled'
    }
};

bindEvents(this, this.customEvents);

// 내부 이벤트 핸들러
setupInternalHandlers.call(this);

// ======================
// RENDER FUNCTIONS (호이스팅)
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 타이틀
    const titleEl = this.appendElement.querySelector('.log-title');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 로그 목록
    const logs = data[config.logsKey];
    if (logs && Array.isArray(logs)) {
        const listEl = this.appendElement.querySelector('.log-list');
        listEl.innerHTML = '';
        logs.forEach(log => appendLogItem.call(this, config, listEl, log));
        scrollToBottom.call(this);
    }
}

function appendLog(config, response) {
    const { data } = response;
    if (!data) return;

    const listEl = this.appendElement.querySelector('.log-list');
    appendLogItem.call(this, config, listEl, data);

    // maxLogs 초과 시 오래된 로그 제거
    while (listEl.children.length > config.maxLogs) {
        listEl.removeChild(listEl.firstChild);
    }

    scrollToBottom.call(this);
}

function appendLogItem(config, listEl, log) {
    const { logFields } = config;
    const li = document.createElement('li');
    li.className = 'log-item';

    const level = log[logFields.level] || 'info';

    li.innerHTML = `
        <span class="log-time">${log[logFields.time] || '-'}</span>
        <span class="log-level ${level}">${level.toUpperCase()}</span>
        <span class="log-message">${log[logFields.message] || '-'}</span>
    `;

    listEl.appendChild(li);
}

function clearLogs() {
    const listEl = this.appendElement.querySelector('.log-list');
    listEl.innerHTML = '';
}

function toggleAutoScroll() {
    this._autoScroll = !this._autoScroll;
    const btn = this.appendElement.querySelector('.btn-scroll');
    btn.classList.toggle('disabled', !this._autoScroll);
}

function scrollToBottom() {
    if (!this._autoScroll) return;
    const container = this.appendElement.querySelector('.log-container');
    container.scrollTop = container.scrollHeight;
}

function setupInternalHandlers() {
    const root = this.appendElement;

    // 핸들러 참조 저장 (beforeDestroy에서 제거용)
    this._internalHandlers.clearClick = () => this.clearLogs();
    this._internalHandlers.scrollClick = () => this.toggleAutoScroll();

    // 핸들러 바인딩
    root.querySelector('.btn-clear')?.addEventListener('click', this._internalHandlers.clearClick);
    root.querySelector('.btn-scroll')?.addEventListener('click', this._internalHandlers.scrollClick);
}
