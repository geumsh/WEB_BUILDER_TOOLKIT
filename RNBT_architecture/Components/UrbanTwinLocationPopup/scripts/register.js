/*
 * UrbanTwinLocationPopup Component - register
 * UrbanTwin 위치 상세 팝업 (이미지 + 상세정보 + 환경설정 + 체험)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_closeClicked, @TBD_experienceClicked, @TBD_toggleChanged
 *
 * Expected Data Structure:
 * {
 *   title: "홍대입구 전광판",
 *   type: "상업시설",
 *   image: "./assets/popup-image.png",
 *   location: "서울 마포구 양화로 100",
 *   size: "81m ✕ 21m",
 *   schedule: "30초(1일 70회)",
 *   viewpoint: "보행자 / 차량시점 중 선택",
 *   preset: "보행자 / 차량 프리셋 수량 입력"
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    fields: {
        title: 'TBD_title',
        type: 'TBD_type',
        image: 'TBD_image',
        location: 'TBD_location',
        size: 'TBD_size',
        schedule: 'TBD_schedule',
        viewpoint: 'TBD_viewpoint',
        preset: 'TBD_preset'
    }
};

// ======================
// STATE
// ======================

this._internalHandlers = {};

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
        '.btn-close': '@TBD_closeClicked',
        '.btn-experience': '@TBD_experienceClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            TBD_title: '홍대입구 전광판',
            TBD_type: '상업시설',
            TBD_image: './assets/popup-image.png',
            TBD_location: '서울 마포구 양화로 100',
            TBD_size: '81m ✕ 21m',
            TBD_schedule: '30초(1일 70회)',
            TBD_viewpoint: '보행자 / 차량시점 중 선택',
            TBD_preset: '보행자 / 차량 프리셋 수량 입력'
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const root = this.appendElement;
    const { fields } = config;

    // 타이틀
    const titleEl = root.querySelector('.popup-title');
    if (titleEl && data[fields.title]) {
        titleEl.textContent = data[fields.title];
    }

    // 이미지
    const imageEl = root.querySelector('.popup-image');
    if (imageEl && data[fields.image]) {
        imageEl.src = data[fields.image];
    }

    // 타입 뱃지
    const badgeEl = root.querySelector('.badge-text');
    if (badgeEl && data[fields.type]) {
        badgeEl.textContent = data[fields.type];
    }

    // 상세정보
    const fieldMap = {
        location: fields.location,
        size: fields.size,
        schedule: fields.schedule,
        viewpoint: fields.viewpoint,
        preset: fields.preset
    };

    Object.entries(fieldMap).forEach(([field, key]) => {
        const el = root.querySelector(`.info-value[data-field="${field}"]`);
        if (el && data[key]) {
            el.textContent = data[key];
        }
    });
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    // 토글 클릭
    this._internalHandlers.toggleClick = (e) => {
        const toggle = e.target.closest('.toggle-icon');
        if (!toggle) return;
        Weventbus.emit('@TBD_toggleChanged', {});
    };

    root.addEventListener('click', this._internalHandlers.toggleClick);
}
