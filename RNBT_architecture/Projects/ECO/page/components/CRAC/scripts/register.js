/**
 * CRAC (Computer Room Air Conditioning) - 3D Popup Component
 *
 * 항온항습기 컴포넌트 (기획서 v.0.8_260128 기준)
 * - ① 기본정보 테이블 (assetDetailUnified + mdl/g + vdr/g 체이닝)
 * - 상태정보 카드 (현재/설정 온습도)
 * - ② 상태 인디케이터 (6개 BOOL: 팬, 냉방, 난방, 가습, 제습, 누수)
 * - ③ 온/습도 현황 트렌드 차트 (mhs/l → bar+line dual-axis)
 */

const { bind3DEvents, fetchData } = Wkit;
const { applyShadowPopupMixin, applyEChartsMixin } = PopupMixin;

const BASE_URL = '10.23.128.125:4004';

// ======================
// TEMPLATE HELPER
// ======================
function extractTemplate(htmlCode, templateId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlCode, 'text/html');
  const template = doc.querySelector(`template#${templateId}`);
  return template?.innerHTML || '';
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

initComponent.call(this);

function initComponent() {
  // ======================
  // 1. 내부 상태
  // ======================
  this._defaultAssetKey = this.setter?.assetInfo?.assetKey || this.id;
  this._baseUrl = BASE_URL;
  this._refreshIntervalId = null;

  // ======================
  // 2. 변환 함수 바인딩
  // ======================
  this.statusTypeToLabel = statusTypeToLabel.bind(this);
  this.statusTypeToDataAttr = statusTypeToDataAttr.bind(this);
  this.formatDate = formatDate.bind(this);
  this.formatTimestamp = formatTimestamp.bind(this);

  // ======================
  // 3. Config 통합 (this.config로 모든 설정 접근)
  // ======================
  this.config = {
    // 데이터셋 이름
    datasetNames: {
      assetDetail: 'assetDetailUnified',
      metricLatest: 'metricLatest',
      metricHistory: 'metricHistoryStats',
      modelDetail: 'modelDetail',
      vendorDetail: 'vendorDetail',
    },

    // 템플릿
    template: {
      popup: 'popup-crac',
    },

    // 이벤트
    events: {
      click: '@assetClicked',
    },

    // 갱신 주기
    refresh: {
      interval: 5000,
    },

    // ========================
    // UI 영역별 설정
    // ========================

    // 팝업 헤더 영역
    header: {
      fields: [
        { key: 'name', selector: '.crac-name' },
        { key: 'locationLabel', selector: '.crac-zone' },
        { key: 'statusType', selector: '.crac-status', transform: this.statusTypeToLabel },
        { key: 'statusType', selector: '.crac-status', dataAttr: 'status', transform: this.statusTypeToDataAttr },
      ],
    },

    // 기본정보 테이블 영역
    infoTable: {
      fields: [
        { key: 'name', selector: '.info-name' },
        { key: 'assetType', selector: '.info-type' },
        { key: 'usageLabel', selector: '.info-usage', fallback: '-' },
        { key: 'locationLabel', selector: '.info-location' },
        { key: 'statusType', selector: '.info-status', transform: this.statusTypeToLabel },
        { key: 'installDate', selector: '.info-install-date', transform: this.formatDate },
      ],
      chain: {
        model: '.info-model',
        vendor: '.info-vendor',
      },
    },

    // 상태정보 카드 영역 (온습도 현재값/설정값)
    statusCards: {
      metrics: {
        currentTemp:  { metricCode: 'CRAC.RETURN_TEMP',     selector: '.current-temp',     scale: 0.1 },
        setTemp:      { metricCode: 'CRAC.TEMP_SET',        selector: '.set-temp',         scale: 0.1 },
        currentHumid: { metricCode: 'CRAC.RETURN_HUMIDITY', selector: '.current-humidity', scale: 0.1 },
        setHumid:     { metricCode: 'CRAC.HUMIDITY_SET',    selector: '.set-humidity',     scale: 0.1 },
      },
      selectors: {
        timestamp: '.section-timestamp',
      },
    },

    // 상태 인디케이터 영역 (6개 BOOL dot)
    indicators: {
      metrics: {
        'CRAC.FAN_STATUS':        { label: '팬상태',       isLeak: false },
        'CRAC.COOL_STATUS':       { label: '냉방동작상태', isLeak: false },
        'CRAC.HEAT_STATUS':       { label: '난방동작상태', isLeak: false },
        'CRAC.HUMIDIFY_STATUS':   { label: '가습상태',     isLeak: false },
        'CRAC.DEHUMIDIFY_STATUS': { label: '제습상태',     isLeak: false },
        'CRAC.LEAK_STATUS':       { label: '누수상태',     isLeak: true },
      },
      selectors: {
        indicator: '.indicator',
        dot: '.indicator-dot',
      },
    },

    // 트렌드 차트 영역 (바+라인 복합)
    chart: {
      series: {
        temp:     { metricCode: 'CRAC.RETURN_TEMP',     label: '온도', unit: '°C',  color: '#3b82f6', scale: 0.1 },
        humidity: { metricCode: 'CRAC.RETURN_HUMIDITY', label: '습도', unit: '%',   color: '#22c55e', scale: 0.1 },
      },
      selectors: {
        container: '.chart-container',
      },
    },
  };

  // ======================
  // 4. 데이터셋 정의
  // ======================
  const { datasetNames } = this.config;
  this.datasetInfo = [
    { datasetName: datasetNames.assetDetail, param: { baseUrl: this._baseUrl, assetKey: this._defaultAssetKey, locale: 'ko' }, render: ['renderBasicInfo'] },
    { datasetName: datasetNames.metricLatest, param: { baseUrl: this._baseUrl, assetKey: this._defaultAssetKey }, render: ['renderStatusCards', 'renderIndicators'] },
    {
      datasetName: datasetNames.metricHistory,
      param: {
        baseUrl: this._baseUrl,
        assetKey: this._defaultAssetKey,
        interval: '1h',
        timeRange: 24 * 60 * 60 * 1000,
        metricCodes: ['CRAC.RETURN_TEMP', 'CRAC.RETURN_HUMIDITY'],
        statsKeys: ['avg'],
      },
      render: ['renderTrendChart'],
    },
  ];

  // ======================
  // 5. 렌더링 함수 바인딩
  // ======================
  this.renderBasicInfo = renderBasicInfo.bind(this);
  this.renderStatusCards = renderStatusCards.bind(this);
  this.renderIndicators = renderIndicators.bind(this);
  this.renderTrendChart = renderTrendChart.bind(this);
  this.renderError = renderError.bind(this);

  // ======================
  // 6. Public Methods
  // ======================
  this.showDetail = showDetail.bind(this);
  this.hideDetail = hideDetail.bind(this);
  this.refreshMetrics = refreshMetrics.bind(this);
  this.stopRefresh = stopRefresh.bind(this);

  // ======================
  // 7. 이벤트 발행
  // ======================
  bind3DEvents(this, this.config.events);

  // ======================
  // 8. Popup (template 기반)
  // ======================
  const popupCreatedConfig = {
    chartSelector: this.config.chart.selectors.container,
    events: {
      click: {
        '.close-btn': () => this.hideDetail(),
      },
    },
  };

  const { htmlCode, cssCode } = this.properties.publishCode || {};
  this.getPopupHTML = () => extractTemplate(htmlCode || '', this.config.template.popup);
  this.getPopupStyles = () => cssCode || '';
  this.onPopupCreated = onPopupCreated.bind(this, popupCreatedConfig);

  applyShadowPopupMixin(this, {
    getHTML: this.getPopupHTML,
    getStyles: this.getPopupStyles,
    onCreated: this.onPopupCreated,
  });

  applyEChartsMixin(this);

  console.log('[CRAC] Registered:', this._defaultAssetKey);
}

