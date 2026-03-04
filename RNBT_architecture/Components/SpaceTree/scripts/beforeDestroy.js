/*
 * SpaceTree Component - beforeDestroy
 * 계층형 공간 트리 뷰어 (검색 기능 포함)
 */

const { unsubscribe } = GlobalDataPublisher;
const { removeCustomEvents } = Wkit;
const { each } = fx;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

fx.go(
    Object.entries(this.subscriptions),
    each(([topic, _]) => unsubscribe(topic, this))
);
this.subscriptions = null;

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
    root.removeEventListener('click', this._internalHandlers.toggleClick);
    root.removeEventListener('click', this._internalHandlers.nodeClick);
    root.querySelector('.btn-expand-all')?.removeEventListener('click', this._internalHandlers.expandAllClick);
    root.querySelector('.btn-collapse-all')?.removeEventListener('click', this._internalHandlers.collapseAllClick);
    root.querySelector('.search-input')?.removeEventListener('input', this._internalHandlers.searchInput);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._expandedNodes = null;
this._selectedNodeId = null;
this._searchTerm = null;
this._treeData = null;

// ======================
// HANDLER CLEANUP
// ======================

this.renderData = null;
this.toggleNode = null;
this.selectNode = null;
this.expandAll = null;
this.collapseAll = null;
this.handleSearch = null;
