/*
 * Chart1 Component - register
 * Throughput 차트 (ECharts 라인 차트 + 탭 전환)
 *
 * Subscribes to: TBD_chart1Data
 * Events: @chart1TabClicked
 *
 * Expected Data Structure:
 * {
 *   TBD_title: "Throughput",
 *   TBD_timestamps: ["08:00", "09:00", ...],
 *   TBD_peakDay: [120, 150, ...],
 *   TBD_monthPeak: [80, 100, ...],
 *   TBD_today: [30, 50, ...],
 *   activeTab: "tab01"
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
    chart: {
        xKey: 'TBD_timestamps',
        series: [
            { yKey: 'TBD_peakDay', name: 'PEAK 데이', color: 'rgba(255, 255, 255, 0.7)' },
            { yKey: 'TBD_monthPeak', name: '금월 PEAK', color: '#5bdcc6' },
            { yKey: 'TBD_today', name: '금일', color: '#00cded' },
        ],
        yAxis: { min: 0, max: 400, interval: 200 },
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
    // TBD_chart1Data: ['renderData']
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
        '.btn': '@chart1TabClicked'
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
            smooth: true,
            symbol: 'none',
            lineStyle: { color: s.color, width: 1.5 },
            itemStyle: { color: s.color },
        }))
    );

    const option = {
        grid: {
            top: 10,
            right: 10,
            bottom: 20,
            left: 35,
        },
        legend: {
            show: true,
            top: 0,
            right: 0,
            itemWidth: 6,
            itemHeight: 6,
            icon: 'circle',
            textStyle: {
                fontFamily: 'Pretendard',
                fontSize: 11,
                fontWeight: 500,
                color: '#eeeeee',
            },
            itemGap: 10,
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
                lineStyle: { color: 'rgba(0, 145, 120, 0.5)', width: 1.5 },
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
                color: 'rgba(255, 255, 255, 0.5)',
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
                color: 'rgba(255, 255, 255, 0.5)',
                letterSpacing: -0.24,
            },
            splitLine: {
                lineStyle: { color: 'rgba(255, 255, 255, 0.08)' },
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
