/*
 * Chart3 Component - register
 * 백업현황 (ECharts 도넛 차트 + 범례 리스트)
 *
 * Subscribes to: TBD_chart3Data
 *
 * Expected Data Structure:
 * {
 *   TBD_title: "백업현황",
 *   TBD_items: [
 *     { name: "성공", value: 123, color: "#5bdcc6" },
 *     { name: "진행중", value: 1123, color: "#00cded" },
 *     { name: "실패", value: 8, color: "#f43031" }
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
    itemsKey: 'TBD_items',
    defaultColors: ['#5bdcc6', '#00cded', '#f43031'],
};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this.chartInstance = null;
this.resizeObserver = null;

// ======================
// CHART INIT
// ======================

const chartContainer = this.appendElement.querySelector('.pie-chart');
this.chartInstance = echarts.init(chartContainer);

this.resizeObserver = new ResizeObserver(() => {
    this.chartInstance && this.chartInstance.resize();
});
this.resizeObserver.observe(chartContainer);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    // TBD_chart3Data: ['renderData']
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

this.customEvents = {};

bindEvents(this, this.customEvents);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const title = data[config.titleKey];
    if (title) {
        const titleEl = this.appendElement.querySelector('.title-text');
        if (titleEl) titleEl.textContent = title;
    }

    const items = data[config.itemsKey];
    if (items && Array.isArray(items)) {
        renderTotal.call(this, items);
        renderLegendList.call(this, items);
        renderPieChart.call(this, config, items);
    }
}

function renderTotal(items) {
    const total = items.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalEl = this.appendElement.querySelector('.info-total-value');
    if (totalEl) totalEl.textContent = total.toLocaleString();
}

function renderLegendList(items) {
    const listEl = this.appendElement.querySelector('.legend-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    go(
        items,
        each(item => {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `
                <div class="legend-tag">
                    <span class="legend-dot" style="background:${item.color};"></span>
                    <span class="legend-name">${item.name}</span>
                </div>
                <div class="legend-badge">
                    <span class="legend-badge-value">${(item.value || 0).toLocaleString()}</span>
                </div>
            `;
            listEl.appendChild(row);
        })
    );
}

function renderPieChart(config, items) {
    if (!this.chartInstance) return;

    const seriesData = go(
        items,
        fx.map((item, i) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color || config.defaultColors[i] || '#999' },
        }))
    );

    const option = {
        series: [{
            type: 'pie',
            radius: ['55%', '85%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            label: { show: false },
            labelLine: { show: false },
            emphasis: {
                scale: true,
                scaleSize: 5,
            },
            itemStyle: {
                borderColor: 'rgba(0, 0, 0, 0.3)',
                borderWidth: 2,
            },
            data: seriesData,
        }],
        tooltip: {
            trigger: 'item',
            confine: false,
            appendToBody: true,
            backgroundColor: 'rgba(0, 145, 120, 0.2)',
            borderColor: 'transparent',
            textStyle: {
                fontFamily: 'Pretendard',
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
            },
            formatter: '{b}: {c} ({d}%)',
        },
    };

    this.chartInstance.setOption(option, true);
}
