/*
 * Chart2 Component - register
 * 멀티라인 차트 (Active Session 등)
 *
 * Subscribes to: TBD_chart2Data
 *
 * Expected Data Structure:
 * {
 *   TBD_chart2Title: "Active Session(count)",
 *   TBD_chart2BtnLabel: "TableSpace",
 *   TBD_xLabels: ["09:00", "11:00", ..., "07:00"],
 *   TBD_series: [
 *     { name: "DB1", color: "#f44", data: [30, 40, ...] },
 *     { name: "DB2", color: "#3b82f6", data: [35, 38, ...] },
 *     ...
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_chart2Title',
    xLabelsKey: 'TBD_xLabels',
    seriesKey: 'TBD_series',
};

// ======================
// STATE
// ======================

this._chart = null;
this._chartData = null;

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);

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
// ECHART INIT
// ======================

const chartEl = this.appendElement.querySelector('.chart2-area');
if (chartEl && typeof echarts !== 'undefined') {
    this._chart = echarts.init(chartEl, null, { renderer: 'canvas' });
}

// ======================
// MOCK DATA (개발 확인용 - 실제 연동 시 주석 처리)
// ======================

/* @mock-start */
this.renderData({
    response: {
        data: {
            TBD_chart2Title: 'Active Session(count)',
            TBD_xLabels: [
                '09:00', '11:00', '13:00', '15:00', '17:00', '19:00',
                '21:00', '23:00', '01:00', '03:00', '05:00', '07:00',
            ],
            TBD_series: [
                { name: 'CDB1', color: '#ff4455', data: [35, 65, 60, 55, 40, 30, 35, 30, 55, 60, 65, 60] },
                { name: 'CDB2', color: '#3b82f6', data: [30, 35, 40, 38, 35, 40, 35, 30, 25, 28, 30, 28] },
                { name: 'CDB3', color: '#22c55e', data: [25, 20, 15, 10, 8, 20, 45, 15, 10, 12, 15, 18] },
                { name: 'CDB4', color: '#a855f7', data: [12, 10, 15, 12, 10, 18, 15, 12, 10, 12, 15, 12] },
                { name: 'CDB5', color: '#eab308', data: [8, 6, 5, 4, 5, 8, 6, 5, 4, 5, 6, 5] },
            ],
        }
    }
});
/* @mock-end */

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    this._chartData = data;

    const title = data[config.titleKey];
    if (title) {
        const el = this.appendElement.querySelector('.chart2-title-text');
        if (el) el.textContent = title;
    }

    if (this._chart) {
        const option = buildChartOption(
            data[config.xLabelsKey] || [],
            data[config.seriesKey] || []
        );
        this._chart.setOption(option, true);
    }
}

function buildChartOption(xLabels, seriesArr) {
    const series = seriesArr.map(s => ({
        type: 'line',
        name: s.name,
        data: s.data,
        smooth: false,
        symbol: 'none',
        lineStyle: { color: s.color, width: 1.5 },
        itemStyle: { color: s.color },
    }));

    return {
        grid: {
            top: 10,
            right: 15,
            bottom: 25,
            left: 45,
        },
        xAxis: {
            type: 'category',
            data: xLabels,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#cdcfd2',
                fontSize: 12,
                fontFamily: 'Samsung Sharp Sans, sans-serif',
            },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            interval: 20,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#cdcfd2',
                fontSize: 12,
                fontFamily: 'Samsung Sharp Sans, sans-serif',
            },
            splitLine: {
                show: true,
                lineStyle: { color: '#333', type: 'dashed', width: 1 },
            },
        },
        series: series,
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(30,30,30,0.9)',
            borderColor: '#475569',
            textStyle: { color: '#e4ebf6', fontSize: 12 },
        },
    };
}
