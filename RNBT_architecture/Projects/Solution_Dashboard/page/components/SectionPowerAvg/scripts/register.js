/*
 * SectionPowerAvg Component - register
 * Subscribes to: powerAvgData
 * Events: (none)
 *
 * 실제 전력 평균 바 차트 컴포넌트
 * 금일/금주 비교 막대그래프 + 평균값 표시
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    maxValue: 800,
    chartHeight: 83,
    barSpacing: 49,
    selectors: {
        value: '.group-value-number',
        xAxis: '.x-axis',
        graph: '.graph'
    },
    series: [
        { key: 'today', className: 'bar--blue' },
        { key: 'week', className: 'bar--green' }
    ]
};

// ======================
// BINDINGS
// ======================

this.renderChart = renderChart.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    powerAvgData: ['renderChart']
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

    const { average, items } = data;
    const { maxValue, chartHeight, barSpacing, selectors, series } = config;

    // 평균값 업데이트
    const valueEl = this.appendElement.querySelector(selectors.value);
    if (valueEl && average != null) {
        valueEl.textContent = average.toFixed(4);
    }

    // X축 라벨 렌더링
    const xAxisEl = this.appendElement.querySelector(selectors.xAxis);
    if (xAxisEl) {
        xAxisEl.innerHTML = '';
        go(
            items,
            each((item, i) => {
                const label = document.createElement('span');
                label.className = 'x-label';
                label.style.left = (i * barSpacing) + 'px';
                label.textContent = item.label;
                xAxisEl.appendChild(label);
            })
        );
    }

    // 바 차트 렌더링
    const graphEl = this.appendElement.querySelector(selectors.graph);
    if (graphEl) {
        graphEl.innerHTML = '';
        go(
            items,
            each((item, i) => {
                const group = document.createElement('div');
                group.className = 'bar-group';
                group.style.left = (i * barSpacing) + 'px';

                let maxBarHeight = 0;
                series.forEach(s => {
                    const h = Math.round((item[s.key] / maxValue) * chartHeight);
                    if (h > maxBarHeight) maxBarHeight = h;
                });
                group.style.top = (chartHeight - maxBarHeight) + 'px';

                series.forEach(s => {
                    const bar = document.createElement('div');
                    bar.className = 'bar ' + s.className;
                    bar.style.height = Math.round((item[s.key] / maxValue) * chartHeight) + 'px';
                    group.appendChild(bar);
                });

                graphEl.appendChild(group);
            })
        );
    }
}
