/*
 * PopupChart Component - register
 * Subscribes to: chartTimeSeriesData
 * Events: @tabChanged
 *
 * 탭 메뉴 + 라인 차트 컴포넌트
 * 탭 전환 + 시계열 데이터 차트 표시
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    chartArea: {
        width: 421,
        height: 107,
        top: 19.5,
        left: 28
    },
    selectors: {
        tabs: '.tab',
        yLabels: '.y-label',
        xLabels: '.x-label',
        lineSeries1: '.line-series-1',
        lineSeries2: '.line-series-2',
        dot1: '.dot-1',
        dot2: '.dot-2',
        hoverTime: '.hover-time',
        hoverValues: '.hover-value',
        legendLabels: '.legend-item span'
    }
};

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.tab': '@tabChanged'
    }
};

bindEvents(this, this.customEvents);

// ======================
// TAB SWITCH
// ======================

this.switchTab = switchTab.bind(this);

this.bindEventHandlers = {
    '@tabChanged': this.switchTab
};

this.appendElement.addEventListener('@tabChanged', this.switchTab);

function switchTab(e) {
    const clickedTab = e.detail?.event?.target?.closest('.tab');
    if (!clickedTab) return;

    const tabs = this.appendElement.querySelectorAll(config.selectors.tabs);
    go(
        tabs,
        each(tab => {
            tab.classList.remove('tab-active');
            tab.classList.add('tab-idle');
        })
    );

    clickedTab.classList.remove('tab-idle');
    clickedTab.classList.add('tab-active');
}

// ======================
// BINDINGS
// ======================

this.renderChart = renderChart.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    chartTimeSeriesData: ['renderChart']
};

go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// RENDER
// ======================

function renderChart(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { series1, series2, xLabels, yLabels, hoverData, legends } = data;

    // Y축 라벨 업데이트
    if (yLabels) {
        const yLabelEls = this.appendElement.querySelectorAll(config.selectors.yLabels);
        go(
            yLabels,
            each((label, i) => {
                if (yLabelEls[i]) yLabelEls[i].textContent = label;
            })
        );
    }

    // X축 라벨 업데이트
    if (xLabels) {
        const xLabelEls = this.appendElement.querySelectorAll(config.selectors.xLabels);
        go(
            xLabels,
            each((label, i) => {
                if (xLabelEls[i]) xLabelEls[i].textContent = label;
            })
        );
    }

    // 호버 툴팁 업데이트
    if (hoverData) {
        const timeEl = this.appendElement.querySelector(config.selectors.hoverTime);
        if (timeEl) timeEl.textContent = hoverData.time;

        const valueEls = this.appendElement.querySelectorAll(config.selectors.hoverValues);
        if (valueEls[0] && hoverData.value1 != null) valueEls[0].textContent = hoverData.value1;
        if (valueEls[1] && hoverData.value2 != null) valueEls[1].textContent = hoverData.value2;
    }

    // 범례 라벨 업데이트
    if (legends) {
        const legendEls = this.appendElement.querySelectorAll(config.selectors.legendLabels);
        go(
            legends,
            each((label, i) => {
                if (legendEls[i]) legendEls[i].textContent = label;
            })
        );
    }
}
