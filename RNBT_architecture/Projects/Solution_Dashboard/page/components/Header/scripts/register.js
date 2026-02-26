const { bindEvents } = Wkit;

initComponent.call(this);

function initComponent() {
    // ── 1. CONFIG ──
    this._config = {
        logo: { symbolText: 'E', logoText: 'eCOBIT' },
        navItems: [
            { label: '상면관리', active: true },
            { label: '설비현황' },
            { label: '대응절차' },
            { label: '모의훈련' },
            { label: '이력관리' },
        ],
        toggleItems: [
            { label: '대시보드', active: true },
            { label: '리포트' },
        ],
        circleButtons: [
            { id: 'settings', active: true },
            { id: 'user', active: false },
            { id: 'logout', active: false },
        ],
        datetime: { visible: true },
    };

    this._datetimeIntervalId = null;

    // ── 2. BIND HELPERS ──
    this.renderLogo         = renderLogo.bind(this);
    this.renderNav          = renderNav.bind(this);
    this.renderToggle       = renderToggle.bind(this);
    this.renderCircleButtons = renderCircleButtons.bind(this);
    this.startDatetime      = startDatetime.bind(this);
    this.stopDatetime       = stopDatetime.bind(this);

    // Public API
    this.setConfig        = setConfig.bind(this);
    this.setActiveNav     = setActiveNav.bind(this);
    this.setActiveToggle  = setActiveToggle.bind(this);
    this.setButtonState   = setButtonState.bind(this);

    // ── 3. CUSTOM EVENTS (페이지에 알림) ──
    this.customEvents = {
        click: {
            '.gnb-link':   '@headerNavClicked',
            '.btn-type-a': '@headerToggleClicked',
            '.btn-type-b': '@headerButtonClicked',
        },
    };
    bindEvents(this, this.customEvents);

    // ── 4. INTERNAL HANDLERS (내부 UI 상태 전환) ──
    const root = this.appendElement;

    this._internalHandlers = {
        gnbClick: function (e) {
            const link = e.target.closest('.gnb-link');
            if (!link) return;
            const idx = Number(link.dataset.index);
            if (isNaN(idx)) return;
            this.setActiveNav(idx);
        }.bind(this),

        toggleClick: function (e) {
            const btn = e.target.closest('.btn-type-a');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (isNaN(idx)) return;
            this.setActiveToggle(idx);
        }.bind(this),
    };

    root.querySelector('.gnb-inner').addEventListener('click', this._internalHandlers.gnbClick);
    root.querySelector('.toggle').addEventListener('click', this._internalHandlers.toggleClick);

    // ── 5. INITIAL RENDER ──
    this.renderLogo();
    this.renderNav();
    this.renderToggle();
    this.renderCircleButtons();
    this.startDatetime();
}

// ═══════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════

function renderLogo() {
    var root = this.appendElement;
    var cfg  = this._config.logo;
    root.querySelector('.logo-symbol-text').textContent = cfg.symbolText;
    root.querySelector('.logo-text').textContent        = cfg.logoText;
}

function renderNav() {
    var root  = this.appendElement;
    var items = this._config.navItems;
    var gnbInner = root.querySelector('.gnb-inner');

    var html = '';
    for (var i = 0; i < items.length; i++) {
        var item     = items[i];
        var isActive = !!item.active;
        var tag      = isActive ? 'button' : 'div';
        var cls      = 'gnb-link' + (isActive ? ' gnb-link--active' : '');
        var textCls  = 'gnb-link-text' + (isActive ? ' gnb-link-text--active' : '');

        html += '<' + tag + ' class="' + cls + '" data-index="' + i + '">';
        html += '<span class="' + textCls + '">' + item.label + '</span>';
        if (isActive) {
            html += '<div class="gnb-link-frame">'
                  + '<img src="assets/gnb-active-frame.svg" alt="">'
                  + '</div>';
        }
        html += '</' + tag + '>';
    }
    gnbInner.innerHTML = html;
}

