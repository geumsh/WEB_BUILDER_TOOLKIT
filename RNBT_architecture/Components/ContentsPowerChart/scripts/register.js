/*
 * ContentsPowerChart Component - register
 * 실제 전력 평균 바 차트
 *
 * Subscribes to: TBD_topicName
 *
 * Expected Data Structure:
 * {
 *   title: "실제 전력 현황",
 *   chartLabel: "실제 전력 평균",
 *   value: 828.7883,
 *   unit: "KW",
 *   legendItems: [
 *     { color: "blue", text: "금일" },
 *     { color: "green", text: "금주" }
 *   ],
 *   series: [
 *     { values: [560, 120] },  // bar heights (blue, green)
 *     { values: [664, 560] },
 *     ...
 *   ],
 *   xLabels: ["01", "02", "03", ...],
 *   yAxisMax: 800,
 *   yAxisStep: 200
 * }
 */

const { subscribe } = GlobalDataPublisher;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    chartLabelKey: 'TBD_chartLabel',
    valueKey: 'TBD_value',
    unitKey: 'TBD_unit',
    legendItemsKey: 'TBD_legendItems',
    seriesKey: 'TBD_series',
    xLabelsKey: 'TBD_xLabels',
    yAxisMax: 800,
    yAxisStep: 200,
    barMaxHeight: 100,
    barColors: ['blue', 'green']
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

    // 차트 라벨
    const labelEl = this.appendElement.querySelector('.chart-label');
    if (labelEl && data[config.chartLabelKey]) {
        labelEl.textContent = data[config.chartLabelKey];
    }

    // 값
    const numberEl = this.appendElement.querySelector('.value-number');
    if (numberEl && data[config.valueKey] !== undefined) {
        numberEl.textContent = data[config.valueKey];
    }

    // 단위
    const unitEl = this.appendElement.querySelector('.value-unit');
    if (unitEl && data[config.unitKey]) {
        unitEl.textContent = data[config.unitKey];
    }

    // 범례
    const legendItems = data[config.legendItemsKey];
    if (legendItems && Array.isArray(legendItems)) {
        const legendEl = this.appendElement.querySelector('.chart-legend');
        legendEl.innerHTML = '';
        legendItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'legend-item';
            div.innerHTML = `
                <div class="legend-color legend-color--${item.color}"></div>
                <span class="legend-text">${item.text}</span>
            `;
            legendEl.appendChild(div);
        });
    }

    // Y축
    const yMax = data.yAxisMax || config.yAxisMax;
    const yStep = data.yAxisStep || config.yAxisStep;
    const yAxisEl = this.appendElement.querySelector('.chart-y-axis');
    if (yAxisEl) {
        yAxisEl.innerHTML = '';
        for (let v = yMax; v > 0; v -= yStep) {
            const span = document.createElement('span');
            span.className = 'axis-label';
            span.textContent = v;
            yAxisEl.appendChild(span);
        }
        const zeroSpan = document.createElement('span');
        zeroSpan.className = 'axis-label axis-label--zero';
        zeroSpan.textContent = '0';
        yAxisEl.appendChild(zeroSpan);
    }

    // 그리드 라인 (CSS border로 대체 가능, 여기서는 빈 div)
    const gridEl = this.appendElement.querySelector('.chart-grid');
    if (gridEl) {
        const lineCount = yMax / yStep;
        gridEl.innerHTML = '';
        for (let i = 0; i <= lineCount; i++) {
            const line = document.createElement('div');
            line.className = i === 0 ? 'grid-line grid-line--solid' : 'grid-line grid-line--dashed';
            gridEl.appendChild(line);
        }
    }

    // 바 차트
    const series = data[config.seriesKey];
    if (series && Array.isArray(series)) {
        const barsEl = this.appendElement.querySelector('.chart-bars');
        barsEl.innerHTML = '';
        const barMax = config.barMaxHeight;
        series.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'bar-group';
            const values = group.values || [];
            values.forEach((val, i) => {
                const bar = document.createElement('div');
                const color = config.barColors[i] || 'blue';
                bar.className = `bar bar--${color}`;
                const height = Math.min(Math.round((val / yMax) * barMax), barMax);
                bar.style.height = height + 'px';
                groupDiv.appendChild(bar);
            });
            barsEl.appendChild(groupDiv);
        });
    }

    // X축 라벨
    const xLabels = data[config.xLabelsKey];
    if (xLabels && Array.isArray(xLabels)) {
        const xAxisEl = this.appendElement.querySelector('.chart-x-axis');
        xAxisEl.innerHTML = '';
        xLabels.forEach(label => {
            const span = document.createElement('span');
            span.className = 'axis-label-x';
            span.textContent = label;
            xAxisEl.appendChild(span);
        });
    }
}
