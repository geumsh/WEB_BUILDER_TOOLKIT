/**
 * ActionPanel - 대시보드 액션 버튼 패널
 *
 * 기능:
 * 1. "온습도현황" / "온도분포도" 탭 전환
 * 2. 각 탭은 히트맵 모드를 전환 (습도 ↔ 온도)
 *    - 온습도현황(humidity): 습도 기반 히트맵 (SENSOR.HUMIDITY)
 *    - 온도분포도(temperature): 온도 기반 히트맵 (SENSOR.TEMP, CRAC.RETURN_TEMP)
 * 3. 중심 인스턴스는 this._centerComponentName으로 지정 (ins.name 매칭, 런타임 설정)
 *
 * 속성 (런타임 설정):
 * - _centerComponentName: 히트맵 중심이 될 3D 컴포넌트의 name (ins.name)
 * - _refreshInterval: 히트맵 데이터 갱신 주기 (ms, 기본 30000)
 */

const { bindEvents, makeIterator } = Wkit;
const { applyHeatmapMixin } = HeatmapMixin;

// ======================
// HEATMAP PRESETS
// ======================

const HEATMAP_PRESETS = {
  humidity: {
    temperatureMetrics: ['SENSOR.HUMIDITY', 'CRAC.RETURN_HUMIDITY'],
    gradient: {
      0.00: '#154360',
      0.37: '#5DADE2',
      0.69: '#27AE60',
      0.78: '#A9DFBF',
      0.98: '#F39C12',
      1.00: '#C0392B',
    },
    temperatureRange: { min: 20, max: 71 },
  },
  temperature: {
    temperatureMetrics: ['SENSOR.TEMP', 'CRAC.RETURN_TEMP'],
    gradient: null,
    temperatureRange: { min: 17, max: 31 },
  },
};

initComponent.call(this);

function initComponent() {
  // ======================
  // 1. STATE
  // ======================
  this._activeTab = null; // null | 'humidity' | 'temperature'
  this._centerComponentName = ''; // 히트맵 중심 3D 컴포넌트 이름 (런타임 설정)
  this._refreshInterval = 30000; // 히트맵 데이터 갱신 주기 (ms)
  this._centerInstance = null; // 중심 3D 인스턴스 참조
  this._heatmapApplied = false; // mixin 적용 여부
  this._internalHandlers = {};

  // ======================
  // 2. CUSTOM EVENTS
  // ======================
  this.customEvents = {};
  bindEvents(this, this.customEvents);

  // ======================
  // 3. INTERNAL HANDLERS
  // ======================
  setupInternalHandlers.call(this);

  // ======================
  // 4. INITIAL STATE
  // ======================
  syncTabUI.call(this);

  console.log('[ActionPanel] Registered');
}

// ======================
// INTERNAL EVENT HANDLERS
// ======================

function setupInternalHandlers() {
  const root = this.appendElement;
  const ctx = this;

  this._internalHandlers = {
    btnClick: function (e) {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      if (!action) return;

      handleTabSwitch.call(ctx, action);
    },
  };

  const panel = root.querySelector('.action-panel');
  if (panel) panel.addEventListener('click', this._internalHandlers.btnClick);
}

// ======================
// TAB SWITCH
// ======================

function handleTabSwitch(action) {
  if (action === this._activeTab) {
    // 같은 탭 재클릭 → 비활성화
    this._activeTab = null;
    syncTabUI.call(this);
    deactivateHeatmap.call(this);
  } else {
    // 다른 탭 클릭 → 모드 전환
    this._activeTab = action;
    syncTabUI.call(this);
    activateHeatmap.call(this, action);
  }
}

/**
 * 히트맵 OFF
 */
function deactivateHeatmap() {
  if (this._centerInstance && this._centerInstance._heatmap && this._centerInstance._heatmap.visible) {
    this._centerInstance.toggleHeatmap();
  }
}

function syncTabUI() {
  const root = this.appendElement;
  const btns = root.querySelectorAll('.action-btn');

  btns.forEach(function (btn) {
    if (btn.dataset.action === this._activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }.bind(this));
}

// ======================
// HEATMAP CONTROL
// ======================

/**
 * 히트맵 활성화 또는 모드 전환
 * - 최초: mixin 적용 → toggleHeatmap ON
 * - 이후: updateHeatmapConfig로 프리셋 전환
 */
function activateHeatmap(action) {
  // 중심 인스턴스 찾기
  if (!this._centerInstance) {
    this._centerInstance = findCenterInstance.call(this);
  }

  if (!this._centerInstance) {
    console.warn('[ActionPanel] Center instance not found:', this._centerComponentName);
    return;
  }

  const preset = HEATMAP_PRESETS[action];

  // mixin 최초 적용 (1회)
  if (!this._heatmapApplied) {
    applyHeatmapMixin(this._centerInstance, Object.assign({
      refreshInterval: this._refreshInterval || 30000,
    }, preset));
    this._heatmapApplied = true;
    console.log('[ActionPanel] HeatmapMixin applied to:', this._centerComponentName);

    // 히트맵 ON
    this._centerInstance.toggleHeatmap();
  } else {
    // 프리셋 전환
    this._centerInstance.updateHeatmapConfig(preset);

    // 비활성 상태에서 재활성화
    if (!this._centerInstance._heatmap.visible) {
      this._centerInstance.toggleHeatmap();
    }
  }
}

// ======================
// HELPERS
// ======================

/**
 * threeLayer에서 name이 centerComponentName과 일치하는 인스턴스 검색
 */
function findCenterInstance() {
  const targetName = this._centerComponentName;
  if (!targetName) return null;

  const iter = makeIterator(this.page, 'threeLayer');

  for (const inst of iter) {
    if (inst.name === targetName) {
      return inst;
    }
  }

  return null;
}
