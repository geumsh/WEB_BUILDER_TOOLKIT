/*
 * Header Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @navLinkClicked, @toggleClicked, @headerBtnClicked
 *
 * 대시보드 헤더 네비게이션 컴포넌트
 * - GNB 메뉴 클릭 시 @navLinkClicked 이벤트 발행
 * - 대시보드/리포트 토글 클릭 시 @toggleClicked 이벤트 발행
 * - 아이콘 버튼 클릭 시 @headerBtnClicked 이벤트 발행
 */

const { bindEvents } = Wkit;

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.nav-link': '@navLinkClicked',
        '.toggle-btn': '@toggleClicked',
        '.btn-icon--active': '@headerBtnClicked'
    }
};

bindEvents(this, this.customEvents);
