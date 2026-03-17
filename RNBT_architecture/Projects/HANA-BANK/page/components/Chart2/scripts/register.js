/*
 * Chart2 Component - register
 * 시간대별 거래추이 차트 (ECharts 라인 차트 + 탭 전환)
 *
 * Subscribes to: TBD_chart2Data
 * Events: @chart2TabClicked
 *
 * Expected Data Structure:
 * {
 *   TBD_title: "시간대별 거래추이",
 *   TBD_peakDate: "2025/08/05",
 *   TBD_timestamps: ["00", "02", "04", ...],
 *   TBD_allTimePeak: [1600, 1400, ...],
 *   TBD_yearPeak: [900, 850, ...],
 *   TBD_monthPeak: [400, 380, ...],
 *   TBD_yesterday: [300, 280, ...],
 *   TBD_today: [100, 120, ...],
 *   activeTab: "all"
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
    peakDateKey: 'TBD_peakDate',
    chart: {
        xKey: 'TBD_timestamps',
        series: [
            { yKey: 'TBD_allTimePeak', name: '역대픽', color: '#f43031' },
            { yKey: 'TBD_yearPeak', name: '연중최고픽', color: '#5bdcc6' },
            { yKey: 'TBD_monthPeak', name: '월픽', color: '#00cded' },
            { yKey: 'TBD_yesterday', name: '전일', color: '#8b7cf6' },
            { yKey: 'TBD_today', name: '금일', color: '#ffaa00' },
        ],
        yAxis: { min: 0, max: 1800, interval: 600 },
    },
};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this._activeTab = null;
this._internalHandlers = {};
this.chartInstance = null;
this.resizeObserver = null;

// ======================
// CHART INIT
// ======================

const chartContainer = this.appendElement.querySelector('.chart-container');
this.chartInstance = echarts.init(chartContainer);

this.resizeObserver = new ResizeObserver(() => {
    this.chartInstance && this.chartInstance.resize();
});
this.resizeObserver.observe(chartContainer);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    // TBD_chart2Data: ['renderData']
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
        '.btn': '@chart2TabClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

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

    const peakDate = data[config.peakDateKey];
    if (peakDate) {
        const dateEl = this.appendElement.querySelector('.date-value');
        if (dateEl) dateEl.textContent = peakDate;
    }

    const { activeTab } = data;
    if (activeTab) {
        this._activeTab = activeTab;
        updateActiveTab.call(this, activeTab);
    }

    renderChart.call(this, config, data);
}

function renderChart(config, data) {
    if (!this.chartInstance) return;

    const xData = data[config.chart.xKey];
    if (!xData) return;

    const series = go(
        config.chart.series,
        fx.map(s => ({
            name: s.name,
            type: 'line',
            data: data[s.yKey] || [],
            smooth: false,
            symbol: 'none',
            lineStyle: { color: s.color, width: 1.5 },
            itemStyle: { color: s.color },
        }))
    );

    const option = {
        grid: {
            top: 5,
            right: 5,
            bottom: 25,
            left: 40,
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 145, 120, 0.2)',
            borderColor: 'transparent',
            textStyle: {
                fontFamily: 'Pretendard',
                fontSize: 13,
                fontWeight: 600,
                color: '#ffffff',
            },
            axisPointer: {
                type: 'line',
                lineStyle: { color: 'rgba(0, 145, 120, 0.5)', width: 2 },
            },
        },
        xAxis: {
            type: 'category',
            data: xData,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                fontFamily: 'Pretendard',
                fontSize: 12,
                color: '#cccccc',
            },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            min: config.chart.yAxis.min,
            max: config.chart.yAxis.max,
            interval: config.chart.yAxis.interval,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                fontFamily: 'Pretendard',
                fontSize: 12,
                color: '#cccccc',
                formatter: value => value.toLocaleString(),
            },
            splitLine: {
                lineStyle: { color: 'rgba(255, 255, 255, 0.08)', type: 'dashed' },
            },
        },
        series: series,
    };

    this.chartInstance.setOption(option, true);
}

function updateActiveTab(activeTab) {
    const buttons = this.appendElement.querySelectorAll('.btn');
    go(
        Array.from(buttons),
        each(btn => {
            btn.classList.toggle('active', btn.dataset.tab === activeTab);
        })
    );
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.tabClick = (e) => {
        const btn = e.target.closest('.btn');
        if (!btn || !btn.dataset.tab) return;

        const tab = btn.dataset.tab;
        if (this._activeTab === tab) return;

        this._activeTab = tab;
        updateActiveTab.call(this, tab);
    };

    root.addEventListener('click', this._internalHandlers.tabClick);
}
