/*
 * AssetTree Component - beforeDestroy
 * 배치된 3D 장비의 위치 계층 트리 (ECO)
 */

const { removeCustomEvents } = Wkit;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

const root = this.appendElement;
if (this._internalHandlers) {
    const treeContainer = root.querySelector('.tree-container');
    if (treeContainer) {
        treeContainer.removeEventListener('click', this._internalHandlers.treeClick);
        treeContainer.removeEventListener('dblclick', this._internalHandlers.treeDblClick);
    }
    root.querySelector('.tree-search-input')?.removeEventListener('input', this._internalHandlers.searchInput);
    root.querySelector('.refresh-btn')?.removeEventListener('click', this._internalHandlers.refreshClick);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._assetCache = null;
this._treeData = null;
this._instanceMap = null;
this._expandedNodes = null;
this._searchTerm = null;

// ======================
// HANDLER CLEANUP
// ======================

this.collectAndBuild = null;
this.renderTree = null;
