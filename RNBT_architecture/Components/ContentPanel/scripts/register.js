/*
 * ContentPanel Component - register
 * 범용 컨테이너 (Shell) - 내부 .contents 그룹을 외부에서 주입
 *
 * Subscribes to: 없음 (패시브 컨테이너)
 * Events: 없음
 *
 * Config:
 *   slots: Array<{ id: string, html: string }>
 *     - id: 슬롯 고유 식별자 (DOM에 data-slot-id 속성으로 부여)
 *     - html: 초기 innerHTML (빈 문자열 가능)
 *     - 배열 순서 = 렌더링 순서
 *
 * Slot API:
 *   updateSlot(slotId, html)
 *     - 해당 슬롯의 innerHTML 교체. 없으면 새로 생성 (upsert)
 *
 *   getSlot(slotId)
 *     - 슬롯 DOM 요소 반환 (없으면 null)
 *
 *   removeSlot(slotId)
 *     - 해당 슬롯 제거
 *
 * Legacy API (호환 유지):
 *   renderContents(contentsHtmlArray)
 *     - contentsHtmlArray: string[] - 각 항목이 하나의 .contents innerHTML
 *     - 기존 내용을 교체하고 새로운 .contents 그룹을 렌더링
 *
 *   appendContents(contentsHtml)
 *     - contentsHtml: string - 하나의 .contents innerHTML
 *     - 기존 내용 유지하면서 .contents 그룹 추가
 *
 *   clearContents()
 *     - 모든 .contents 그룹 제거
 */

// ======================
// CONFIG
// ======================

const config = {
  slots: [
    // { id: 'slotId', html: '<div>initial content</div>' }
  ],
};

// ======================
// BINDINGS - Legacy API
// ======================

this.renderContents = renderContents.bind(this);
this.appendContents = appendContents.bind(this);
this.clearContents = clearContents.bind(this);

// ======================
// BINDINGS - Slot API
// ======================

this.updateSlot = updateSlot.bind(this);
this.getSlot = getSlot.bind(this);
this.removeSlot = removeSlot.bind(this);

// ======================
// INIT FROM CONFIG
// ======================

initFromConfig.call(this);

// ======================
// SLOT API FUNCTIONS
// ======================

/**
 * 슬롯 innerHTML 교체 또는 새로 생성 (upsert)
 * @param {string} slotId - 슬롯 고유 ID
 * @param {string} html - 슬롯 내부 HTML
 */
function updateSlot(slotId, html) {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;

  let slot = panel.querySelector('.contents[data-slot-id="' + slotId + '"]');

  if (!slot) {
    slot = document.createElement("div");
    slot.className = "contents";
    slot.setAttribute("data-slot-id", slotId);
    panel.appendChild(slot);
  }

  slot.innerHTML = html;
}

/**
 * 슬롯 DOM 요소 반환
 * @param {string} slotId - 슬롯 고유 ID
 * @returns {HTMLElement|null}
 */
function getSlot(slotId) {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return null;

  return panel.querySelector('.contents[data-slot-id="' + slotId + '"]');
}

/**
 * 슬롯 제거
 * @param {string} slotId - 슬롯 고유 ID
 */
function removeSlot(slotId) {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;

  const slot = panel.querySelector('.contents[data-slot-id="' + slotId + '"]');
  if (slot) {
    panel.removeChild(slot);
  }
}

// ======================
// CONFIG INIT
// ======================

/**
 * config.slots 기반으로 초기 .contents 생성
 */
function initFromConfig() {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;
  if (!Array.isArray(config.slots) || config.slots.length === 0) return;

  config.slots.forEach(function (slotDef) {
    const contentsDiv = document.createElement("div");
    contentsDiv.className = "contents";
    contentsDiv.setAttribute("data-slot-id", slotDef.id);
    contentsDiv.innerHTML = slotDef.html || "";
    panel.appendChild(contentsDiv);
  });
}

// ======================
// LEGACY RENDER FUNCTIONS
// ======================

/**
 * 모든 .contents 그룹을 교체
 * @param {string[]} contentsHtmlArray - 각 항목이 .contents 내부 HTML
 */
function renderContents(contentsHtmlArray) {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;

  panel.innerHTML = "";

  if (!Array.isArray(contentsHtmlArray)) return;

  contentsHtmlArray.forEach((html) => {
    const contentsDiv = document.createElement("div");
    contentsDiv.className = "contents";
    contentsDiv.innerHTML = html;
    panel.appendChild(contentsDiv);
  });
}

/**
 * .contents 그룹 하나 추가
 * @param {string} contentsHtml - .contents 내부 HTML
 */
function appendContents(contentsHtml) {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;

  const contentsDiv = document.createElement("div");
  contentsDiv.className = "contents";
  contentsDiv.innerHTML = contentsHtml;
  panel.appendChild(contentsDiv);
}

/**
 * 모든 .contents 그룹 제거
 */
function clearContents() {
  const panel = this.appendElement.querySelector(".content-panel");
  if (!panel) return;

  panel.innerHTML = "";
}
