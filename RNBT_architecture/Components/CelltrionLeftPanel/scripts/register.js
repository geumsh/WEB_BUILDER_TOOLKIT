/*
 * CelltrionLeftPanel Component - register
 * 셀트리온 좌측 사이드바 (위치 트리 + 화물 트리)
 *
 * Subscribes to: TBD_topicName
 * Events: @TBD_locationSelected, @TBD_cargoZoneChecked
 *
 * Expected Data Structure:
 * {
 *   locationTree: [
 *     { id: "building", label: "건물", icon: "building", expanded: true, children: [
 *       { id: "1f", label: "1층", icon: "floor", children: [] },
 *       { id: "2f", label: "2층", icon: "floor", children: [] },
 *       { id: "3f", label: "3층", icon: "floor-open", expanded: true, children: [
 *         { id: "zone-a", label: "A Zone (Main)", type: "zone" },
 *         { id: "zone-b", label: "B Zone (Cold)", type: "zone" },
 *         { id: "zone-d", label: "D Zone (Except)", type: "zone", active: true },
 *         { id: "zone-e", label: "E Zone (ETC)", type: "zone" }
 *       ]}
 *     ]}
 *   ],
 *   cargoTree: [
 *     { id: "cargo-a", label: "A Zone (Main)", icon: "folder", expanded: true, children: [
 *       { id: "z01", label: "ZONE 01", checked: true },
 *       { id: "z02", label: "ZONE 02" },
 *       ...
 *     ]},
 *     { id: "cargo-b", label: "B Zone (Cold)", icon: "folder-closed" },
 *     ...
 *   ]
 * }
 */

const { subscribe } = GlobalDataPublisher;
const { bindEvents } = Wkit;

// ======================
// CONFIG
// ======================

const config = {
    icons: {
        building: './assets/icon-building.svg',
        floor: './assets/icon-floor.svg',
        'floor-open': './assets/icon-floor-open.svg',
        folder: './assets/icon-cargo-folder.svg',
        'folder-closed': './assets/icon-cargo-folder-closed.svg',
        etc: './assets/icon-cargo-etc.svg',
        chevron: './assets/icon-chevron.svg',
        'zone-active': './assets/icon-zone-active.svg',
        'zone-inactive': './assets/icon-zone-inactive.svg',
        'checkbox-checked': './assets/icon-checkbox-checked.svg'
    }
};

// ======================
// STATE
// ======================

this._locationData = null;
this._cargoData = null;
this._internalHandlers = {};

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
        '.tree-item': '@TBD_treeItemClicked'
    }
};

bindEvents(this, this.customEvents);

setupInternalHandlers.call(this);

// ======================
// MOCK DATA (시연용 - 실제 연동 시 제거)
// ======================

this.renderData({
    response: {
        data: {
            locationTree: [
                { id: 'building', label: '건물', icon: 'building', expanded: true, children: [
                    { id: '1f', label: '1층', icon: 'floor', children: [] },
                    { id: '2f', label: '2층', icon: 'floor', children: [] },
                    { id: '3f', label: '3층', icon: 'floor-open', expanded: true, children: [
                        { id: 'zone-a', label: 'A Zone (Main)', type: 'zone' },
                        { id: 'zone-b', label: 'B Zone (Cold)', type: 'zone' },
                        { id: 'zone-d', label: 'D Zone (Except)', type: 'zone', active: true },
                        { id: 'zone-e', label: 'E Zone (ETC)', type: 'zone' }
                    ]}
                ]}
            ],
            cargoTree: [
                { id: 'cargo-a', label: 'A Zone (Main)', icon: 'folder', expanded: true, children: [
                    { id: 'z01', label: 'ZONE 01', checked: true },
                    { id: 'z02', label: 'ZONE 02' },
                    { id: 'z03', label: 'ZONE 03' },
                    { id: 'z04', label: 'ZONE 04' },
                    { id: 'z05', label: 'ZONE 05' },
                    { id: 'z06', label: 'ZONE 06' },
                    { id: 'z07', label: 'ZONE 07' }
                ]},
                { id: 'cargo-b', label: 'B Zone (Cold)', icon: 'folder-closed', children: [] },
                { id: 'cargo-d', label: 'D Zone (Except)', icon: 'folder-closed', children: [] },
                { id: 'cargo-e', label: 'E Zone (ETC)', icon: 'etc', children: [] }
            ]
        }
    }
});

// ======================
// RENDER FUNCTIONS
// ======================

