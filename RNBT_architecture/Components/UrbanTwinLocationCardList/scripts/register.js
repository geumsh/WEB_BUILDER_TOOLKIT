/*
 * UrbanTwinLocationCardList Component - register
 * UrbanTwin 위치 카드 리스트 (이미지 + 뱃지 + 정보)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_cardClicked
 *
 * Expected Data Structure:
 * {
 *   locations: [
 *     {
 *       title: "홍대 마젤란21 오피스텔 전광판",
 *       type: "상업시설",
 *       address: "서울 마포구 양화로 175",
 *       image: "./assets/card-img-1.png",
 *       viewCount: 24
 *     }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    locationsKey: 'TBD_locations',
    locationFields: {
        title: 'TBD_title',
        type: 'TBD_type',
        address: 'TBD_address',
        image: 'TBD_image',
        viewCount: 'TBD_viewCount'
    },
    icons: {
        type: './assets/type-icon.svg',
        address: './assets/address-icon.svg',
        eye: './assets/eye-icon.svg'
    }
};

// ======================
// STATE
// ======================

this._locationsData = null;

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
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.card': '@TBD_cardClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            TBD_locations: [
                { TBD_title: '홍대 마젤란21 오피스텔 전광판', TBD_type: '상업시설', TBD_address: '서울 마포구 양화로 175', TBD_image: './assets/card-img-1.png', TBD_viewCount: 24 },
                { TBD_title: '홍대입구 전광판', TBD_type: '상업시설', TBD_address: '서울 마포구 양화로 175', TBD_image: './assets/card-img-1.png', TBD_viewCount: 24 },
                { TBD_title: '신촌역 디지털 보드', TBD_type: '상업시설', TBD_address: '서울 서대문구 신촌로 83', TBD_image: './assets/card-img-1.png', TBD_viewCount: 17 },
                { TBD_title: '잠실역 멀티비전', TBD_type: '상업시설', TBD_address: '서울 송파구 올림픽로 300', TBD_image: './assets/card-img-1.png', TBD_viewCount: 20 },
                { TBD_title: '서초역 광고 타워', TBD_type: '상업시설', TBD_address: '서울 강남구 강남대로 390', TBD_image: './assets/card-img-1.png', TBD_viewCount: 65 },
                { TBD_title: '종로3가 옥외광고', TBD_type: '상업시설', TBD_address: '서울 마포구 양화로 175', TBD_image: './assets/card-img-1.png', TBD_viewCount: 48 },
                { TBD_title: '용산 LED 패널', TBD_type: '상업시설', TBD_address: '서울 마포구 양화로 175', TBD_image: './assets/card-img-1.png', TBD_viewCount: 24 }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const locations = data[config.locationsKey];
    if (locations && Array.isArray(locations)) {
        this._locationsData = locations;
        renderCards.call(this, config, locations);
    }
}

function renderCards(config, locations) {
    const container = this.appendElement.querySelector('.cards-content');
    if (!container) return;
    container.innerHTML = '';

    locations.forEach((location) => {
        const card = createCard(config, location);
        container.appendChild(card);
    });
}

function createCard(config, location) {
    const { locationFields, icons } = config;
    const title = location[locationFields.title] || '';
    const type = location[locationFields.type] || '';
    const address = location[locationFields.address] || '';
    const image = location[locationFields.image] || '';
    const viewCount = location[locationFields.viewCount] || 0;

    const card = document.createElement('div');
    card.className = 'card';
    card._locationData = location;

    card.innerHTML = `
        <div class="card-image">
            <img src="${image}" alt="" />
            <div class="badge">
                <span class="badge-count">${viewCount}</span>
                <img class="badge-icon" src="${icons.eye}" alt="" />
            </div>
        </div>
        <div class="card-info">
            <div class="card-title">${title}</div>
            <div class="card-detail">
                <img class="detail-icon" src="${icons.type}" alt="" />
                <span class="detail-type">${type}</span>
            </div>
            <div class="card-detail">
                <img class="detail-icon" src="${icons.address}" alt="" />
                <span class="detail-address">${address}</span>
            </div>
        </div>
    `;

    return card;
}
