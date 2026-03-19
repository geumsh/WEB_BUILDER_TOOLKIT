/*
 * CelltrionKpiSection Component - register
 * 셀트리온 자동화 창고 KPI 카드 섹션
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_cardClicked
 *
 * Expected Data Structure:
 * {
 *   cards: [
 *     {
 *       type: "simple",
 *       title: "당일 물동량(처리량)",
 *       value: "15,420", unit: "t",
 *       badge: "+12.5%",
 *       width: "250px"
 *     },
 *     {
 *       type: "flow",
 *       items: [
 *         { title: "입고", value: "500", unit: "t" },
 *         { title: "보관", value: "500", unit: "t" },
 *         { title: "출고", value: "300", unit: "t" }
 *       ]
 *     },
 *     {
 *       type: "simple",
 *       title: "Picking on-time 성능",
 *       value: "98.8", unit: "%",
 *       width: "200px"
 *     },
 *     {
 *       type: "time",
 *       title: "평균 Picking 시간",
 *       items: [
 *         { value: "2", unit: "h" },
 *         { value: "30", unit: "m" }
 *       ],
 *       width: "190px"
 *     },
 *     {
 *       type: "equipment",
 *       title: "설비 가동률",
 *       items: [
 *         { label: "가동", value: "98", unit: "%" },
 *         { label: "대기", value: "1", unit: "%" },
 *         { label: "점검", value: "1", unit: "%" }
 *       ]
 *     },
 *     {
 *       type: "simple",
 *       title: "시간단 처리량 단위 PPH",
 *       value: "200", unit: "UPH",
 *       width: "200px"
 *     },
 *     {
 *       type: "simple",
 *       title: "영상분석 알람수",
 *       value: "3", unit: "건",
 *       alert: true,
 *       width: "180px"
 *     }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// STATE
// ======================

this._cardsData = null;

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
        '.kpi-card': '@TBD_cardClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            cards: [
                { type: 'simple', title: '당일 물동량(처리량)', value: '15,420', unit: 't', badge: '+12.5%', width: '250px' },
                { type: 'flow', items: [
                    { title: '입고', value: '500', unit: 't' },
                    { title: '보관', value: '500', unit: 't' },
                    { title: '출고', value: '300', unit: 't' }
                ]},
                { type: 'simple', title: 'Picking on-time 성능', value: '98.8', unit: '%', width: '200px' },
                { type: 'time', title: '평균 Picking 시간', items: [
                    { value: '2', unit: 'h' },
                    { value: '30', unit: 'm' }
                ], width: '190px' },
                { type: 'equipment', title: '설비 가동률', items: [
                    { label: '가동', value: '98', unit: '%' },
                    { label: '대기', value: '1', unit: '%' },
                    { label: '점검', value: '1', unit: '%' }
                ]},
                { type: 'simple', title: '시간단 처리량 단위 PPH', value: '200', unit: 'UPH', width: '200px' },
                { type: 'simple', title: '영상분석 알람수', value: '3', unit: '건', alert: true, width: '180px' }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData({ response }) {
    const { data } = response;
    if (!data || !data.cards) return;

    this._cardsData = data.cards;
    const container = this.appendElement.querySelector('.kpi-section');
    if (!container) return;
    container.innerHTML = '';

    data.cards.forEach(card => {
        const el = createCard(card);
        container.appendChild(el);
    });
}

function createCard(card) {
    switch (card.type) {
        case 'flow': return createFlowCard(card);
        case 'time': return createTimeCard(card);
        case 'equipment': return createEquipmentCard(card);
        default: return createSimpleCard(card);
    }
}

function createSimpleCard(card) {
    const el = document.createElement('div');
    el.className = `kpi-card${card.alert ? ' kpi-card--alert' : ''}`;
    if (card.width) el.style.width = card.width;

    const titleHtml = card.badge
        ? `<div class="kpi-title-row">
               <p class="kpi-title">${card.title}</p>
               <div class="kpi-badge"><p class="kpi-badge-text">${card.badge}</p></div>
           </div>`
        : `<p class="kpi-title">${card.title}</p>`;

    el.innerHTML = `
        ${titleHtml}
        <div class="kpi-value-row">
            <p class="kpi-value">${card.value}</p>
            <p class="kpi-unit">${card.unit}</p>
        </div>
    `;
    return el;
}

function createFlowCard(card) {
    const el = document.createElement('div');
    el.className = 'kpi-card kpi-card--flow';

    const itemsHtml = card.items.map((item, i) => {
        const divider = i < card.items.length - 1
            ? '<div class="flow-divider"><div class="flow-divider-line"></div></div>'
            : '';
        return `
            <div class="flow-item">
                <p class="kpi-title">${item.title}</p>
                <div class="kpi-value-row">
                    <p class="kpi-value">${item.value}</p>
                    <p class="kpi-unit">${item.unit}</p>
                </div>
            </div>
            ${divider}
        `;
    }).join('');

    el.innerHTML = itemsHtml;
    return el;
}

function createTimeCard(card) {
    const el = document.createElement('div');
    el.className = 'kpi-card';
    if (card.width) el.style.width = card.width;

    const timeItems = card.items.map(item => `
        <div class="kpi-time-item">
            <p class="kpi-value">${item.value}</p>
            <p class="kpi-unit">${item.unit}</p>
        </div>
    `).join('');

    el.innerHTML = `
        <p class="kpi-title">${card.title}</p>
        <div class="kpi-time-row">${timeItems}</div>
    `;
    return el;
}

function createEquipmentCard(card) {
    const el = document.createElement('div');
    el.className = 'kpi-card kpi-card--equipment';

    const groups = card.items.map(item => `
        <div class="equipment-group">
            <div class="equipment-label">
                <p class="equipment-label-text">${item.label}</p>
            </div>
            <div class="kpi-value-row">
                <p class="kpi-value">${item.value}</p>
                <p class="kpi-unit">${item.unit}</p>
            </div>
        </div>
    `).join('');

    el.innerHTML = `
        <p class="kpi-title">${card.title}</p>
        <div class="equipment-row">${groups}</div>
    `;
    return el;
}
