/*
 * ToggleTypeB Component - register
 * Subscribes to: (none - pure UI component)
 * Events: @toggleChanged
 *
 * 대시보드/리포트 토글 버튼 그룹 컴포넌트
 */

const { bindEvents } = Wkit;

// ======================
// TOGGLE STATE LOGIC
// ======================

const container = this.querySelector('.toggle-type-b');
const buttons = container.querySelectorAll('.btn-type-a');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        buttons.forEach(b => {
            b.classList.remove('btn-type-a--active');
            b.classList.add('btn-type-a--idle');
        });
        btn.classList.remove('btn-type-a--idle');
        btn.classList.add('btn-type-a--active');
    });
});

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.btn-type-a': '@toggleChanged'
    }
};

bindEvents(this, this.customEvents);
