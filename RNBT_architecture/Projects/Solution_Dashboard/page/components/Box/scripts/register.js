/*
 * Box Component - register
 * Subscribes to: systemStatusData
 * Events: (none)
 *
 * 시스템 상태 목록 컴포넌트
 * 시스템명 + 값/상태 3행 표시
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        systemName: '.system-name',
        valueNumber: '.value-number',
        valueUnit: '.value-unit',
        statusNormal: '.status-normal',
        statusAbnormalSpan: '.status-abnormal span'
    }
};

// ======================
// BINDINGS
// ======================

this.renderStatus = renderStatus.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    systemStatusData: ['renderStatus']
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

function renderStatus(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { items } = data;
    const { selectors } = config;

    // 시스템명 업데이트
    const nameEls = this.appendElement.querySelectorAll(selectors.systemName);
    go(
        nameEls,
        each((el, i) => {
            if (items[i] && items[i].name != null) {
                el.textContent = items[i].name;
            }
        })
    );

    // 값 업데이트 (첫 번째 행: 숫자 값)
    const valueNumberEl = this.appendElement.querySelector(selectors.valueNumber);
    if (valueNumberEl && items[0] && items[0].value != null) {
        valueNumberEl.textContent = items[0].value;
    }

    const valueUnitEl = this.appendElement.querySelector(selectors.valueUnit);
    if (valueUnitEl && items[0] && items[0].unit != null) {
        valueUnitEl.textContent = items[0].unit;
    }

    // 상태 업데이트 (두 번째 행: 정상)
    const statusNormalEl = this.appendElement.querySelector(selectors.statusNormal);
    if (statusNormalEl && items[1] && items[1].status != null) {
        statusNormalEl.textContent = items[1].status;
    }

    // 상태 업데이트 (세 번째 행: 비정상)
    const statusAbnormalEl = this.appendElement.querySelector(selectors.statusAbnormalSpan);
    if (statusAbnormalEl && items[2] && items[2].status != null) {
        statusAbnormalEl.textContent = items[2].status;
    }
}
