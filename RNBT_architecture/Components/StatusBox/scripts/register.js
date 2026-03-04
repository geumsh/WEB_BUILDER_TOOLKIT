/*
 * StatusBox Component - register
 * PUE 게이지 + 정보 카드 그리드 (전력, 주요알람, 온도, 습도)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_cardClicked
 *
 * Expected Data Structure:
 * {
 *   gauge: {
 *     title: "PUE",
 *     value: 1.5,
 *     min: 1,
 *     max: 3
 *   },
 *   cards: [
 *     {
 *       key: "power",
 *       label: "전력 사용량",
 *       iconType: "electricity",
 *       arrow: "up",
 *       value: 784,
 *       unit: "KW"
 *     },
 *     {
 *       key: "alarm",
 *       label: "주요알람",
 *       iconType: "alarm",
 *       arrow: null,
 *       value: 5,
 *       unit: "건",
 *       unitFont: "kr"
 *     },
 *     {
 *       key: "temperature",
 *       label: "온도",
 *       iconType: "temperature",
 *       arrow: "up",
 *       value: 24,
 *       unit: "℃"
 *     },
 *     {
 *       key: "humidity",
 *       label: "습도",
 *       iconType: "humidity",
 *       arrow: "down",
 *       value: 46,
 *       unit: "%"
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
    gaugeKey: 'TBD_gauge',
    cardsKey: 'TBD_cards',
    gaugeFields: {
        title: 'TBD_title',
        value: 'TBD_value',
        min: 'TBD_min',
        max: 'TBD_max'
    },
    cardFields: {
        key: 'TBD_key',
        label: 'TBD_label',
        iconType: 'TBD_iconType',
        arrow: 'TBD_arrow',
        value: 'TBD_value',
        unit: 'TBD_unit',
        unitFont: 'TBD_unitFont'
    },
    // 아이콘 타입별 SVG 매핑
    iconMap: {
        electricity: './assets/icon-electricity.svg',
        temperature: './assets/icon-temperature.svg',
        humidity: './assets/icon-humidity.svg',
        alarm: './assets/icon-alarm.svg'
    },
    arrowIcons: {
        up: './assets/icon-arrow-up.svg',
        down: './assets/icon-arrow-down.svg'
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
        '.info-card': '@TBD_cardClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 게이지
    const gauge = data[config.gaugeKey];
    if (gauge) {
        renderGauge.call(this, config, gauge);
    }

    // 카드 그리드
    const cards = data[config.cardsKey];
    if (cards && Array.isArray(cards)) {
        renderCards.call(this, config, cards);
    }
}

function renderGauge(config, gauge) {
    const { gaugeFields } = config;

    const titleEl = this.appendElement.querySelector('.pue-title span');
    if (titleEl && gauge[gaugeFields.title]) {
        titleEl.textContent = gauge[gaugeFields.title];
    }

    const numEl = this.appendElement.querySelector('.gauge-num span');
    if (numEl && gauge[gaugeFields.value] !== undefined) {
        numEl.textContent = gauge[gaugeFields.value];
    }

    const minEl = this.appendElement.querySelector('.gauge-label-left span');
    if (minEl && gauge[gaugeFields.min] !== undefined) {
        minEl.textContent = gauge[gaugeFields.min];
    }

    const maxEl = this.appendElement.querySelector('.gauge-label-right span');
    if (maxEl && gauge[gaugeFields.max] !== undefined) {
        maxEl.textContent = gauge[gaugeFields.max];
    }
}

function renderCards(config, cards) {
    const { cardFields, iconMap, arrowIcons } = config;
    const gridEl = this.appendElement.querySelector('.info-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    fx.go(
        cards,
        fx.each(card => {
            const cardEl = createCard(config, card);
            gridEl.appendChild(cardEl);
        })
    );
}

function createCard(config, card) {
    const { cardFields, iconMap, arrowIcons } = config;

    const iconType = card[cardFields.iconType] || 'electricity';
    const arrow = card[cardFields.arrow];
    const value = card[cardFields.value] ?? '-';
    const unit = card[cardFields.unit] || '';
    const unitFont = card[cardFields.unitFont];
    const label = card[cardFields.label] || '-';
    const key = card[cardFields.key] || '';

    const el = document.createElement('div');
    el.className = 'info-card';
    if (key) el.dataset.key = key;

    // Left: icon + label
    const leftDiv = document.createElement('div');
    leftDiv.className = 'card-left';

    const symbolDiv = document.createElement('div');
    symbolDiv.className = 'symbol';
    const iconWrap = document.createElement('div');
    iconWrap.className = `icon-wrap ${iconType}`;
    const iconImg = document.createElement('img');
    iconImg.src = iconMap[iconType] || iconMap.electricity;
    iconImg.alt = '';
    iconWrap.appendChild(iconImg);
    symbolDiv.appendChild(iconWrap);
    leftDiv.appendChild(symbolDiv);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'card-label';
    labelSpan.textContent = label;
    leftDiv.appendChild(labelSpan);

    el.appendChild(leftDiv);

    // Right: arrow + value + unit
    const rightDiv = document.createElement('div');
    rightDiv.className = 'card-right';

    if (arrow && arrowIcons[arrow]) {
        const arrowImg = document.createElement('img');
        arrowImg.className = 'arrow-icon';
        arrowImg.src = arrowIcons[arrow];
        arrowImg.alt = '';
        rightDiv.appendChild(arrowImg);
    }

    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    valueSpan.textContent = value;
    rightDiv.appendChild(valueSpan);

    const unitSpan = document.createElement('span');
    unitSpan.className = unitFont === 'kr' ? 'unit-kr' : 'unit';
    unitSpan.textContent = unit;
    rightDiv.appendChild(unitSpan);

    el.appendChild(rightDiv);

    return el;
}
