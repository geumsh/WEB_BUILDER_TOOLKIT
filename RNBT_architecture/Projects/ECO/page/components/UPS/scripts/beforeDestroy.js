/**
 * UPS - Destroy Script
 * 컴포넌트 정리 (Shadow DOM 팝업 + 차트 + 메트릭 갱신 interval)
 */

this.stopRefresh();
this.destroyPopup();
console.log('[UPS] Destroyed:', this.setter?.assetInfo?.assetKey);
