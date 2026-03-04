/*
 * ActionButtons Component - register
 * 텍스트 버튼 그룹 (범용 - N개 버튼 지원)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_buttonClicked
 *
 * Expected Data Structure:
 * {
 *   buttons: [
 *     { key: "tempHumidity", label: "온습도현황" },
 *     { key: "tempDist",     label: "온도분포도" },
 *     { key: "powerStatus",  label: "전력현황" }
 *   ],
 *   activeKey: "tempHumidity"   // optional
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    buttonsKey: 'TBD_buttons',
    activeKeyKey: 'TBD_activeKey',
    buttonFields: {
        key: 'TBD_key',
        label: 'TBD_label'
    }
};

// ======================
// STATE
// ======================

this._activeKey = null;
this._buttonsData = null;
this._internalHandlers = {};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);
this.setActive = setActive.bind(this, config);

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
        '.btn-type-a': '@TBD_buttonClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const buttons = data[config.buttonsKey];
    const activeKey = data[config.activeKeyKey];

    if (activeKey !== undefined) {
        this._activeKey = activeKey;
    }

    if (buttons && Array.isArray(buttons)) {
        this._buttonsData = buttons;
        renderButtons.call(this, config, buttons);
    }
}

function renderButtons(config, buttons) {
    const { buttonFields } = config;
    const container = this.appendElement.querySelector('.action-group');
    if (!container) return;
    container.innerHTML = '';

    fx.go(
        buttons,
        fx.each(btn => {
            const key = btn[buttonFields.key] || '';
            const label = btn[buttonFields.label] || '';
            const isActive = key === this._activeKey;

            const el = document.createElement('button');
            el.className = 'btn-type-a';
            if (isActive) el.classList.add('active');
            el.dataset.key = key;

            const span = document.createElement('span');
            span.textContent = label;
            el.appendChild(span);

            container.appendChild(el);
        })
    );
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.btnClick = (e) => {
        const btn = e.target.closest('.btn-type-a');
        if (btn && btn.dataset.key) {
            this.setActive(btn.dataset.key);
        }
    };

    root.addEventListener('click', this._internalHandlers.btnClick);
}

function setActive(config, key) {
    if (this._activeKey === key) return;
    this._activeKey = key;

    const allBtns = this.appendElement.querySelectorAll('.btn-type-a');
    fx.go(
        Array.from(allBtns),
        fx.each(btn => {
            btn.classList.toggle('active', btn.dataset.key === key);
        })
    );
}
