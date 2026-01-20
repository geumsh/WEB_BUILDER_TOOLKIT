/**
 * Page - before_load.js
 *
 * 호출 시점: 페이지 진입 직후, Page 컴포넌트들이 초기화되기 전
 *
 * 책임:
 * - Page 레벨 이벤트 버스 핸들러 등록
 * - 현재 파라미터 상태 초기화
 */

const { onEventBusHandlers } = Wkit;

// ======================
// EVENT BUS HANDLERS
// ======================

this.eventBusHandlers = {
    /**
     * TaskList 행 클릭 이벤트
     */
    '@taskClicked': ({ data }) => {
        console.log('[Page] Task clicked:', data);
    }
};

onEventBusHandlers(this.eventBusHandlers);

console.log('[Page] before_load - Event handlers registered');
