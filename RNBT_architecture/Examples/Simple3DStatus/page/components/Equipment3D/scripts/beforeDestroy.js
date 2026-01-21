/**
 * Page - Equipment3D Component - beforeDestroy.js
 *
 * 3D 컴포넌트의 정리는 주로 페이지의 disposeAllThreeResources()에서 수행됨
 * 이 파일에서는 컴포넌트 자체의 참조만 정리
 *
 * Note: 3D 리소스(geometry, material, texture)는 페이지 before_unload에서 일괄 정리
 */

const { unsubscribe } = GlobalDataPublisher;

// ======================
// SUBSCRIPTION CLEANUP
// ======================

if (this.subscriptions) {
    fx.go(
        Object.entries(this.subscriptions),
        fx.each(([topic, fnList]) =>
            fx.each(fn => this[fn] && unsubscribe(topic, this, this[fn]), fnList)
        )
    );
    this.subscriptions = null;
}

// ======================
// STATE CLEANUP
// ======================

// 원본 material 복원 (선택적)
if (this._originalMaterials && this.appendElement) {
    this._originalMaterials.forEach((material, meshName) => {
        const mesh = this.appendElement.getObjectByName(meshName);
        if (mesh) {
            mesh.material = material;
        }
    });
}

this._originalMaterials = null;
this._equipmentStatusCache = null;

// ======================
// HANDLER CLEANUP
// ======================

this.updateMeshStatus = null;
this.customEvents = null;
this.datasetInfo = null;

console.log('[Equipment3D] Destroyed');
