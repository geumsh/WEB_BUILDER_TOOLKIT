/**
 * UPS - Destroy Script
 * 컴포넌트 정리 (Shadow DOM 팝업 + 차트 + 메트릭 갱신 interval)
 */

this.stopRefresh();
this.destroyPopup();

// 캐시 데이터 해제
this._trendData = null;

console.log('[UPS] Destroyed:', this._defaultAssetKey);