function renderToggle() {
    var root  = this.appendElement;
    var items = this._config.toggleItems;
    var toggle = root.querySelector('.toggle');

    var html = '';
    for (var i = 0; i < items.length; i++) {
        var item     = items[i];
        var isActive = !!item.active;
        var stateCls = isActive ? 'btn-type-a--active' : 'btn-type-a--idle';

        html += '<div class="btn-type-a ' + stateCls + '" data-index="' + i + '">';
        html += '<span class="btn-type-a-text">' + item.label + '</span>';
        html += '</div>';
    }
    toggle.innerHTML = html;
}

function renderCircleButtons() {
    var root  = this.appendElement;
    var items = this._config.circleButtons;
    var wrap  = root.querySelector('.btn-items');

    var html = '';
    for (var i = 0; i < items.length; i++) {
        var item     = items[i];
        var isActive = !!item.active;
        var tag      = isActive ? 'button' : 'div';
        var stateCls = isActive ? 'btn-type-b--active' : 'btn-type-b--idle';
        var iconSrc  = isActive ? 'assets/btn-icon-active.svg' : 'assets/btn-icon-idle.svg';

        html += '<' + tag + ' class="btn-type-b ' + stateCls + '" data-id="' + item.id + '">';
        html += '<div class="btn-icon">';
        html += '<div class="btn-icon-inner">';
        html += '<img src="' + iconSrc + '" alt="">';
        html += '</div></div>';
        html += '</' + tag + '>';
    }
    wrap.innerHTML = html;
}

// ═══════════════════════════════════════════════
// DATETIME
// ═══════════════════════════════════════════════

function startDatetime() {
    if (!this._config.datetime.visible) return;
    var root = this.appendElement;

    function update() {
        var now = new Date();
        var h   = now.getHours();
        var m   = now.getMinutes();
        var s   = now.getSeconds();
        var timeStr = h + '시 ' + String(m).padStart(2, '0') + '분 ' + String(s).padStart(2, '0') + '초';

        var y   = now.getFullYear();
        var mon = String(now.getMonth() + 1).padStart(2, '0');
        var d   = String(now.getDate()).padStart(2, '0');
        var dateStr = y + '.' + mon + '.' + d;

        root.querySelector('.datetime-time').textContent = timeStr;
        root.querySelector('.datetime-date').textContent = dateStr;
    }

    update();
    this._datetimeIntervalId = setInterval(update, 1000);
}

function stopDatetime() {
    if (this._datetimeIntervalId != null) {
        clearInterval(this._datetimeIntervalId);
        this._datetimeIntervalId = null;
    }
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

function setConfig(partialConfig) {
    if (partialConfig.logo) {
        Object.assign(this._config.logo, partialConfig.logo);
        this.renderLogo();
    }
    if (partialConfig.navItems) {
        this._config.navItems = partialConfig.navItems;
        this.renderNav();
    }
    if (partialConfig.toggleItems) {
        this._config.toggleItems = partialConfig.toggleItems;
        this.renderToggle();
    }
    if (partialConfig.circleButtons) {
        this._config.circleButtons = partialConfig.circleButtons;
        this.renderCircleButtons();
    }
    if (partialConfig.datetime) {
        Object.assign(this._config.datetime, partialConfig.datetime);
        this.stopDatetime();
        if (this._config.datetime.visible) {
            this.startDatetime();
        }
    }
}

function setActiveNav(index) {
    var items = this._config.navItems;
    for (var i = 0; i < items.length; i++) {
        items[i].active = (i === index);
    }
    this.renderNav();
}

function setActiveToggle(index) {
    var items = this._config.toggleItems;
    for (var i = 0; i < items.length; i++) {
        items[i].active = (i === index);
    }
    this.renderToggle();
}

function setButtonState(id, active) {
    var items = this._config.circleButtons;
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            items[i].active = active;
            break;
        }
    }
    this.renderCircleButtons();
}