// ======================
// PUBLIC METHODS
// ======================

function showDetail() {
  this.showPopup();

  const { datasetNames, refresh } = this.config;

  // 1) assetDetailUnified + metricLatest 호출 (섹션별 독립 처리)
  // metricHistoryStats는 fetchTrendData에서 fetch API로 직접 호출하므로 제외
  fx.go(
    this.datasetInfo.filter(d => d.datasetName !== datasetNames.metricHistory),
    fx.each(({ datasetName, param, render }) =>
      fx.go(
        fetchData(this.page, datasetName, param),
        (response) => {
          if (!response || !response.response) {
            console.warn(`[CRAC] ${datasetName} fetch failed - no response`);
            return;
          }
          const data = response.response.data;
          if (data === null || data === undefined) {
            console.warn(`[CRAC] ${datasetName} - no data`);
            return;
          }
          fx.each((fn) => this[fn](response), render);
        }
      )
    )
  ).catch((e) => {
    console.error('[CRAC] Data load error:', e);
  });

  // 2) 트렌드 차트 호출 (mhs/l)
  fetchTrendData.call(this);

  // 3) 5초 주기로 메트릭 갱신 시작
  this.stopRefresh();
  this._refreshIntervalId = setInterval(() => this.refreshMetrics(), refresh.interval);
  console.log('[CRAC] Metric refresh started (5s interval)');
}

