/*
 * SpaceTree Component - register
 * 계층형 공간 트리 뷰어 (검색 기능 포함)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_nodeClicked, @TBD_nodeToggled, @TBD_searchChanged
 *
 * Expected Data Structure:
 * {
 *   title: "Space Tree",
 *   items: [
 *     {
 *       id: "1",
 *       name: "eCOBIT 통합 센터",
 *       type: "site",
 *       children: [
 *         { id: "1-1", name: "본관", type: "building", children: [...] },
 *         { id: "1-2", name: "별관", type: "building" }
 *       ]
 *     }
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG (정적 선언)
// ======================

const config = {
    titleKey: 'TBD_title',
    itemsKey: 'TBD_items',
    fields: {
        id: 'TBD_id',
        name: 'TBD_name',
        type: 'TBD_type',
        children: 'TBD_children'
    },
    defaultType: 'default',
    icons: {
        toggle: './assets/icon-chevron.svg',
        chevron: './assets/icon-chevron-sm.svg',
        typeIcons: {
            site: './assets/icon-location.svg',
            building: './assets/icon-building.svg',
            default: null
        }
    },
    // depth별 padding-left (px)
    depthPadding: [8, 16, 26, 46],
    // depth별 토글 사이즈: 0 = 14px (icon-chevron), 1+ = 16px (icon-chevron-sm)
    depthToggleSize: { 0: 14 }
};

// ======================
// STATE
// ======================

this._expandedNodes = new Set();
this._selectedNodeId = null;
this._searchTerm = '';
this._treeData = null;
this._internalHandlers = {};

// ======================
// BINDINGS (바인딩)
// ======================

this.renderData = renderData.bind(this, config);
this.toggleNode = toggleNode.bind(this);
this.selectNode = selectNode.bind(this);
this.expandAll = expandAll.bind(this);
this.collapseAll = collapseAll.bind(this);
this.handleSearch = handleSearch.bind(this, config);

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
        '.node-toggle': '@TBD_nodeToggled',
        '.node-content': '@TBD_nodeClicked',
        '.btn-expand-all': '@TBD_expandAllClicked',
        '.btn-collapse-all': '@TBD_collapseAllClicked'
    },
    input: {
        '.search-input': '@TBD_searchChanged'
    }
};

bindEvents(this, this.customEvents);

// 내부 이벤트 핸들러 (컴포넌트 자체 동작)
setupInternalHandlers.call(this);

// ======================
// RENDER FUNCTIONS (호이스팅)
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    // 타이틀 렌더링
    const titleEl = this.appendElement.querySelector('.tree-title');
    if (titleEl && data[config.titleKey]) {
        titleEl.textContent = data[config.titleKey];
    }

    // 트리 데이터 저장
    const items = data[config.itemsKey];
    if (items && Array.isArray(items)) {
        this._treeData = items;
        renderTree.call(this, config, items);
    }
}

function renderTree(config, items, searchTerm = '') {
    const rootEl = this.appendElement.querySelector('.tree-root');
    if (!rootEl) return;

    rootEl.innerHTML = '';

    const normalizedSearch = searchTerm.toLowerCase().trim();

    fx.go(
        items,
        fx.each(item => {
            const nodeEl = createNodeElement.call(this, config, item, normalizedSearch, 0);
            if (nodeEl) rootEl.appendChild(nodeEl);
        })
    );
}

function createNodeElement(config, item, searchTerm, depth) {
    const { fields, defaultType, icons, depthPadding, depthToggleSize } = config;

    const id = item[fields.id];
    const name = item[fields.name] || '-';
    const type = item[fields.type] || defaultType;
    const children = item[fields.children] || [];
    const hasChildren = children.length > 0;
    const isExpanded = this._expandedNodes.has(id);
    const isSelected = this._selectedNodeId === id;
    const isLeaf = !hasChildren;

    // 검색 필터링
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm);
    const hasMatchingChildren = hasChildren && hasMatchingDescendants(children, fields, searchTerm);

    if (searchTerm && !matchesSearch && !hasMatchingChildren) {
        return null;
    }

    const li = document.createElement('li');
    li.className = 'tree-node';
    li.dataset.nodeId = id;

    // Node Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'node-content';
    if (isSelected) contentDiv.classList.add('selected');
    if (searchTerm && matchesSearch) contentDiv.classList.add('highlight');

    // Depth-based padding
    const paddingLeft = depthPadding[Math.min(depth, depthPadding.length - 1)];
    contentDiv.style.paddingLeft = paddingLeft + 'px';
    contentDiv.style.paddingRight = '8px';

    // Selection Tag Bar (always present, hidden via CSS unless .selected)
    const tagBar = document.createElement('div');
    tagBar.className = 'select-tag';
    contentDiv.appendChild(tagBar);

    // Toggle / Bullet
    if (isLeaf) {
        // Leaf: bullet dot
        const bulletDiv = document.createElement('div');
        bulletDiv.className = 'node-bullet';
        const dotDiv = document.createElement('div');
        dotDiv.className = 'dot';
        bulletDiv.appendChild(dotDiv);
        contentDiv.appendChild(bulletDiv);
    } else {
        // Branch: toggle arrow
        const toggleSize = depthToggleSize[depth] || 16;
        const toggleSpan = document.createElement('span');
        toggleSpan.className = `node-toggle node-toggle-${toggleSize}`;
        if (isExpanded) toggleSpan.classList.add('expanded');

        const toggleImg = document.createElement('img');
        toggleImg.src = toggleSize === 14 ? icons.toggle : icons.chevron;
        toggleImg.alt = '';
        toggleSpan.appendChild(toggleImg);
        contentDiv.appendChild(toggleSpan);
    }

    // Type Icon (only for types that have icons)
    const typeIconSrc = icons.typeIcons[type] || icons.typeIcons[defaultType];
    if (typeIconSrc) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'node-icon';
        const iconImg = document.createElement('img');
        iconImg.src = typeIconSrc;
        iconImg.alt = '';
        iconDiv.appendChild(iconImg);
        contentDiv.appendChild(iconDiv);
    }

    // Label
    const labelSpan = document.createElement('span');
    labelSpan.className = 'node-label';
    labelSpan.textContent = name;
    if (searchTerm && !matchesSearch && hasMatchingChildren) {
        labelSpan.classList.add('dimmed');
    }

    contentDiv.appendChild(labelSpan);
    li.appendChild(contentDiv);

    // Children
    if (hasChildren) {
        const childrenUl = document.createElement('ul');
        childrenUl.className = 'node-children';
        if (isExpanded || (searchTerm && hasMatchingChildren)) {
            childrenUl.classList.add('expanded');
        }

        fx.go(
            children,
            fx.each(child => {
                const childEl = createNodeElement.call(this, config, child, searchTerm, depth + 1);
                if (childEl) childrenUl.appendChild(childEl);
            })
        );

        li.appendChild(childrenUl);
    }

    return li;
}

function hasMatchingDescendants(children, fields, searchTerm) {
    if (!searchTerm) return false;

    return children.some(child => {
        const name = (child[fields.name] || '').toLowerCase();
        if (name.includes(searchTerm)) return true;

        const grandChildren = child[fields.children] || [];
        return grandChildren.length > 0 && hasMatchingDescendants(grandChildren, fields, searchTerm);
    });
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.toggleClick = (e) => {
        const toggle = e.target.closest('.node-toggle');
        if (toggle) {
            e.stopPropagation();
            const nodeEl = toggle.closest('.tree-node');
            if (nodeEl) {
                this.toggleNode(nodeEl.dataset.nodeId);
            }
        }
    };

    this._internalHandlers.nodeClick = (e) => {
        const content = e.target.closest('.node-content');
        if (content && !e.target.closest('.node-toggle')) {
            const nodeEl = content.closest('.tree-node');
            if (nodeEl) {
                this.selectNode(nodeEl.dataset.nodeId);
            }
        }
    };

    this._internalHandlers.expandAllClick = () => this.expandAll();
    this._internalHandlers.collapseAllClick = () => this.collapseAll();
    this._internalHandlers.searchInput = (e) => this.handleSearch(e.target.value);

    root.addEventListener('click', this._internalHandlers.toggleClick);
    root.addEventListener('click', this._internalHandlers.nodeClick);
    root.querySelector('.btn-expand-all')?.addEventListener('click', this._internalHandlers.expandAllClick);
    root.querySelector('.btn-collapse-all')?.addEventListener('click', this._internalHandlers.collapseAllClick);
    root.querySelector('.search-input')?.addEventListener('input', this._internalHandlers.searchInput);
}

function toggleNode(nodeId) {
    if (this._expandedNodes.has(nodeId)) {
        this._expandedNodes.delete(nodeId);
    } else {
        this._expandedNodes.add(nodeId);
    }
    updateNodeVisuals.call(this, nodeId);
}

function selectNode(nodeId) {
    const prevSelected = this.appendElement.querySelector('.node-content.selected');
    if (prevSelected) prevSelected.classList.remove('selected');

    this._selectedNodeId = nodeId;

    const nodeEl = this.appendElement.querySelector(`[data-node-id="${nodeId}"] > .node-content`);
    if (nodeEl) nodeEl.classList.add('selected');
}

function expandAll() {
    collectAllNodeIds.call(this, this._treeData, this._expandedNodes);
    if (this._treeData) {
        renderTree.call(this, config, this._treeData, this._searchTerm);
    }
}

function collapseAll() {
    this._expandedNodes.clear();
    if (this._treeData) {
        renderTree.call(this, config, this._treeData, this._searchTerm);
    }
}

function collectAllNodeIds(items, set) {
    if (!items) return;
    const { fields } = config;

    fx.go(
        items,
        fx.each(item => {
            const children = item[fields.children];
            if (children && children.length > 0) {
                set.add(item[fields.id]);
                collectAllNodeIds.call(this, children, set);
            }
        })
    );
}

function handleSearch(config, value) {
    this._searchTerm = value;
    if (this._treeData) {
        renderTree.call(this, config, this._treeData, value);
    }
}

function updateNodeVisuals(nodeId) {
    const nodeEl = this.appendElement.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeEl) return;

    const toggle = nodeEl.querySelector(':scope > .node-content > .node-toggle');
    const children = nodeEl.querySelector(':scope > .node-children');
    const isExpanded = this._expandedNodes.has(nodeId);

    if (toggle) {
        toggle.classList.toggle('expanded', isExpanded);
    }
    if (children) {
        children.classList.toggle('expanded', isExpanded);
    }
}
