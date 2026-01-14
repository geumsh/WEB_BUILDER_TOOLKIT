/**
 * Cube3DSymbol Component - register
 * Subscribes to: TBD_topicName
 *
 * 서버 상태에 따라 SVG 아이콘 색상 변경
 * - green: 정상
 * - yellow: 경고
 * - red: 위험
 *
 * ServerIcon2 방식: CSS selector + data-status 속성으로 색상 제어
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    validStatuses: ['green', 'yellow', 'red'],
    defaultStatus: 'green',
    statusKey: 'TBD_status'  // API 필드명
};

// ======================
// STATE
// ======================

this._currentStatus = config.defaultStatus;

// ======================
// BINDINGS
// ======================

this.setStatus = setStatus.bind(this, config);
this.updateFromData = updateFromData.bind(this, config);
this.getStatus = getStatus.bind(this);
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
// CUSTOM EVENTS
// ======================

this.customEvents = {
    click: {
        '.symbol-container': '@TBD_symbolClicked'
    }
};

bindEvents(this, this.customEvents);

console.log('[Cube3DSymbol] Registered');

// ======================
// STATUS FUNCTIONS
// ======================

/**
 * 상태 변경 - data-status 속성만 변경
 * @param {Object} config - 설정
 * @param {string} status - 'green' | 'yellow' | 'red'
 */
function setStatus(config, status) {
    if (!config.validStatuses.includes(status)) {
        console.warn(`[Cube3DSymbol] Invalid status: ${status}`);
        return;
    }

    const container = this.appendElement.querySelector('.symbol-container');
    if (!container) {
        console.warn('[Cube3DSymbol] Symbol container not found');
        return;
    }

    // data-status 속성 변경 → CSS가 색상 제어
    container.dataset.status = status;

    // 내부 상태 업데이트
    this._currentStatus = status;

    console.log(`[Cube3DSymbol] Status changed to: ${status}`);
}

/**
 * 데이터 객체로 상태 변경
 */
function updateFromData(config, data) {
    if (data && data[config.statusKey]) {
        this.setStatus(data[config.statusKey]);
    }
}

/**
 * 현재 상태 반환
 */
function getStatus() {
    return this._currentStatus;
}

/**
 * 구독 데이터 렌더링
 */
function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    this.updateFromData(data);
}