function hideDetail() {
  this.stopRefresh();
  this.hidePopup();
}

function refreshMetrics() {
  const { datasetNames } = this.config;
  const metricInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricLatest);
  fx.go(
    fetchData(this.page, datasetNames.metricLatest, metricInfo.param),
    (response) => {
      if (!response || !response.response) return;
      const data = response.response.data;
      if (data === null || data === undefined) return;
      this.renderStatusCards(response);
      this.renderIndicators(response);
    }
  ).catch((e) => {
    console.warn('[CRAC] Metric refresh failed:', e);
  });
}

function stopRefresh() {
  if (this._refreshIntervalId) {
    clearInterval(this._refreshIntervalId);
    this._refreshIntervalId = null;
    console.log('[CRAC] Metric refresh stopped');
  }
}

// ======================
// TREND DATA FETCH
// ======================

async function fetchTrendData() {
  const { datasetNames } = this.config;
  const trendInfo = this.datasetInfo.find(d => d.datasetName === datasetNames.metricHistory);
  if (!trendInfo) return;

  const { baseUrl, assetKey, interval, timeRange, metricCodes, statsKeys } = trendInfo.param;
  const now = new Date();
  const from = new Date(now.getTime() - timeRange);

  try {
    const response = await fetch(`http://${baseUrl}/api/v1/mhs/l`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: {
          assetKey,
          interval,
          metricCodes,
          timeFrom: from.toISOString().replace('T', ' ').slice(0, 19),
          timeTo: now.toISOString().replace('T', ' ').slice(0, 19),
        },
        statsKeys,
        sort: [],
      }),
    });

    const result = await response.json();
    if (!result || !result.success) {
      console.warn('[CRAC] Trend data unavailable');
      return;
    }
    // Wkit.fetchData 형태로 래핑하여 renderTrendChart에 전달
    this.renderTrendChart({ response: { data: result.data } });
  } catch (e) {
    console.warn('[CRAC] Trend fetch failed:', e);
  }
}

// ======================
// RENDER: 기본정보 테이블
// ======================

