/**
 * Page - Equipment3D Component - register.js
 *
 * 3D 컴포넌트 예제: 장비 상태를 mesh의 material color로 표시
 *
 * 핵심 패턴:
 * 1. meshStatusConfig: mesh 이름 → 상태 매핑 설정
 * 2. equipmentStatus topic 구독 → material color 업데이트
 * 3. 3D 이벤트 바인딩: click → @3dObjectClicked
 *
 * Subscribes to: equipmentStatus
 * Events: @3dObjectClicked
 */

const { subscribe } = GlobalDataPublisher;
const { bind3DEvents } = Wkit;

// ======================
// MESH STATUS CONFIG
// ======================

/**
 * Mesh 이름과 장비 ID 매핑 설정
 *
 * 구조:
 * - meshName: 3D 모델에서의 mesh 이름 (Three.js Object3D.name)
 * - equipmentId: 데이터의 장비 ID (API 응답의 id 필드)
 *
 * 이 config를 통해 어떤 mesh가 어떤 장비의 상태를 표시할지 결정
 */
const meshStatusConfig = [
    { meshName: 'Rack_A', equipmentId: 'eq-001' },
    { meshName: 'Rack_B', equipmentId: 'eq-002' },
    { meshName: 'Cooling_01', equipmentId: 'eq-003' },
    { meshName: 'Cooling_02', equipmentId: 'eq-004' },
    { meshName: 'Power_Main', equipmentId: 'eq-005' },
    { meshName: 'UPS_01', equipmentId: 'eq-006' }
];

// ======================
// INTERNAL STATE
// ======================

/**
 * 원본 material 저장 (정리 시 복원용)
 * Map<meshName, THREE.Material>
 */
this._originalMaterials = new Map();

/**
 * 현재 장비 상태 캐시
 * Map<equipmentId, { status, color }>
 */
this._equipmentStatusCache = new Map();

// ======================
// BINDINGS
// ======================

this.updateMeshStatus = updateMeshStatus.bind(this, meshStatusConfig);

// ======================
// SUBSCRIPTIONS
// ======================

this.subscriptions = {
    equipmentStatus: ['updateMeshStatus']
};

fx.go(
    Object.entries(this.subscriptions),
    fx.each(([topic, fnList]) =>
        fx.each(fn => this[fn] && subscribe(topic, this, this[fn]), fnList)
    )
);

// ======================
// 3D EVENT BINDING
// ======================

/**
 * 3D 이벤트 설정
 *
 * bind3DEvents는 raycasting 결과를 Weventbus로 발행
 * 페이지에서 @3dObjectClicked 핸들러로 처리
 */
this.customEvents = {
    click: '@3dObjectClicked'
};

/**
 * datasetInfo: 3D 클릭 시 상세 데이터 fetch를 위한 정보
 * 페이지의 이벤트 핸들러에서 fetchData(this, datasetName, param) 형태로 사용
 */
this.datasetInfo = [
    {
        datasetName: 'equipmentDetailApi',
        getParam: (intersectedObject) => {
            // intersectedObject에서 장비 ID 추출
            const meshName = intersectedObject?.name;
            const config = meshStatusConfig.find(c => c.meshName === meshName);
            return config ? { id: config.equipmentId } : null;
        }
    }
];

bind3DEvents(this, this.customEvents);

console.log('[Equipment3D] Registered with', meshStatusConfig.length, 'mesh mappings');

// ======================
// RENDER FUNCTIONS
// ======================

/**
 * 장비 상태 데이터를 받아 각 mesh의 material color를 업데이트
 *
 * @param {Array} meshStatusConfig - mesh 이름 ↔ 장비 ID 매핑
 * @param {{ response: { data: Array, meta: Object }}} payload - API 응답
 */
function updateMeshStatus(meshStatusConfig, { response }) {
    const { data } = response;
    if (!data || !Array.isArray(data)) return;

    // this.appendElement는 3D 컴포넌트에서 THREE.Object3D (MainGroup)
    const mainGroup = this.appendElement;
    if (!mainGroup) {
        console.warn('[Equipment3D] MainGroup not found');
        return;
    }

    // 상태 캐시 업데이트
    data.forEach(eq => {
        this._equipmentStatusCache.set(eq.id, {
            status: eq.status,
            color: eq.color
        });
    });

    // 각 mesh의 color 업데이트
    fx.go(
        meshStatusConfig,
        fx.each(({ meshName, equipmentId }) => {
            const equipment = data.find(eq => eq.id === equipmentId);
            if (!equipment) return;

            // MainGroup에서 해당 이름의 mesh 찾기
            const mesh = mainGroup.getObjectByName(meshName);
            if (!mesh) {
                console.warn(`[Equipment3D] Mesh not found: ${meshName}`);
                return;
            }

            // 원본 material 저장 (최초 1회)
            if (!this._originalMaterials.has(meshName) && mesh.material) {
                this._originalMaterials.set(meshName, mesh.material.clone());
            }

            // material color 업데이트
            if (mesh.material && mesh.material.color) {
                mesh.material.color.set(equipment.color);
                mesh.material.needsUpdate = true;
            }

            console.log(`[Equipment3D] ${meshName} → ${equipment.status} (${equipment.color})`);
        })
    );

    console.log('[Equipment3D] Mesh status updated for', data.length, 'equipments');
}