function renderData(config, { response }) {
    const { data } = response;
    if (!data) return;

    if (data.locationTree) {
        this._locationData = data.locationTree;
        renderLocationTree.call(this, config, data.locationTree);
    }

    if (data.cargoTree) {
        this._cargoData = data.cargoTree;
        renderCargoTree.call(this, config, data.cargoTree);
    }
}

function renderLocationTree(config, nodes) {
    const container = this.appendElement.querySelector('.location-tree');
    if (!container) return;
    container.innerHTML = '';
    renderNodes(config, container, nodes, 1, 'location');
}

function renderCargoTree(config, nodes) {
    const container = this.appendElement.querySelector('.cargo-tree-list');
    if (!container) return;
    container.innerHTML = '';

    nodes.forEach(node => {
        if (node.expanded && node.children?.length) {
            const group = document.createElement('div');
            group.className = 'cargo-group';

            // Parent
            group.appendChild(createFolderItem(config, node, 1));

            // Children (checkbox items)
            node.children.forEach(child => {
                group.appendChild(createCheckboxItem(config, child));
            });

            container.appendChild(group);
        } else {
            container.appendChild(createFolderItem(config, node, 1));
        }
    });
}

function renderNodes(config, container, nodes, level, treeType) {
    nodes.forEach(node => {
        if (node.type === 'zone') {
            container.appendChild(createZoneItem(config, node, level + 1));
        } else {
            container.appendChild(createBranchItem(config, node, level));
            if (node.expanded && node.children?.length) {
                renderNodes(config, container, node.children, level + 1, treeType);
            }
        }
    });
}

function createBranchItem(config, node, level) {
    const item = document.createElement('div');
    item.className = `tree-item tree-item--l${level}`;
    item.dataset.id = node.id;

    const iconSrc = config.icons[node.icon] || config.icons.floor;

    item.innerHTML = `
        <div class="tree-item-obj">
            <div class="icon-main"><img src="${iconSrc}" alt=""></div>
            <div class="icon-chevron"><img src="${config.icons.chevron}" alt=""></div>
        </div>
        <p class="tree-item-text">${node.label}</p>
    `;
    return item;
}

function createZoneItem(config, node, level) {
    const item = document.createElement('div');
    item.className = `tree-item tree-item--l${level}`;
    item.dataset.id = node.id;

    const iconSrc = node.active ? config.icons['zone-active'] : config.icons['zone-inactive'];
    const textClass = node.active ? 'tree-item-text' : 'tree-item-text tree-item-text--inactive';

    item.innerHTML = `
        <div class="tree-item-zone-icon"><img src="${iconSrc}" alt=""></div>
        <p class="${textClass}">${node.label}</p>
    `;
    return item;
}

function createFolderItem(config, node, level) {
    const item = document.createElement('div');
    item.className = `tree-item tree-item--l${level}`;
    item.dataset.id = node.id;

    const iconSrc = config.icons[node.icon] || config.icons['folder-closed'];

    item.innerHTML = `
        <div class="tree-item-obj">
            <div class="icon-main"><img src="${iconSrc}" alt=""></div>
            <div class="icon-chevron"><img src="${config.icons.chevron}" alt=""></div>
        </div>
        <p class="tree-item-text">${node.label}</p>
    `;
    return item;
}

function createCheckboxItem(config, node) {
    const item = document.createElement('div');
    item.className = 'tree-item tree-item--l2-cargo';
    item.dataset.id = node.id;

    const checked = node.checked;
    const cbClass = checked ? 'tree-item-checkbox tree-item-checkbox--active' : 'tree-item-checkbox tree-item-checkbox--inactive';
    const textClass = checked ? 'tree-item-text' : 'tree-item-text tree-item-text--inactive';

    const cbInner = checked
        ? `<div class="icon-cb"><img src="${config.icons['checkbox-checked']}" alt=""></div>`
        : `<div class="checkbox-unchecked"><div class="checkbox-unchecked-inner"></div></div>`;

    item.innerHTML = `
        <div class="${cbClass}">${cbInner}</div>
        <p class="${textClass}">${node.label}</p>
    `;
    return item;
}

// ======================
// INTERNAL HANDLERS
// ======================

function setupInternalHandlers() {
    const root = this.appendElement;

    this._internalHandlers.cargoSearch = (e) => {
        // 검색 필터링 로직 (필요 시 구현)
    };

    const searchInput = root.querySelector('.cargo-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', this._internalHandlers.cargoSearch);
    }
}
