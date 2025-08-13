import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import './substitute-card-editor'; // Import the editor

@customElement('substitute-card')
class SubstituteCard extends LitElement {
  @property({ attribute: false }) hass;
  @state() config;
  @state() _error = null;
  @state() _isProxyError = false;

  static get styles() {
    return css`
      .changed-item {
        color: red !important;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
      .error-message {
        color: red;
        font-weight: bold;
      }
      .proxy-button {
        margin-top: 10px;
        padding: 10px 15px;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    `;
  }

  setConfig(config) {
    if (!config.schoolnumber || !config.username || !config.password || !config.class) {
      throw new Error("Please configure schoolnumber, username, password and class");
    }
    this.config = config;
    this._error = null;
    this._isProxyError = false;
    this.fetchData();
  }

  render() {
    if (this._error) {
      return html`
        <ha-card header="Substitution plan">
          <div class="card-content">
            <p class="error-message">${this._error}</p>
            ${this._isProxyError ? html`
              <p>This may be due to the CORS-Anywhere proxy. Please click the button below to activate it, then reload the page.</p>
              <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank" rel="noopener noreferrer">
                  <button class="proxy-button">Activate Proxy</button>
              </a>
            ` : ''}
          </div>
        </ha-card>
      `;
    }

    if (!this.config) {
      return html`
        <ha-card header="Substitution plan">
          <div class="card-content">
            <p>Lade Vertretungsplan...</p>
          </div>
        </ha-card>
      `;
    }

    // Initial render or loading state
    return html`
      <ha-card header="Substitution plan">
        <div class="card-content" id="card-content">
          <p>Lade Vertretungsplan...</p>
        </div>
      </ha-card>
    `;
  }

  firstUpdated() {
    if (this.config) {
      this.fetchData();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('config') && this.config) {
      this.fetchData();
    }
  }

  displayError(error, isProxyError = false) {
    this._error = error;
    this._isProxyError = isProxyError;
  }

  async fetchData() {
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const targetUrl = `https://www.stundenplan24.de/${this.config.schoolnumber}/mobil/mobdaten/Klassen.xml`;
    const url = proxyUrl + targetUrl;

    console.log("Fetching data from:", url);

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(this.config.username + ":" + this.config.password));
    headers.set('X-Requested-With', 'XMLHttpRequest');


    try {
      const response = await fetch(url, { headers });
      console.log("Response:", response);
      if (!response.ok) {
        this.displayError(`Error fetching data: ${response.statusText}`, response.status === 403);
        return;
      }
      const xmlText = await response.text();
      console.log("XML Text:", xmlText);
      const data = this.xmlToJson(new DOMParser().parseFromString(xmlText, 'text/xml'));
      console.log("JSON Data:", data);
      this.processData(data);
    } catch (error) {
      console.error("Fetch Error:", error);
      this.displayError(`Error fetching data: ${error.message}`);
    }
  }

  xmlToJson(xml) {
    let obj = {};
    if (xml.nodeType == 1) { // element
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {};
        for (let j = 0; j < xml.attributes.length; j++) {
          let attribute = xml.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType == 3) { // text
      obj = xml.nodeValue;
    }

    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        let item = xml.childNodes.item(i);
        let nodeName = item.nodeName;
        if (typeof(obj[nodeName]) == "undefined") {
          obj[nodeName] = this.xmlToJson(item);
        } else {
          if (typeof(obj[nodeName].push) == "undefined") {
            let old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(this.xmlToJson(item));
        }
      }
    }
    return obj;
  }

  processData(data) {
    if (!data.VpMobil || !data.VpMobil.Kopf || !data.VpMobil.Klassen) {
        this.displayError("Received invalid data from API.");
        console.error("Invalid data structure:", data);
        return;
    }
    const kopf = data.VpMobil.Kopf;
    const klassen = data.VpMobil.Klassen.Kl;

    // --- DEBUGGING START ---
    const availableClasses = klassen.map(k => k.Kurz['#text']);
    console.log("Searching for class:", this.config.class);
    console.log("Available classes in API data:", availableClasses);
    // --- DEBUGGING END ---

    const planClass = klassen.find(k => k.Kurz['#text'].trim() === this.config.class.trim());
    
    console.log("Found class object:", planClass);

    const cardContent = this.shadowRoot.getElementById('card-content');
    if (cardContent) {
      this.shadowRoot.querySelector('ha-card').header = `Substitution plan for ${kopf.DatumPlan['#text']}`;
    }


    if (!planClass || !planClass.Pl || !planClass.Pl.Std) {
      if (cardContent) {
        cardContent.innerHTML = `<p>No substitution plan for class ${this.config.class} found.</p>`;
      }
      return;
    }

    let lessons = planClass.Pl.Std;
    if (!Array.isArray(lessons)) {
        lessons = [lessons];
    }

    const getStyledText = (prop, defaultText = '---') => {
        const text = (prop && prop['#text']) ? prop['#text'] : defaultText;
        // If a property has attributes, it's considered changed.
        if (prop && prop['@attributes']) {
            return `<span class="changed-item">${text}</span>`;
        }
        return text;
    };

    let table = `
      <table>
        <tr>
          <th>Lesson</th>
          <th>Subject</th>
          <th>Teacher</th>
          <th>Room</th>
          <th>Info</th>
        </tr>
    `;

    for (const lesson of lessons) {
      table += `
        <tr>
          <td>${getStyledText(lesson.St)}</td>
          <td>${getStyledText(lesson.Fa)}</td>
          <td>${getStyledText(lesson.Le)}</td>
          <td>${getStyledText(lesson.Ra)}</td>
          <td>${getStyledText(lesson.If, '')}</td>
        </tr>
      `;
    }

    table += "</table>";
    if (cardContent) {
      cardContent.innerHTML = table;
    }
  }

  getCardSize() {
    return 3;
  }
}

// No longer needed as @customElement handles definition
// customElements.define("substitute-card", SubstituteCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "substitute-card",
  name: "Substitute Card",
  preview: false,
  description: "A card to display the substitution plan from vpMobil/Indiware.",
  editor: "substitute-card-editor",
});
