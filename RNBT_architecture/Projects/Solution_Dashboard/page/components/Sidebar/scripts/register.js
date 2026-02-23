/*
 * Sidebar Component - register
 * Subscribes to: spaceTreeData
 * Events: @sidebarNodeSelected
 *
 * Space Tree 네비게이션 컴포넌트
 * - 트리 노드 클릭 시 @sidebarNodeSelected 이벤트 발행
 * - spaceTreeData 구독으로 시스템명/층 텍스트 업데이트
 */

const { bindEvents } = Wkit;
const { subscribe } = GlobalDataPublisher;
const { each, go } = fx;

// ======================
// CONFIG
// ======================

const config = {
    selectors: {
        headerTitle: '.header-title',
        depth1Text: '.group-1depth .tree-text'
    }
};

// ======================
// EVENT BINDING
// ======================

this.customEvents = {
    click: {
        '.item': '@sidebarNodeSelected',
        '.item-select': '@sidebarNodeSelected',
        '.group-1depth': '@sidebarNodeSelected'
    }
};

bindEvents(this, this.customEvents);

// ======================
// BINDINGS
// ======================

this.renderTree = renderTree.bind(this, config);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    spaceTreeData: ['renderTree']
};

go(
    Object.entries(this.subscriptions),
    each(([topic, fnList]) =>
        each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// RENDER
// ======================

function renderTree(config, { response }) {
    const { data } = response;
    if (!data) return;

    const { systemName, floorName } = data;
    const { selectors } = config;

    // 시스템명 업데이트
    if (systemName) {
        const depth1El = this.appendElement.querySelector(selectors.depth1Text);
        if (depth1El) {
            depth1El.textContent = systemName;
        }
    }
}
