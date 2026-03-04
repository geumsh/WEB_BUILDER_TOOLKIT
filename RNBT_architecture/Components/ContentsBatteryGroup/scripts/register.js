/*
 * ContentsBatteryGroup Component - register
 * 도넛 차트 + 배터리 범례
 *
 * Subscribes to: TBD_topicName
 *
 * Expected Data Structure:
 * {
 *   title: "배터리 현황",
 *   groupName: "배터리 그룹1",
 *   datetime: "2026-02-07 15:30",
 *   totalValue: "1,110",
 *   totalUnit: "KW",
 *   items: [
 *     { color: "#ff5c57", name: "아이템01", percentage: "40%" },
 *     { color: "#edbc35", name: "아이템02", percentage: "10%" },
 *     { color: "#445ed9", name: "아이템03", percentage: "10%" }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    groupNameKey: 'TBD_groupName',
    datetimeKey: 'TBD_datetime',
    totalValueKey: 'TBD_totalValue',
    totalUnitKey: 'TBD_totalUnit',
    itemsKey: 'TBD_items',
    itemFields: {
        color: 'TBD_color',
        name: 'TBD_name',
        percentage: 'TBD_percentage'
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

    // 그룹명
    const groupNameEl = this.appendElement.querySelector('.battery-group-name');
    if (groupNameEl && data[config.groupNameKey]) {
        groupNameEl.textContent = data[config.groupNameKey];
    }

    // 날짜/시간
    const datetimeEl = this.appendElement.querySelector('.battery-datetime');
    if (datetimeEl && data[config.datetimeKey]) {
        datetimeEl.textContent = data[config.datetimeKey];
    }

    // 총 값
    const totalNumberEl = this.appendElement.querySelector('.donut-number');
    if (totalNumberEl && data[config.totalValueKey] !== undefined) {
        totalNumberEl.textContent = data[config.totalValueKey];
    }

    // 총 단위
    const totalUnitEl = this.appendElement.querySelector('.donut-unit');
    if (totalUnitEl && data[config.totalUnitKey]) {
        totalUnitEl.textContent = data[config.totalUnitKey];
    }

    // 범례 아이템
    const items = data[config.itemsKey];
    if (items && Array.isArray(items)) {
        const legendEl = this.appendElement.querySelector('.battery-legend');
        legendEl.innerHTML = '';
        items.forEach(item => appendLegendRow.call(this, config, legendEl, item));
    }
}

function appendLegendRow(config, legendEl, item) {
    const { itemFields } = config;
    const row = document.createElement('div');
    row.className = 'battery-legend-row';

    const color = item[itemFields.color] || '#445ed9';
    const name = item[itemFields.name] || '-';
    const percentage = item[itemFields.percentage] || '-';

    row.innerHTML = `
        <div class="battery-legend-item">
            <div class="battery-legend-color" style="background:${color};"></div>
            <span class="battery-legend-text">${name}</span>
        </div>
        <span class="battery-legend-value">${percentage}</span>
    `;

    legendEl.appendChild(row);
}
