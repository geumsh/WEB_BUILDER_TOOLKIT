/*
 * SectionSystemScore Component - register
 * Subscribes to: systemScoreData
 * Events: (none)
 *
 * 시스템 상태 점수 게이지 컴포넌트
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        value: '.chart-value-number'
    }
};

// ======================
// BINDINGS
// ======================

this.renderScore = renderScore.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    systemScoreData: ['renderScore']
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

function renderScore(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { score } = data;
    const { selectors } = config;

    // 점수 업데이트
    const valueEl = this.appendElement.querySelector(selectors.value);
    if (valueEl && score != null) {
        valueEl.textContent = Math.round(score);
    }
}
