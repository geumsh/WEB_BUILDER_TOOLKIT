/*
 * CelltrionPalletStatus Component - register
 * 셀트리온 팔레트 현황 카드
 *
 * Subscribes to: TBD_topicName
 * Events: (없음)
 *
 * Expected Data Structure:
 * {
 *   total: { label: "총 팔레트", value: 185, max: 185 },
 *   details: [
 *     { label: "사용 팔레트", value: 30, max: 185 },
 *     { label: "재고 팔레트", value: 10, max: 185 }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._data = null;

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

this.customEvents = {};

bindEvents(this, this.customEvents);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            total: { label: '총 팔레트', value: 185, max: 185 },
            details: [
                { label: '사용 팔레트', value: 30, max: 185 },
                { label: '재고 팔레트', value: 10, max: 185 }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data) return;
    this._data = data;

    // 총 팔레트
    if (data.total) {
        renderTotal.call(this, data.total);
    }

    // 하단 상세
    if (data.details) {
        renderDetails.call(this, data.details, data.total.max);
    }
}

function renderTotal(total) {
    const container = this.appendElement.querySelector('.ps-stat--total');
    if (!container) return;

    container.innerHTML = `
        <div class="ps-stat-row">
            <p class="ps-stat-label">${total.label}</p>
            <p class="ps-stat-value">${total.value}</p>
        </div>
        <div class="ps-progress-track ps-progress-track--full">
            <div class="ps-progress-bar" style="width: 100%;"></div>
        </div>
    `;
}

function renderDetails(details, max) {
    const container = this.appendElement.querySelector('.ps-bottom-row');
    if (!container) return;
    container.innerHTML = '';

    details.forEach(item => {
        const percent = max > 0 ? (item.value / max) * 100 : 0;
        const stat = document.createElement('div');
        stat.className = 'ps-stat';

        stat.innerHTML = `
            <div class="ps-stat-row">
                <p class="ps-stat-label">${item.label}</p>
                <p class="ps-stat-value">${item.value}</p>
            </div>
            <div class="ps-progress-track">
                <div class="ps-progress-bar" style="width: ${percent}%;"></div>
            </div>
        `;

        container.appendChild(stat);
    });
}
