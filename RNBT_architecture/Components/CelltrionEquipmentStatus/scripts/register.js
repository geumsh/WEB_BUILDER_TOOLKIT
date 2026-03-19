/*
 * CelltrionEquipmentStatus Component - register
 * 셀트리온 설비현황 카드 (ECharts 도넛 게이지 3개)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_gaugeClicked
 *
 * Expected Data Structure:
 * {
 *   gauges: [
 *     { id: "total",     value: 507, max: 600, label: "총 설비수",  type: "설비", color: "#39e6c9" },
 *     { id: "operating", value: 29,  max: 50,  label: "운영 설비수", type: "운영", color: "#2b7fff" },
 *     { id: "broken",    value: 0,   max: 50,  label: "고장 설비수", type: "고장", color: "#fb2c36" }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._data = null;
this._charts = {};

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
        '.eq-chart': '@TBD_gaugeClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// ECHART INIT
// ======================

const chartIds = ['eq-gauge-total', 'eq-gauge-operating', 'eq-gauge-broken'];
chartIds.forEach(id => {
    const dom = this.appendElement.querySelector('#' + id);
    if (dom) {
        this._charts[id] = echarts.init(dom, null, { renderer: 'canvas' });
    }
});

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            gauges: [
                { id: 'total',     value: 507, max: 600, label: '총 설비수',  type: '설비', color: '#39e6c9' },
                { id: 'operating', value: 29,  max: 50,  label: '운영 설비수', type: '운영', color: '#2b7fff' },
                { id: 'broken',    value: 0,   max: 50,  label: '고장 설비수', type: '고장', color: '#fb2c36' }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data || !data.gauges) return;
    this._data = data;

    const chartIdMap = ['eq-gauge-total', 'eq-gauge-operating', 'eq-gauge-broken'];

    data.gauges.forEach((gauge, i) => {
        const chart = this._charts[chartIdMap[i]];
        if (chart) {
            renderGauge(chart, gauge);
        }
    });
}

function renderGauge(chart, gauge) {
    const percent = gauge.max > 0 ? (gauge.value / gauge.max) * 100 : 0;
    const trackColor = 'rgba(255, 255, 255, 0.08)';

    const option = {
        series: [{
            type: 'gauge',
            startAngle: 225,
            endAngle: -45,
            center: ['50%', '50%'],
            radius: '85%',
            min: 0,
            max: 100,
            axisLine: {
                lineStyle: {
                    width: 6,
                    color: [
                        [percent / 100, gauge.color],
                        [1, trackColor]
                    ]
                }
            },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: { show: false },
            data: [{ value: percent }]
        }],
        graphic: [
            {
                type: 'text',
                left: 'center',
                top: '30%',
                style: {
                    text: String(gauge.value),
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'Pretendard',
                    fill: '#fff',
                    textAlign: 'center'
                }
            },
            {
                type: 'text',
                left: 'center',
                top: '50%',
                style: {
                    text: gauge.label,
                    fontSize: 9,
                    fontWeight: 400,
                    fontFamily: 'Pretendard',
                    fill: '#fff',
                    textAlign: 'center'
                }
            },
            {
                type: 'text',
                left: 'center',
                top: '68%',
                style: {
                    text: gauge.type,
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'Pretendard',
                    fill: gauge.color,
                    textAlign: 'center'
                }
            }
        ]
    };

    chart.setOption(option);
}
