/*
 * BtnTypeA Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @btnTypeAClicked
 *
 * 텍스트 토글 버튼 컴포넌트 (Active/Idle 상태)
 */

const { bindEvents } = Wkit;

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
  click: {
    ".btn-type-a": "@btnTypeAClicked",
  },
};

bindEvents(this, this.customEvents);
