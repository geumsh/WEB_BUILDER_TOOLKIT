/*
 * Popup Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @closeClicked
 *
 * 팝업 프레임 컴포넌트 (타이틀 바 + 닫기 버튼)
 */

const { bindEvents } = Wkit;

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.btn-close': '@closeClicked'
    }
};

bindEvents(this, this.customEvents);
