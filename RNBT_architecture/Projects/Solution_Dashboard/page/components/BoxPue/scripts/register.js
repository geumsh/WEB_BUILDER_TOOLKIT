/*
 * BoxPue Component - register
 * Subscribes to: boxPueData
 * Events: (none)
 *
 * PUE 게이지 + 4개 메트릭 카드(전력 사용량, 주요알람, 온도, 습도) 표시 컴포넌트
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        gaugeValue: '.gauge-value',
        cards: '.card',
        cardValue: '.card-value',
        cardUnit: '.card-unit'
    },
    metricKeys: ['power', 'alarm', 'temp', 'humidity']
};

// ======================
// BINDINGS
// ======================

this.renderBoxPue = renderBoxPue.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    boxPueData: ['renderBoxPue']
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

/**
 * @param {Object} config
 * @param {Object} param1
 * @param {Object} param1.response
 * @param {Object} param1.response.data
 * @param {number} param1.response.data.pue - PUE 게이지 값
 * @param {Object} param1.response.data.power - { value, unit }
 * @param {Object} param1.response.data.alarm - { value, unit }
 * @param {Object} param1.response.data.temp - { value, unit }
 * @param {Object} param1.response.data.humidity - { value, unit }
 */
function renderBoxPue(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { selectors, metricKeys } = config;

    // PUE 게이지 값 업데이트
    const gaugeValueEl = this.appendElement.querySelector(selectors.gaugeValue);
    if (gaugeValueEl && data.pue != null) {
        gaugeValueEl.textContent = data.pue;
    }

    // 4개 메트릭 카드 업데이트
    const cards = this.appendElement.querySelectorAll(selectors.cards);
    go(
        metricKeys,
        each((key, i) => {
            const card = cards[i];
            if (!card || !data[key]) return;

            const valueEl = card.querySelector(selectors.cardValue);
            if (valueEl && data[key].value != null) {
                valueEl.textContent = data[key].value;
            }

            const unitEl = card.querySelector(selectors.cardUnit);
            if (unitEl && data[key].unit != null) {
                unitEl.textContent = data[key].unit;
            }
        })
    );
}
