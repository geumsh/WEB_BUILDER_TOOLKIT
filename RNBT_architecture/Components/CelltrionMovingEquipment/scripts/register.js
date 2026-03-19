/*
 * CelltrionMovingEquipment Component - register
 * 셀트리온 이동설비현황 (ECharts 스택 바 차트)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_barClicked
 *
 * Expected Data Structure:
 * {
 *   items: [
 *     { id: "#01", operating: 42, standby: 7, broken: 7 },
 *     { id: "#02", operating: 27, standby: 5, broken: 5 },
 *     { id: "#03", operating: 46, standby: 12, broken: 4 },
 *     { id: "#04", operating: 38, standby: 7, broken: 7 },
 *     { id: "#05", operating: 41, standby: 15, broken: 8 },
 *     { id: "#06", operating: 27, standby: 5, broken: 5 }
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
        '.meq-chart': '@TBD_barClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// ECHART INIT
// ======================

const chartDom = this.appendElement.querySelector('#meq-bar-chart');
if (chartDom) {
    this._chart = echarts.init(chartDom, null, { renderer: 'canvas' });
}

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            items: [
                { id: '#01', operating: 42, standby: 7, broken: 7 },
                { id: '#02', operating: 27, standby: 5, broken: 5 },
                { id: '#03', operating: 46, standby: 12, broken: 4 },
                { id: '#04', operating: 38, standby: 7, broken: 7 },
                { id: '#05', operating: 41, standby: 15, broken: 8 },
                { id: '#06', operating: 27, standby: 5, broken: 5 }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data || !data.items || !this._chart) return;
    this._data = data;

    const categories = data.items.map(item => item.id);
    const operatingData = data.items.map(item => item.operating);
    const standbyData = data.items.map(item => item.standby);
    const brokenData = data.items.map(item => item.broken);

    const option = {
        grid: {
            left: 10,
            right: 10,
            top: 5,
            bottom: 22,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 10,
                fontFamily: 'Arial'
            }
        },
        yAxis: {
            type: 'value',
            show: false
        },
        series: [
            {
                name: '운영',
                type: 'bar',
                stack: 'total',
                data: operatingData,
                itemStyle: {
                    color: '#39e6c9',
                    borderRadius: [0, 0, 6, 6]
                },
                barWidth: 11
            },
            {
                name: '대기',
                type: 'bar',
                stack: 'total',
                data: standbyData,
                itemStyle: {
                    color: '#fdc700',
                    borderRadius: 0
                },
                barWidth: 11
            },
            {
                name: '고장',
                type: 'bar',
                stack: 'total',
                data: brokenData,
                itemStyle: {
                    color: '#fb2c36',
                    borderRadius: [6, 6, 0, 0]
                },
                barWidth: 11
            }
        ],
        backgroundColor: 'transparent'
    };

    this._chart.setOption(option);
}
