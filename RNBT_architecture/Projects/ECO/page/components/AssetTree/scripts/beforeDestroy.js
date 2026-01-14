/**
 * AssetTree - Destroy Script
 *
 * 정리 대상:
 * 1. 내부 이벤트 (_internalHandlers - addEventListener로 등록)
 * 2. GlobalDataPublisher 구독 해제
 * 3. 상태 초기화
 */

const { unsubscribe } = GlobalDataPublisher;
const { each } = fx;

// ======================
// 1. 내부 이벤트 해제
// ======================
if (this._internalHandlers) {
    const root = this.appendElement;

    // 검색
    root.querySelector('.search-input')?.removeEventListener('input', this._internalHandlers.searchInput);

    // 버튼
    root.querySelector('.btn-expand-all')?.removeEventListener('click', this._internalHandlers.expandAll);
    root.querySelector('.btn-collapse-all')?.removeEventListener('click', this._internalHandlers.collapseAll);

    // 트리 이벤트
    root.querySelector('.tree-container')?.removeEventListener('click', this._internalHandlers.treeClick);
    root.querySelector('.tree-container')?.removeEventListener('dragstart', this._internalHandlers.dragStart);
    root.querySelector('.tree-container')?.removeEventListener('dragend', this._internalHandlers.dragEnd);

    this._internalHandlers = null;
}

// ======================
// 2. GlobalDataPublisher 구독 해제
// ======================
if (this.subscriptions) {
    fx.go(
        Object.keys(this.subscriptions),
        each(topic => unsubscribe(topic, this))
    );
    this.subscriptions = null;
}

// ======================
// 3. 상태 초기화
// ======================
this._treeData = null;
this._flatData = null;
this._expandedNodes = null;
this._selectedNodeId = null;
this._searchTerm = null;
this._matchedIds = null;
this._pathIds = null;
this._draggedAsset = null;

console.log('[AssetTree] Destroyed - tree, subscriptions, events cleaned up');
