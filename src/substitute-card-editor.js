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

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <ha-textfield
          label="School Number"
          .value="${this._config.schoolnumber || ''}"
          .configValue="${"schoolnumber"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
        <ha-textfield
          label="Username"
          .value="${this._config.username || ''}"
          .configValue="${"username"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
        <ha-textfield
          label="Password"
          type="password"
          .value="${this._config.password || ''}"
          .configValue="${"password"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
        <ha-textfield
          label="Class"
          .value="${this._config.class || ''}"
          .configValue="${"class"}"
          @input="${this._valueChanged}"
        ></ha-textfield>
        <ha-formfield .label=${"Show Date"}>
          <ha-switch
            .checked="${this._config.show_date !== false}"
            .configValue="${"show_date"}"
            @change="${this._valueChanged}"
          ></ha-switch>
        </ha-formfield>
      </div>
    `;
  }

  _valueChanged(e) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = e.target;
    const newConfig = { ...this._config };
    if (target.configValue) {
      newConfig[target.configValue] = target.checked !== undefined ? target.checked : target.value;
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig } }));
  }
}

customElements.define("substitute-card-editor", SubstituteCardEditor);