function renderBasicInfo({ response }) {
  const { data } = response;
  if (!data || !data.asset) {
    renderError.call(this, '자산 데이터가 없습니다.');
    return;
  }

  const asset = data.asset;
  const { header, infoTable, datasetNames } = this.config;

  // Header 영역
  fx.go(
    header.fields,
    fx.each(({ key, selector, dataAttr, transform }) => {
      const el = this.popupQuery(selector);
      if (!el) return;
      let value = asset[key];
      if (transform) value = transform(value);
      if (dataAttr) {
        el.dataset[dataAttr] = value;
      } else {
        el.textContent = value;
      }
    })
  );

  // 기본정보 테이블 (config 기반)
  const setCell = (selector, value) => {
    const el = this.popupQuery(selector);
    if (el) el.textContent = value ?? '-';
  };

  fx.go(
    infoTable.fields,
    fx.each(({ key, selector, transform, fallback }) => {
      let value = asset[key] ?? fallback ?? '-';
      if (transform) value = transform(value);
      setCell(selector, value);
    })
  );

  // 제조사명/모델 체이닝: assetModelKey → mdl/g → vdr/g
  if (asset.assetModelKey) {
    fx.go(
      fetchData(this.page, datasetNames.modelDetail, { baseUrl: this._baseUrl, assetModelKey: asset.assetModelKey }),
      (modelResp) => {
        if (!modelResp?.response?.data) return;
        const model = modelResp.response.data;
        setCell(infoTable.chain.model, model.name);

        if (model.assetVendorKey) {
          fx.go(
            fetchData(this.page, datasetNames.vendorDetail, { baseUrl: this._baseUrl, assetVendorKey: model.assetVendorKey }),
            (vendorResp) => {
              if (!vendorResp?.response?.data) return;
              setCell(infoTable.chain.vendor, vendorResp.response.data.name);
            }
          ).catch(() => {});
        }
      }
    ).catch(() => {});
  }
}

// ======================
// RENDER: 상태정보 카드 (온습도 현재값/설정값)
// ======================

function renderStatusCards({ response }) {
  const { data } = response;
  const { statusCards } = this.config;
  const { metrics, selectors } = statusCards;
  const timestampEl = this.popupQuery(selectors.timestamp);

  if (!data || !Array.isArray(data) || data.length === 0) return;

  if (timestampEl && data[0]?.eventedAt) {
    timestampEl.textContent = this.formatTimestamp(data[0].eventedAt);
  }

  const metricMap = {};
  data.forEach((m) => { metricMap[m.metricCode] = m; });

  // 각 카드에 값 설정
  Object.values(metrics).forEach((config) => {
    const el = this.popupQuery(config.selector);
    if (!el) return;

    const metric = metricMap[config.metricCode];
    if (!metric) {
      el.textContent = '-';
      return;
    }

    const value = metric.valueNumber;
    el.textContent = config.scale ? (value * config.scale).toFixed(1) : value;
  });
}

// ======================
// RENDER: 상태 인디케이터 (6개 BOOL dot)
// ======================

function renderIndicators({ response }) {
  const { data } = response;
  if (!data || !Array.isArray(data)) return;

  const { indicators } = this.config;
  const { metrics, selectors } = indicators;

  const metricMap = {};
  data.forEach((m) => { metricMap[m.metricCode] = m; });

  const indicatorEls = this.popupQueryAll(selectors.indicator);
  if (!indicatorEls) return;

  indicatorEls.forEach((el) => {
    const code = el.dataset.metric;
    const dot = el.querySelector(selectors.dot);
    if (!dot || !code) return;

    const metric = metricMap[code];
    if (!metric) {
      dot.dataset.state = 'unknown';
      return;
    }

    // 누수(LEAK)는 true=에러, 나머지는 true=정상
    const config = metrics[code];
    const isLeak = config?.isLeak ?? false;
    const isOn = metric.valueBool;

    if (isLeak) {
      dot.dataset.state = isOn ? 'error' : 'ok';
    } else {
      dot.dataset.state = isOn ? 'on' : 'off';
    }
  });
}

// ======================
// RENDER: 트렌드 차트 (bar: 온도, line: 습도)
// ======================

