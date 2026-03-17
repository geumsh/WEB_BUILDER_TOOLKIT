/*
 * Symbol Component - register
 * 서버/장비 심볼 아이콘 + 라벨 (상태별 아이콘/색상 변경)
 *
 * Subscribes to: TBD_symbolStatus
 *
 * Expected Data Structure:
 * {
 *   label: "빅데이터플랫폼",
 *   status: "normal" | "warning" | "major" | "critical" | "default"
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    labelKey: 'TBD_label',
    statusKey: 'TBD_status',
    unionAssets: {
        normal: './assets/db0bb541496ad4daac7fbfc191b07309f6e784c0.svg',
        warning: './assets/527fde6aa9c4b1a03be02679e3403f4c5da57b5d.svg',
        major: './assets/67bf4741cae12c73fc194f587a95a57fa2e17a80.svg',
        critical: './assets/2f597b6ded00aa587429c059bcbbe8077537e7b5.svg',
    },
};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    // TBD_symbolStatus: ['renderData']
};

go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    // click: {
    //     '.symbol-group': '@symbolClicked'
    // }
};

bindEvents(this, this.customEvents);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    const label = data[config.labelKey];
    const status = data[config.statusKey];

    if (label) {
        const labelEl = this.appendElement.querySelector('.symbol-label-text');
        if (labelEl) labelEl.textContent = label;
    }

    if (status) {
        // Update container status class
        const container = this.appendElement;
        container.className = container.className.replace(/\bstatus-\w+\b/g, '').trim();
        if (status !== 'default') {
            container.classList.add(`status-${status}`);
        }

        // Update union overlay SVG for active statuses
        const unionImg = container.querySelector('.symbol-union-img');
        if (unionImg) {
            unionImg.src = config.unionAssets[status] || '';
        }
    }
}
