/*
 * Chart3 Component - register
 * 소형 2라인 차트 + 범례 (Logical Read 등)
 *
 * Subscribes to: TBD_chart3Data
 *
 * Expected Data Structure:
 * {
 *   TBD_chart3Title: "Logical Read(Blocks)",
 *   TBD_xLabels: ["15:00:00", "15:10:00", "15:20:00"],
 *   TBD_series: [
 *     { name: "line1", color: "#0068ff", data: [1.85, 2.0, 1.9, ...] },
 *     { name: "line2", color: "#77dea4", data: [1.81, 1.7, 1.5, ...] },
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_chart3Title',
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
    // TBD_chart3Data: ['renderData']
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

const chartEl = this.appendElement.querySelector('.chart3-area');
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
            TBD_chart3Title: 'Logical Read(Blocks)',
            TBD_xLabels: [
                '15:00', '15:02', '15:04', '15:06', '15:08',
                '15:10', '15:12', '15:14', '15:16', '15:18', '15:20',
            ],
            TBD_series: [
                { name: '1.85', color: '#0068ff', data: [1.3, 1.4, 1.5, 1.7, 1.9, 2.0, 1.95, 1.8, 1.6, 1.4, 1.3] },
                { name: '1.81', color: '#77dea4', data: [1.2, 1.3, 1.3, 1.5, 1.7, 1.8, 1.75, 1.6, 1.4, 1.3, 1.2] },
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
        const el = this.appendElement.querySelector('.chart3-title-text');
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
    const legendData = seriesArr.map(s => ({
        name: s.name,
        itemStyle: { color: s.color },
    }));

    const series = seriesArr.map(s => ({
        type: 'line',
        name: s.name,
        data: s.data,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: s.color, width: 1.5 },
        itemStyle: { color: s.color },
    }));

    return {
        grid: {
            top: 15,
            right: 15,
            bottom: 40,
            left: 35,
        },
        xAxis: {
            type: 'category',
            data: xLabels,
            axisLine: { show: true, lineStyle: { color: '#444' } },
            axisTick: { show: false },
            axisLabel: {
                color: '#cdcfd2',
                fontSize: 9,
                fontFamily: 'Samsung Sharp Sans, sans-serif',
                interval: function (index) {
                    return index === 0 || index === Math.floor(xLabels.length / 2) || index === xLabels.length - 1;
                },
            },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#cdcfd2',
                fontSize: 9,
                fontFamily: 'Samsung Sharp Sans, sans-serif',
            },
            splitLine: {
                show: true,
                lineStyle: { color: '#333', type: 'dashed', width: 1 },
            },
        },
        legend: {
            show: true,
            bottom: 0,
            left: '42.5%',
            itemWidth: 10,
            itemHeight: 2,
            textStyle: {
                color: '#cdcfd2',
                fontSize: 8,
                fontFamily: 'Samsung Sharp Sans, sans-serif',
            },
            data: legendData,
        },
        series: series,
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(30,30,30,0.9)',
            borderColor: '#475569',
            textStyle: { color: '#e4ebf6', fontSize: 10 },
        },
    };
}
