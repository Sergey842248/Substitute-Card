import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';

@customElement('substitute-card-editor')
export class SubstituteCardEditor extends LitElement {
  @property({ attribute: false }) hass;
  @state() _config;

  setConfig(config) {
    this._config = config;
  }

  get _schoolnumber() {
    return this._config.schoolnumber || '';
  }

  get _username() {
    return this._config.username || '';
  }

  get _password() {
    return this._config.password || '';
  }

  get _class() {
    return this._config.class || '';
  }

  static get styles() {
    return css`
      .table {
        display: table;
        width: 100%;
      }
      .row {
        display: table-row;
      }
      .cell {
        display: table-cell;
        padding: 0 8px 12px;
      }
      .cell.label {
        width: 30%;
      }
      .cell.content {
        width: 70%;
      }
    `;
  }

  render() {
    return html`
      <div class="table">
        <div class="row">
          <div class="cell label">School Number</div>
          <div class="cell content">
            <paper-input
              label="School Number"
              .value="${this._schoolnumber}"
              .configValue="${'schoolnumber'}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          </div>
        </div>
        <div class="row">
          <div class="cell label">Username</div>
          <div class="cell content">
            <paper-input
              label="Username"
              .value="${this._username}"
              .configValue="${'username'}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          </div>
        </div>
        <div class="row">
          <div class="cell label">Password</div>
          <div class="cell content">
            <paper-input
              label="Password"
              type="password"
              .value="${this._password}"
              .configValue="${'password'}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          </div>
        </div>
        <div class="row">
          <div class="cell label">Class</div>
          <div class="cell content">
            <paper-input
              label="Class"
              .value="${this._class}"
              .configValue="${'class'}"
              @value-changed="${this._valueChanged}"
            ></paper-input>
          </div>
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      this._config = {
        ...this._config,
        [target.configValue]: target.value,
      };
    }
    fireEvent(this, 'config-changed', { config: this._config });
  }
}
