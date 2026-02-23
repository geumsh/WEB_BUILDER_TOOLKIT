/*
 * Gnb Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @navLinkClicked
 *
 * 네비게이션 바 컴포넌트 (상면관리/설비현황/대응절차/모의훈련/이력관리)
 */

const { bindEvents } = Wkit;

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.nav-link': '@navLinkClicked'
    }
};

bindEvents(this, this.customEvents);
