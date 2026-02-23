/*
 * Page - Throughput Component - register
 * Throughput (Line Chart with 3 series)
 *
 * Subscribes to: throughputData
 * Events: @tabClicked
 *
 * Expected Raw API Data Structure:
 * [
 *   { tm: "08:00", peak_day: 100, month_peak: 150, today: 50 },
 *   { tm: "09:00", peak_day: 120, month_peak: 180, today: 80 },
 *   ...
 * ]
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG (정적 선언)
// ======================

const config = {
    // Raw API 필드 매핑
    xKey: 'tm',             // X축에 사용할 API 필드

    // 시리즈 정의: key는 API 필드명, name은 범례 표시명
    seriesMap: [
        { key: 'peak_day',   name: 'PEAK 데이', color: '#038C8C' },
        { key: 'month_peak', name: '금월 PEAK', color: '#77DEA4' },
        { key: 'today',      name: '금일',      color: '#5BDCC6' }
    ],

    // 시리즈 공통 스타일
    smooth: true,
    symbol: 'none',
    areaStyle: false,       // 순수 라인 차트 (TimeTrendChart와 차이점)

    // Y축 설정
    yAxis: {
        min: 0,
        max: 400,
        interval: 200
    }
};

// ======================
// BINDINGS (커링 + 바인딩)
// ======================

this.renderChart = fx.curry(renderLineData)(config).bind(this);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    throughputData: ['renderChart']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// INITIALIZE ECHARTS
// ======================

const chartContainer = this.appendElement.querySelector('#echarts');
this.chartInstance = echarts.init(chartContainer, null, {
    renderer: 'canvas'
});

// Handle resize with ResizeObserver
this.resizeObserver = new ResizeObserver(() => {
    this.chartInstance && this.chartInstance.resize();
});
this.resizeObserver.observe(chartContainer);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.btn': '@tabClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// RENDER FUNCTION (호이스팅)
// ======================

function renderLineData(config, { response }) {
    const { data } = response;
    if (!data || !data[Symbol.iterator]) return;

    const { xKey, seriesMap, smooth, symbol, areaStyle, yAxis } = config;

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'line',
                lineStyle: { color: 'rgba(0, 145, 120, 0.5)', width: 1.5 }
            },
            backgroundColor: 'rgba(0, 145, 120, 0.2)',
            borderColor: 'transparent',
            padding: [4, 8],
            textStyle: {
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Pretendard, sans-serif'
            },
            extraCssText: 'backdrop-filter: blur(2.5px); border-radius: 11px; box-shadow: 0px 5px 5px rgba(0,0,0,0.25);'
        },
        legend: { show: false },
        grid: { left: 30, right: 5, top: 5, bottom: 25, containLabel: false },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: fx.go(data, fx.map(d => d[xKey])),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12,
                fontFamily: 'Pretendard, sans-serif',
                letterSpacing: -0.24
            },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            min: yAxis.min,
            max: yAxis.max,
            interval: yAxis.interval,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12,
                fontFamily: 'Pretendard, sans-serif',
                letterSpacing: -0.24
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.15)',
                    type: 'dashed'
                }
            }
        },
        series: fx.go(
            seriesMap,
            fx.map(s => ({
                name: s.name,
                type: 'line',
                smooth,
                symbol,
                data: fx.go(data, fx.map(d => d[s.key])),
                itemStyle: { color: s.color },
                lineStyle: { color: s.color, width: 2 },
                areaStyle: areaStyle ? {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: s.color + '80' },
                            { offset: 1, color: s.color + '10' }
                        ]
                    }
                } : undefined
            }))
        )
    };

    try {
        this.chartInstance.setOption(option, { replaceMerge: ['series'] });
    } catch (e) {
        console.error('[Throughput] setOption error:', e);
    }
}
