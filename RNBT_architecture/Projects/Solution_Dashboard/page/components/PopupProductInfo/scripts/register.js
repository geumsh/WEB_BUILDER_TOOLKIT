/*
 * PopupProductInfo Component - register
 * Subscribes to: assetDetailData
 * Events: (none)
 *
 * 자산 상세 정보 테이블 컴포넌트
 * 제품 이미지 + 8행 정보 테이블
 */

const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        image: '.product-image img',
        infoValues: '.info-value'
    },
    fields: [
        'assetName',
        'assetType',
        'usage',
        'manufacturer',
        'model',
        'location',
        'status',
        'installDate'
    ]
};

// ======================
// BINDINGS
// ======================

this.renderInfo = renderInfo.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    assetDetailData: ['renderInfo']
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

function renderInfo(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { selectors, fields } = config;

    // 이미지 업데이트
    const imgEl = this.appendElement.querySelector(selectors.image);
    if (imgEl && data.imageSrc) {
        imgEl.src = data.imageSrc;
    }

    // 테이블 8행 값 업데이트
    const valueEls = this.appendElement.querySelectorAll(selectors.infoValues);
    go(
        fields,
        each((field, i) => {
            if (valueEls[i] && data[field] != null) {
                valueEls[i].textContent = data[field];
            }
        })
    );
}
