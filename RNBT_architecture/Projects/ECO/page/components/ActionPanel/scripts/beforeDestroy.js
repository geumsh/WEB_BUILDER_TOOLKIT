/*
 * ActionPanel Component - beforeDestroy
 * 대시보드 액션 버튼 패널 (ECO)
 */

const { removeCustomEvents } = Wkit;

// ======================
// EVENT CLEANUP
// ======================

removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// ======================
// HEATMAP CLEANUP
// ======================

if (this._centerInstance && this._centerInstance._heatmap && this._centerInstance._heatmap.visible) {
  this._centerInstance.destroyHeatmap();
}

// ======================
// INTERNAL HANDLER CLEANUP
// ======================

const root = this.appendElement;
if (this._internalHandlers) {
  const panel = root.querySelector('.action-panel');
  if (panel) panel.removeEventListener('click', this._internalHandlers.btnClick);
}
this._internalHandlers = null;

// ======================
// STATE CLEANUP
// ======================

this._centerInstance = null;
this._heatmapApplied = false;
this._activeTab = null;
this._centerComponentName = null;
this._refreshInterval = null;
