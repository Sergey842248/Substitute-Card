class SubstituteCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    const style = document.createElement('style');
    style.textContent = `
      ha-textfield, ha-switch { display: block; margin-bottom: 16px; }
    `;

    this.shadowRoot.innerHTML = ''; // Clear previous content
    this.shadowRoot.appendChild(style);

    const createTextField = (configValue, label, type = 'text') => {
      const textField = document.createElement('ha-textfield');
      textField.label = label;
      textField.value = this._config[configValue] || '';
      textField.dataset.configValue = configValue;
      textField.type = type;
      textField.addEventListener('input', this._valueChanged.bind(this));
      return textField;
    };

    const createSwitch = (configValue, label) => {
        const formfield = document.createElement('ha-formfield');
        formfield.label = label;
        const haSwitch = document.createElement('ha-switch');
        haSwitch.checked = this._config[configValue] !== false;
        haSwitch.dataset.configValue = configValue;
        haSwitch.addEventListener('change', this._valueChanged.bind(this));
        formfield.appendChild(haSwitch);
        return formfield;
    };

    this.shadowRoot.appendChild(createTextField('schoolnumber', 'School Number'));
    this.shadowRoot.appendChild(createTextField('username', 'Username'));
    this.shadowRoot.appendChild(createTextField('password', 'Password', 'password'));
    this.shadowRoot.appendChild(createTextField('class', 'Class'));
    this.shadowRoot.appendChild(createSwitch('show_date', 'Show Date'));
  }

  _valueChanged(e) {
    if (!this._config) {
      return;
    }
    const target = e.target;
    const newConfig = { ...this._config };
    const configValue = target.dataset.configValue;
    
    if (configValue) {
        newConfig[configValue] = target.checked !== undefined ? target.checked : target.value;
    }

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("substitute-card-editor", SubstituteCardEditor);
