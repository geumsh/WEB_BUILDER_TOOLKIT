/*
 * EventStatus Component - register
 * 이벤트 현황 테이블
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_rowClicked
 *
 * Expected Data Structure:
 * {
 *   title: "이벤트 현황",
 *   events: [
 *     { time: "25-07-07 09:00:00", type: "EVA", device: "SV001", content: "고온 (U20): 25 °C", level: "error" }
 *   ]
 * }
 *
 * Level: error(red), warning(yellow), success(green), info(white)
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    titleKey: 'TBD_title',
    eventsKey: 'TBD_events',
    eventFields: {
        time: 'TBD_time',
        type: 'TBD_type',
        device: 'TBD_device',
        content: 'TBD_content',
        level: 'TBD_level'
    },
    levelMap: {
        error: 'red',
        warning: 'yellow',
        success: 'green',
        info: 'white'
    }
};

// ======================
// BINDINGS
// ======================

this.renderData = renderData.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    TBD_topicName: ['renderData']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.event-status__row': '@TBD_rowClicked'
    }
};

bindEvents(this, this.customEvents);

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 타이틀
    const titleEl = this.appendElement.querySelector('.title__text');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 이벤트 목록
    const events = data[config.eventsKey];
    if (events && Array.isArray(events)) {
        const rowsEl = this.appendElement.querySelector('.event-status__rows');
        rowsEl.innerHTML = '';
        events.forEach((event, index) => appendEventRow.call(this, config, rowsEl, event, index));
    }
}

function appendEventRow(config, rowsEl, event, index) {
    const { eventFields, levelMap } = config;
    const div = document.createElement('div');
    div.className = 'event-status__row';
    div.dataset.index = index;

    const level = event[eventFields.level] || 'info';
    const colorClass = levelMap[level] || 'white';

    div.innerHTML = `
        <div class="row__indicator row__indicator--${colorClass}"></div>
        <div class="row__cell row__cell--time">${event[eventFields.time] || '-'}</div>
        <div class="row__cell row__cell--type">${event[eventFields.type] || '-'}</div>
        <div class="row__cell row__cell--device">${event[eventFields.device] || '-'}</div>
        <div class="row__cell row__cell--content">${event[eventFields.content] || '-'}</div>
    `;

    rowsEl.appendChild(div);
}
