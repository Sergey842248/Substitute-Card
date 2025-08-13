import { LitElement, html, css } from 'lit-element';
import { fireEvent } from 'home-assistant-js-websocket/dist/util';

class SubstituteCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  setConfig(config) {
    this.config = config;
  }

  get _schoolnumber() {
    return this.config.schoolnumber || "";
  }

  get _username() {
    return this.config.username || "";
  }

  get _password() {
    return this.config.password || "";
  }

  get _class() {
    return this.config.class || "";
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    return html`
      <div class="card-config">
        <paper-input
          label="School Number"
          .value="${this._schoolnumber}"
          .configValue="${"schoolnumber"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <paper-input
          label="Username"
          .value="${this._username}"
          .configValue="${"username"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <paper-input
          label="Password"
          type="password"
          .value="${this._password}"
          .configValue="${"password"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <paper-input
          label="Class"
          .value="${this._class}"
          .configValue="${"class"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      this.config = {
        ...this.config,
        [target.configValue]: target.value,
      };
    }
    fireEvent(this, "config-changed", { config: this.config });
  }

  static get styles() {
    return css`
      .card-config paper-input {
        width: 100%;
      }
    `;
  }
}

customElements.define("substitute-card-editor", SubstituteCardEditor);
