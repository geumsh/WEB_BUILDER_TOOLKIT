/*
 * ViewButtons Component - register
 * 원형 아이콘 버튼 그룹 (범용 - N개 버튼 지원)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_buttonClicked
 *
 * Expected Data Structure:
 * {
 *   buttons: [
 *     { key: "system", label: "계통도", icon: "./assets/icon-system.svg" },
 *     { key: "power",  label: "전력도", icon: "./assets/icon-power.svg" },
 *     { key: "floor",  label: "평면도", icon: "./assets/icon-floor.svg" }
 *   ],
 *   activeKey: "system"
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
        label: 'TBD_label',
        icon: 'TBD_icon'
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
        '.view-btn': '@TBD_buttonClicked'
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
    const container = this.appendElement.querySelector('.view-buttons');
    if (!container) return;
    container.innerHTML = '';

    fx.go(
        buttons,
        fx.each(btn => {
            const key = btn[buttonFields.key] || '';
            const label = btn[buttonFields.label] || '';
            const icon = btn[buttonFields.icon] || '';
            const isActive = key === this._activeKey;

            const wrapper = document.createElement('div');
            wrapper.className = `view-btn ${isActive ? 'active' : 'inactive'}`;
            wrapper.dataset.key = key;

            // Tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            const tooltipText = document.createElement('span');
            tooltipText.textContent = label;
            tooltip.appendChild(tooltipText);
            wrapper.appendChild(tooltip);

            // Circle button
            const circle = document.createElement('div');
            circle.className = 'btn-circle';

            const iconWrap = document.createElement('div');
            iconWrap.className = 'btn-icon';
            const iconImg = document.createElement('img');
            iconImg.src = icon;
            iconImg.alt = '';
            iconWrap.appendChild(iconImg);
            circle.appendChild(iconWrap);

            wrapper.appendChild(circle);
            container.appendChild(wrapper);
        })
    );
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.btnClick = (e) => {
        const btn = e.target.closest('.view-btn');
        if (btn && btn.dataset.key) {
            this.setActive(btn.dataset.key);
        }
    };

    root.addEventListener('click', this._internalHandlers.btnClick);
}

function setActive(config, key) {
    if (this._activeKey === key) return;
    this._activeKey = key;

    // 클래스 토글
    const allBtns = this.appendElement.querySelectorAll('.view-btn');
    fx.go(
        Array.from(allBtns),
        fx.each(btn => {
            const isActive = btn.dataset.key === key;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('inactive', !isActive);
        })
    );
}
