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

    const schema = [
      { name: "schoolnumber", required: true, selector: { text: {} } },
      { name: "username", required: true, selector: { text: {} } },
      { name: "password", required: true, selector: { text: { type: "password" } } },
      { name: "class", required: true, selector: { text: {} } },
      { name: "show_date", required: false, selector: { boolean: {} } },
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _computeLabel(schema) {
    return schema.name;
  }

  _valueChanged(ev) {
    const config = ev.detail.value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config } }));
  }
}

customElements.define("substitute-card-editor", SubstituteCardEditor);
