const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

class SubstituteCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  setConfig(config) {
    this._config = config;
  }

  focus() {
    this.shadowRoot.querySelector("paper-input").focus();
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="config-row">
          <paper-input
            label="School Number"
            value="${this._config.schoolnumber}"
            .configValue="${"schoolnumber"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Username"
            value="${this._config.username}"
            .configValue="${"username"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Password"
            type="password"
            value="${this._config.password}"
            .configValue="${"password"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="config-row">
          <paper-input
            label="Class"
            value="${this._config.class}"
            .configValue="${"class"}"
            @value-changed="${this._valueChanged}"
          ></paper-input>
        </div>
        <div class="config-row">
          <ha-switch
            .checked="${this._config.show_date !== false}"
            .configValue="${"show_date"}"
            @change="${this._valueChanged}"
            >Show Date</ha-switch
          >
        </div>
      </div>
    `;
  }

  _valueChanged(e) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = e.target;
    if (this[`_${target.id}`] === target.value) {
      return;
    }
    if (target.configValue) {
      this._config[target.configValue] = target.value;
    } else {
      this._config[target.id] = target.checked !== undefined ? target.checked : target.value;
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }
}

customElements.define("substitute-card-editor", SubstituteCardEditor);
