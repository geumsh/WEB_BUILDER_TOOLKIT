/*
 * Chart Component - register
 * CPU/메모리 사용률 차트 (ECharts 동적)
 *
 * Subscribes to: TBD_chartData
 *
 * Expected Data Structure:
 * {
 *   TBD_chartTitle: "CPU/메모리",
 *   TBD_chartTarget: "[CDB1 운영11]",
 *   TBD_xLabels: ["09:00", "11:00", ..., "07:00"],
 *   TBD_seriesData: [8, 7, 6, 5, 8, 10, 12, 15, 10, 8, 7, 6],
 *   TBD_warningLine: 95,
 *   TBD_infoLine: 20
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_chartTitle',
    targetKey: 'TBD_chartTarget',
    xLabelsKey: 'TBD_xLabels',
    seriesDataKey: 'TBD_seriesData',
    warningLineKey: 'TBD_warningLine',
    infoLineKey: 'TBD_infoLine',
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
    // TBD_chartData: ['renderData']
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

const chartEl = this.appendElement.querySelector('.chart-area');
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
            TBD_chartTitle: 'CPU/메모리',
            TBD_chartTarget: '[CDB1 운영11]',
            TBD_xLabels: [
                '09:00', '11:00', '13:00', '15:00', '17:00', '19:00',
                '21:00', '23:00', '01:00', '03:00', '05:00', '07:00',
            ],
            TBD_seriesData: [8, 7, 6, 5, 5, 8, 12, 15, 10, 8, 7, 6],
            TBD_warningLine: 95,
            TBD_infoLine: 20,
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
    const target = data[config.targetKey];
    if (title) {
        const el = this.appendElement.querySelector('.chart-title-name');
        if (el) el.textContent = title;
    }
    if (target) {
        const el = this.appendElement.querySelector('.chart-title-target');
        if (el) el.textContent = target;
    }

    if (this._chart) {
        const option = buildChartOption(
            data[config.xLabelsKey] || [],
            data[config.seriesDataKey] || [],
            data[config.warningLineKey],
            data[config.infoLineKey]
        );
        this._chart.setOption(option, true);
    }
}

function buildChartOption(xLabels, seriesData, warningLine, infoLine) {
    const markLines = [];
    if (warningLine !== undefined) {
        markLines.push({
            yAxis: warningLine,
            lineStyle: { color: '#e8a838', type: 'dashed', width: 1 },
            label: { show: false },
        });
    }
    if (infoLine !== undefined) {
        markLines.push({
            yAxis: infoLine,
            lineStyle: { color: '#3b82f6', type: 'dashed', width: 1 },
            label: { show: false },
        });
    }

    return {
        grid: {
            top: 10,
            right: 30,
            bottom: 30,
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
        series: [
            {
                type: 'line',
                data: seriesData,
                smooth: false,
                symbol: 'none',
                lineStyle: { color: '#e8a838', width: 1.5 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(232,168,56,0.3)' },
                            { offset: 1, color: 'rgba(232,168,56,0.05)' },
                        ],
                    },
                },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    data: markLines,
                },
            },
        ],
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(30,30,30,0.9)',
            borderColor: '#475569',
            textStyle: { color: '#e4ebf6', fontSize: 12 },
        },
    };
}
