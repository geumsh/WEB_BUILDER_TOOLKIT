/*
 * ContentsSystemStatus Component - register
 * 게이지 차트 + 시스템 리스트
 *
 * Subscribes to: TBD_topicName
 *
 * Expected Data Structure:
 * {
 *   title: "시스템 현황",
 *   gaugeLabel: "시스템 상태 점수",
 *   gaugeValue: 92,
 *   gaugeUnit: "%",
 *   systemList: [
 *     { name: "시스템 #01", value: 76, unit: "%", status: "value" },
 *     { name: "시스템 #02", status: "normal" },
 *     { name: "시스템 #03", status: "warning" }
 *   ]
 * }
 *
 * Status types:
 *   "value" - 숫자 값 표시 (value + unit)
 *   "normal" - 정상 텍스트
 *   "warning" - 비정상 텍스트 + 경고 아이콘
 */

const { subscribe } = GlobalDataPublisher;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    gaugeLabelKey: 'TBD_gaugeLabel',
    gaugeValueKey: 'TBD_gaugeValue',
    gaugeUnitKey: 'TBD_gaugeUnit',
    systemListKey: 'TBD_systemList',
    systemFields: {
        name: 'TBD_name',
        value: 'TBD_value',
        unit: 'TBD_unit',
        status: 'TBD_status'
    },
    statusMap: {
        normal: { text: '정상', class: 'normal' },
        warning: { text: '비정상', class: 'warning' }
    }
};

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
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 타이틀
    const titleEl = this.appendElement.querySelector('.contents-title-text');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 게이지 라벨
    const gaugeLabelEl = this.appendElement.querySelector('.gauge-label');
    if (gaugeLabelEl && data[config.gaugeLabelKey]) {
        gaugeLabelEl.textContent = data[config.gaugeLabelKey];
    }

    // 게이지 값
    const gaugeNumberEl = this.appendElement.querySelector('.gauge-number');
    if (gaugeNumberEl && data[config.gaugeValueKey] !== undefined) {
        gaugeNumberEl.textContent = data[config.gaugeValueKey];
    }

    // 게이지 단위
    const gaugeUnitEl = this.appendElement.querySelector('.gauge-unit');
    if (gaugeUnitEl && data[config.gaugeUnitKey]) {
        gaugeUnitEl.textContent = data[config.gaugeUnitKey];
    }

    // 시스템 리스트
    const systemList = data[config.systemListKey];
    if (systemList && Array.isArray(systemList)) {
        const listEl = this.appendElement.querySelector('.system-list');
        listEl.innerHTML = '';
        systemList.forEach(item => appendSystemRow.call(this, config, listEl, item));
    }
}

function appendSystemRow(config, listEl, item) {
    const { systemFields, statusMap } = config;
    const row = document.createElement('div');
    row.className = 'system-list-row';

    const name = item[systemFields.name] || '-';
    const status = item[systemFields.status] || 'normal';

    // 좌측: 아이콘 + 이름
    let leftHtml = `
        <div class="system-group">
            <div class="system-icon-wrap"></div>
            <span class="system-name">${name}</span>
        </div>
    `;

    // 우측: 상태에 따라 다른 표시
    let rightHtml = '';
    if (status === 'value') {
        const value = item[systemFields.value] || '-';
        const unit = item[systemFields.unit] || '';
        rightHtml = `
            <div class="system-value">
                <span class="system-number">${value}</span>
                <span class="system-percent">${unit}</span>
            </div>
        `;
    } else if (status === 'warning') {
        const statusInfo = statusMap[status];
        rightHtml = `
            <div class="system-status-warn">
                <div class="warn-icon"></div>
                <span class="system-status system-status--${statusInfo.class}">${statusInfo.text}</span>
            </div>
        `;
    } else {
        const statusInfo = statusMap[status] || statusMap.normal;
        rightHtml = `<span class="system-status system-status--${statusInfo.class}">${statusInfo.text}</span>`;
    }

    row.innerHTML = leftHtml + rightHtml;
    listEl.appendChild(row);
}
