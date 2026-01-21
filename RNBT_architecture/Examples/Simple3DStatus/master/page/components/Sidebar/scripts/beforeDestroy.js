/**
 * Master - Sidebar Component - beforeDestroy.js
 *
 * 호출 시점: 컴포넌트 제거 직전
 *
 * 책임:
 * - 구독 해제
 * - 이벤트 핸들러 해제
 * - 참조 정리
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;

// ======================
// CLEANUP
// ======================

if (this.subscriptions) {
    fx.go(
        Object.entries(this.subscriptions),
        fx.each(([topic, fnList]) =>
            fx.each(fn => this[fn] && unsubscribe(topic, this, this[fn]), fnList)
        )
    );
    this.subscriptions = null;
}

if (this.customEvents) {
    removeCustomEvents(this, this.customEvents);
    this.customEvents = null;
}

this.renderMenu = null;

console.log('[Sidebar] Destroyed');
