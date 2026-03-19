/*
 * CelltrionTempHumidity Component - register
 * 셀트리온 구역별 온습도 현황 카드 (ECharts 게이지)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_floorClicked
 *
 * Expected Data Structure:
 * {
 *   average: { value: 92, status: "정상" },
 *   floors: [
 *     { label: "1층", temp: "22.3°C", humidity: "58%", score: "92점(A)", scoreLevel: "normal", progress: 60 },
 *     { label: "2층", temp: "23.5°C", humidity: "61%", score: "89점(A)", scoreLevel: "normal", progress: 59 },
 *     { label: "3층", temp: "24.2°C", humidity: "63%", score: "82점(B)", scoreLevel: "warning", progress: 55 }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._data = null;
this._chart = null;

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this);

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
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.th-legend-group': '@TBD_floorClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// ECHART INIT
// ======================

const chartDom = this.appendElement.querySelector('#th-gauge-chart');
if (chartDom) {
    this._chart = echarts.init(chartDom, null, { renderer: 'canvas' });
}

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            average: { value: 92, status: '정상' },
            floors: [
                { label: '1층', temp: '22.3°C', humidity: '58%', score: '92점(A)', scoreLevel: 'normal', progress: 60 },
                { label: '2층', temp: '23.5°C', humidity: '61%', score: '89점(A)', scoreLevel: 'normal', progress: 59 },
                { label: '3층', temp: '24.2°C', humidity: '63%', score: '82점(B)', scoreLevel: 'warning', progress: 55 }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data) return;
    this._data = data;

    // 게이지 차트
    if (data.average && this._chart) {
        renderGauge.call(this, data.average);
    }

    // 층별 카드
    if (data.floors) {
        renderLegend.call(this, data.floors);
    }
}

function renderGauge(average) {
    const value = average.value;
    const status = average.status;

    const option = {
        series: [{
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            center: ['50%', '55%'],
            radius: '90%',
            min: 0,
            max: 100,
            splitNumber: 10,
            axisLine: {
                lineStyle: {
                    width: 8,
                    color: [
                        [0.3, '#fb2c36'],
                        [0.6, '#fbbf24'],
                        [1, '#39e6c9']
                    ]
                }
            },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: {
                offsetCenter: [0, '-25%'],
                fontSize: 12,
                fontFamily: 'Pretendard',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.7)'
            },
            detail: {
                fontSize: 30,
                fontFamily: 'Pretendard',
                fontWeight: 700,
                offsetCenter: [0, '5%'],
                valueAnimation: true,
                formatter: function(val) {
                    return val + '%';
                },
                color: '#fff',
                rich: {}
            },
            data: [{
                value: value,
                name: '평균지수'
            }]
        },
        {
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            center: ['50%', '55%'],
            radius: '90%',
            min: 0,
            max: 100,
            axisLine: { show: false },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: {
                fontSize: 14,
                fontFamily: 'Pretendard',
                fontWeight: 700,
                offsetCenter: [0, '35%'],
                color: '#39e6c9',
                formatter: function() {
                    return status;
                }
            },
            data: [{ value: 0 }]
        }]
    };

    this._chart.setOption(option);
}

function renderLegend(floors) {
    const container = this.appendElement.querySelector('.th-legend');
    if (!container) return;
    container.innerHTML = '';

    floors.forEach(floor => {
        const isWarning = floor.scoreLevel === 'warning';
        const group = document.createElement('div');
        group.className = `th-legend-group${isWarning ? ' th-legend-group--warning' : ''}`;

        const scoreClass = isWarning ? 'th-legend-value th-legend-value--warning' : 'th-legend-value th-legend-value--normal';
        const barClass = isWarning ? 'th-progress-bar th-progress-bar--warning' : 'th-progress-bar th-progress-bar--normal';

        group.innerHTML = `
            <div class="th-legend-content">
                <div class="th-legend-badge">
                    <p class="th-legend-badge-text">${floor.label}</p>
                </div>
                <div class="th-legend-list">
                    <div class="th-legend-item">
                        <p class="th-legend-label">온도</p>
                        <p class="th-legend-value">${floor.temp}</p>
                    </div>
                    <div class="th-legend-item">
                        <p class="th-legend-label">습도</p>
                        <p class="th-legend-value">${floor.humidity}</p>
                    </div>
                    <div class="th-legend-item">
                        <p class="th-legend-label">지수</p>
                        <p class="${scoreClass}">${floor.score}</p>
                    </div>
                </div>
            </div>
            <div class="th-progress-track">
                <div class="${barClass}" style="width: ${floor.progress}px;"></div>
            </div>
        `;

        container.appendChild(group);
    });
}
