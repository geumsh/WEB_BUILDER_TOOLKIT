/**
 * AssetTree - 전체 자산 트리 (드래그 앤 드롭)
 *
 * 기능:
 * 1. 전체 자산 트리 표시 (컨테이너 + 단말)
 * 2. 검색 기능 (매칭 노드 + 상위 경로)
 * 3. 드래그 앤 드롭 (이벤트 발행)
 * 4. 펼침/접힘 제어
 *
 * 이벤트:
 * - @assetDragStart: 드래그 시작
 * - @assetDropped: 드롭 완료
 *
 * 데이터 흐름:
 * - GlobalDataPublisher의 'assetTree' topic 구독 → 트리 렌더링
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;
const { each, go } = fx;

initComponent.call(this);

function initComponent() {
    // ======================
    // 1. SUBSCRIPTIONS
    // ======================
    this.subscriptions = {
        'assetTree': ['renderTree']
    };

    // ======================
    // 2. STATE
    // ======================
    this._treeData = null;
    this._flatData = [];           // 검색용 플랫 배열
    this._expandedNodes = new Set();
    this._selectedNodeId = null;
    this._searchTerm = '';
    this._matchedIds = new Set();  // 검색 매칭 ID
    this._pathIds = new Set();     // 매칭 노드의 상위 경로 ID
    this._draggedAsset = null;
    this._internalHandlers = {};

    // ======================
    // 3. BINDINGS
    // ======================
    this.renderTree = renderTree.bind(this);
    this.search = search.bind(this);
    this.toggleNode = toggleNode.bind(this);
    this.selectNode = selectNode.bind(this);
    this.expandAll = expandAll.bind(this);
    this.collapseAll = collapseAll.bind(this);

    // ======================
    // 4. SUBSCRIBE
    // ======================
    go(
        Object.entries(this.subscriptions),
        each(([topic, fnList]) =>
            each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
        )
    );

    // ======================
    // 5. INTERNAL HANDLERS
    // ======================
    setupInternalHandlers.call(this);

    console.log('[AssetTree] Registered - full asset tree with drag & drop');
}

// ======================
// INTERNAL EVENT HANDLERS
// ======================
function setupInternalHandlers() {
    const root = this.appendElement;
    const ctx = this;

    // 검색 입력
    this._internalHandlers.searchInput = (e) => ctx.search(e.target.value);

    // 전체 펼침
    this._internalHandlers.expandAll = () => ctx.expandAll();

    // 전체 접힘
    this._internalHandlers.collapseAll = () => ctx.collapseAll();

    // 트리 클릭 (이벤트 위임)
    this._internalHandlers.treeClick = (e) => {
        const nodeContent = e.target.closest('.node-content');
        if (!nodeContent) return;

        const nodeEl = nodeContent.closest('.tree-node');
        if (!nodeEl) return;

        const nodeId = nodeEl.dataset.nodeId;
        const toggle = nodeContent.querySelector('.node-toggle');

        // 토글 클릭 → 펼침/접힘
        if (e.target.closest('.node-toggle') && !toggle.classList.contains('leaf')) {
            ctx.toggleNode(nodeId);
        } else {
            // 노드 선택
            ctx.selectNode(nodeId);
        }
    };

    // 드래그 시작
    this._internalHandlers.dragStart = (e) => {
        const nodeContent = e.target.closest('.node-content');
        if (!nodeContent) return;

        const nodeEl = nodeContent.closest('.tree-node');
        if (!nodeEl) return;

        const nodeId = nodeEl.dataset.nodeId;
        const asset = findAssetById.call(ctx, nodeId);
        if (!asset) return;

        ctx._draggedAsset = asset;
        nodeContent.classList.add('dragging');

        // 드래그 데이터 설정
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
        e.dataTransfer.setData('text/plain', asset.name);

        // 이벤트 발행
        Weventbus.emit('@assetDragStart', {
            event: { asset },
            targetInstance: ctx
        });

        console.log('[AssetTree] Drag start:', asset.name);
    };

    // 드래그 종료
    this._internalHandlers.dragEnd = (e) => {
        const nodeContent = e.target.closest('.node-content');
        if (nodeContent) {
            nodeContent.classList.remove('dragging');
        }

        if (ctx._draggedAsset) {
            // 드롭 완료 이벤트
            Weventbus.emit('@assetDropped', {
                event: { asset: ctx._draggedAsset },
                targetInstance: ctx
            });

            console.log('[AssetTree] Drag end:', ctx._draggedAsset.name);
            ctx._draggedAsset = null;
        }
    };

    // 이벤트 등록
    root.querySelector('.search-input')?.addEventListener('input', this._internalHandlers.searchInput);
    root.querySelector('.btn-expand-all')?.addEventListener('click', this._internalHandlers.expandAll);
    root.querySelector('.btn-collapse-all')?.addEventListener('click', this._internalHandlers.collapseAll);
    root.querySelector('.tree-container')?.addEventListener('click', this._internalHandlers.treeClick);
    root.querySelector('.tree-container')?.addEventListener('dragstart', this._internalHandlers.dragStart);
    root.querySelector('.tree-container')?.addEventListener('dragend', this._internalHandlers.dragEnd);
}

// ======================
// TREE RENDER
// ======================
function renderTree({ response }) {
    const { data } = response;
    if (!data || !data.items) return;

    this._treeData = data.items;
    this._flatData = flattenTree(data.items);

    renderTreeNodes.call(this, data.items, this._searchTerm);
    updateCount.call(this);

    console.log('[AssetTree] Tree rendered:', this._flatData.length, 'assets');
}

function flattenTree(items, parent = null, result = []) {
    items.forEach(item => {
        result.push({ ...item, parentId: parent?.id || null });
        if (item.children && item.children.length > 0) {
            flattenTree(item.children, item, result);
        }
    });
    return result;
}

function renderTreeNodes(items, searchTerm = '') {
    const rootEl = this.appendElement.querySelector('.tree-root');
    if (!rootEl) return;

    rootEl.innerHTML = '';
    const normalized = searchTerm.toLowerCase().trim();

    // 검색어가 있으면 매칭 계산
    if (normalized) {
        this._matchedIds = new Set();
        this._pathIds = new Set();

        this._flatData.forEach(asset => {
            if (asset.name.toLowerCase().includes(normalized)) {
                this._matchedIds.add(asset.id);
                // 상위 경로 수집
                collectAncestorIds.call(this, asset.id);
            }
        });
    } else {
        this._matchedIds.clear();
        this._pathIds.clear();
    }

    // 매칭 결과가 없으면 메시지 표시
    if (normalized && this._matchedIds.size === 0) {
        rootEl.innerHTML = '<div class="no-results">No matching assets found</div>';
        return;
    }

    go(
        items,
        each(item => {
            const nodeEl = createTreeNode.call(this, item, normalized);
            if (nodeEl) rootEl.appendChild(nodeEl);
        })
    );
}

function collectAncestorIds(assetId) {
    const asset = this._flatData.find(a => a.id === assetId);
    if (!asset || !asset.parentId) return;

    this._pathIds.add(asset.parentId);
    collectAncestorIds.call(this, asset.parentId);
}

function createTreeNode(item, searchTerm) {
    const { id, name, type, status, canHaveChildren, children = [] } = item;
    const hasChildren = children.length > 0;
    const isExpanded = this._expandedNodes.has(id);
    const isSelected = this._selectedNodeId === id;
    const isMatch = this._matchedIds.has(id);
    const isPath = this._pathIds.has(id);

    // 검색 중이면서 매칭도 경로도 아니면 숨김
    if (searchTerm && !isMatch && !isPath && !hasMatchingDescendants.call(this, item)) {
        return null;
    }

    const li = document.createElement('li');
    li.className = 'tree-node';
    li.dataset.nodeId = id;
    li.dataset.nodeType = type;
    li.dataset.canHaveChildren = canHaveChildren;

    // Node Content
    const content = document.createElement('div');
    content.className = 'node-content';
    content.draggable = true;

    if (isSelected) content.classList.add('selected');
    if (isMatch) content.classList.add('match');
    if (searchTerm && !isMatch && !isPath) content.classList.add('dimmed');

    // Toggle
    const toggle = document.createElement('span');
    toggle.className = 'node-toggle';
    if (hasChildren) {
        toggle.textContent = '▶';
        // 검색 중이면 매칭 경로 자동 펼침
        if ((isExpanded || (searchTerm && (isPath || isMatch)))) {
            toggle.classList.add('expanded');
        }
    } else {
        toggle.classList.add('leaf');
    }

    // Icon
    const icon = document.createElement('span');
    icon.className = 'node-icon';
    icon.dataset.type = type;

    // Label
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = name;

    // Type tag
    const typeTag = document.createElement('span');
    typeTag.className = 'node-type';
    typeTag.textContent = type;
    typeTag.dataset.container = canHaveChildren;

    content.appendChild(toggle);
    content.appendChild(icon);
    content.appendChild(label);
    content.appendChild(typeTag);

    // Status
    if (status) {
        const statusDot = document.createElement('span');
        statusDot.className = `node-status ${status}`;
        content.appendChild(statusDot);
    }

    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'node-drag-handle';
    content.appendChild(dragHandle);

    li.appendChild(content);

    // Children
    if (hasChildren) {
        const childrenUl = document.createElement('ul');
        childrenUl.className = 'node-children';

        // 펼침 조건: 수동 펼침 또는 검색 시 경로
        if (isExpanded || (searchTerm && (isPath || isMatch))) {
            childrenUl.classList.add('expanded');
        }

        go(
            children,
            each(child => {
                const childEl = createTreeNode.call(this, child, searchTerm);
                if (childEl) childrenUl.appendChild(childEl);
            })
        );

        li.appendChild(childrenUl);
    }

    return li;
}

function hasMatchingDescendants(item) {
    if (!item.children) return false;
    return item.children.some(child => {
        if (this._matchedIds.has(child.id)) return true;
        return hasMatchingDescendants.call(this, child);
    });
}

// ======================
// NODE ACTIONS
// ======================
function toggleNode(nodeId) {
    if (this._expandedNodes.has(nodeId)) {
        this._expandedNodes.delete(nodeId);
    } else {
        this._expandedNodes.add(nodeId);
    }
    updateNodeVisuals.call(this, nodeId);
}

function selectNode(nodeId) {
    const prev = this.appendElement.querySelector('.node-content.selected');
    if (prev) prev.classList.remove('selected');

    this._selectedNodeId = nodeId;

    const nodeEl = this.appendElement.querySelector(`[data-node-id="${nodeId}"] > .node-content`);
    if (nodeEl) nodeEl.classList.add('selected');
}

function expandAll() {
    collectAllNodeIds.call(this, this._treeData);
    if (this._treeData) {
        renderTreeNodes.call(this, this._treeData, this._searchTerm);
    }
}

function collapseAll() {
    this._expandedNodes.clear();
    if (this._treeData) {
        renderTreeNodes.call(this, this._treeData, this._searchTerm);
    }
}

function collectAllNodeIds(items) {
    if (!items) return;
    go(
        items,
        each(item => {
            if (item.children && item.children.length > 0) {
                this._expandedNodes.add(item.id);
                collectAllNodeIds.call(this, item.children);
            }
        })
    );
}

function updateNodeVisuals(nodeId) {
    const nodeEl = this.appendElement.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeEl) return;

    const toggle = nodeEl.querySelector(':scope > .node-content > .node-toggle');
    const children = nodeEl.querySelector(':scope > .node-children');
    const isExpanded = this._expandedNodes.has(nodeId);

    if (toggle) toggle.classList.toggle('expanded', isExpanded);
    if (children) children.classList.toggle('expanded', isExpanded);
}

// ======================
// SEARCH
// ======================
function search(term) {
    this._searchTerm = term;
    if (this._treeData) {
        renderTreeNodes.call(this, this._treeData, term);
    }
}

// ======================
// HELPERS
// ======================
function findAssetById(assetId) {
    return this._flatData.find(a => a.id === assetId) || null;
}

function updateCount() {
    const countEl = this.appendElement.querySelector('.count-value');
    if (countEl) {
        countEl.textContent = this._flatData.length;
    }
}