function renderTrendChart({ response }) {
  const { data } = response;
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('[CRAC] renderTrendChart: no data');
    return;
  }

  const { chart } = this.config;
  const { series, selectors } = chart;
  const tempConfig = series.temp;
  const humidConfig = series.humidity;

  // data를 시간별로 그룹핑
  const timeMap = {};
  data.forEach((row) => {
    const hour = new Date(row.time).getHours() + '시';
    if (!timeMap[hour]) timeMap[hour] = {};
    timeMap[hour][row.metricCode] = row.statsBody?.avg ?? null;
  });

  const hours = Object.keys(timeMap);
  const tempData = hours.map((h) => {
    const raw = timeMap[h][tempConfig.metricCode];
    return raw != null ? +(raw * tempConfig.scale).toFixed(1) : null;
  });
  const humidityData = hours.map((h) => {
    const raw = timeMap[h][humidConfig.metricCode];
    return raw != null ? +(raw * humidConfig.scale).toFixed(1) : null;
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 31, 46, 0.95)',
      borderColor: '#2a3142',
      textStyle: { color: '#e0e6ed', fontSize: 12 },
    },
    legend: {
      data: [tempConfig.label, humidConfig.label],
      top: 8,
      textStyle: { color: '#8892a0', fontSize: 11 },
    },
    grid: { left: 50, right: 50, top: 40, bottom: 24 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: { lineStyle: { color: '#333' } },
      axisLabel: { color: '#888', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: tempConfig.unit,
        position: 'left',
        axisLine: { show: true, lineStyle: { color: tempConfig.color } },
        axisLabel: { color: '#888', fontSize: 10 },
        splitLine: { lineStyle: { color: '#333' } },
      },
      {
        type: 'value',
        name: humidConfig.unit,
        position: 'right',
        axisLine: { show: true, lineStyle: { color: humidConfig.color } },
        axisLabel: { color: '#888', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: tempConfig.label,
        type: 'bar',
        yAxisIndex: 0,
        data: tempData,
        barWidth: '40%',
        itemStyle: { color: hexToRgba(tempConfig.color, 0.7), borderRadius: [2, 2, 0, 0] },
      },
      {
        name: humidConfig.label,
        type: 'line',
        yAxisIndex: 1,
        data: humidityData,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: humidConfig.color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(humidConfig.color, 0.2) },
              { offset: 1, color: hexToRgba(humidConfig.color, 0) },
            ],
          },
        },
      },
    ],
  };

  this.updateChart(selectors.container, option);
}

// ======================
// RENDER: 에러
// ======================

function renderError(message) {
  const nameEl = this.popupQuery(this.selectors.name);
  const zoneEl = this.popupQuery(this.selectors.zone);
  const statusEl = this.popupQuery(this.selectors.status);

  if (nameEl) nameEl.textContent = '데이터 없음';
  if (zoneEl) zoneEl.textContent = message;
  if (statusEl) {
    statusEl.textContent = 'Error';
    statusEl.dataset.status = 'critical';
  }

  console.warn('[CRAC] renderError:', message);
}

// ======================
// TRANSFORM FUNCTIONS
// ======================

function statusTypeToLabel(statusType) {
  const labels = {
    ACTIVE: '정상운영',
    WARNING: '주의',
    CRITICAL: '위험',
    INACTIVE: '비활성',
    MAINTENANCE: '유지보수',
  };
  return labels[statusType] || statusType;
}

function statusTypeToDataAttr(statusType) {
  const map = {
    ACTIVE: 'normal',
    WARNING: 'warning',
    CRITICAL: 'critical',
    INACTIVE: 'inactive',
    MAINTENANCE: 'maintenance',
  };
  return map[statusType] || 'normal';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

// ======================
// POPUP LIFECYCLE
// ======================

function onPopupCreated({ chartSelector, events }) {
  chartSelector && this.createChart(chartSelector);
  events && this.bindPopupEvents(events);
}
