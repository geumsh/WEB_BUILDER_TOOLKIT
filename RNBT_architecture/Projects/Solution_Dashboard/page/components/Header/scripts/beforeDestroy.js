const { removeCustomEvents } = Wkit;

// 1. Remove Wkit-managed custom events
removeCustomEvents(this, this.customEvents);
this.customEvents = null;

// 2. Remove manually-attached internal handlers
var root = this.appendElement;
if (this._internalHandlers) {
    root.querySelector('.gnb-inner')?.removeEventListener('click', this._internalHandlers.gnbClick);
    root.querySelector('.toggle')?.removeEventListener('click', this._internalHandlers.toggleClick);
}
this._internalHandlers = null;

// 3. Stop datetime interval
if (this._datetimeIntervalId != null) {
    clearInterval(this._datetimeIntervalId);
}
this._datetimeIntervalId = null;

// 4. Null out API methods and state
this.renderLogo          = null;
this.renderNav           = null;
this.renderToggle        = null;
this.renderCircleButtons = null;
this.startDatetime       = null;
this.stopDatetime        = null;
this.setConfig           = null;
this.setActiveNav        = null;
this.setActiveToggle     = null;
this.setButtonState      = null;
this._config             = null;
