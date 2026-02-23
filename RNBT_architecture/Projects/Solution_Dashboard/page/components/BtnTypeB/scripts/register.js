/*
 * BtnTypeB Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @btnTypeBClicked
 *
 * 설정/유저/로그아웃 버튼 그룹 컴포넌트
 */

const { bindEvents } = Wkit;

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.btn': '@btnTypeBClicked'
    }
};

bindEvents(this, this.customEvents);
