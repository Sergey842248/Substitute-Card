import { LitElement, html } from 'lit-element';
import { fireEvent } from 'home-assistant-js-websocket/dist/util';
import { HomeAssistant } from 'custom-elements-json/src/types';
import './substitute-card-editor';

class SubstituteCard extends LitElement {
  set hass(hass) {
    this._hass = hass;
  }

  // This is called every time the config is updated, including from the visual editor
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') && this.config) {
      this.fetchData();
    }
  }

  render() {
    return html`
      <style>
        .changed-item {
          color: red !important;
        }
      </style>
      <ha-card header="Substitution plan">
        <div class="card-content">
          <p>Loading substitution plan...</p>
        </div>
      </ha-card>
    `;
  }

  setConfig(config) {
    // Check if the config is valid for the visual editor
    if (!config.schoolnumber || !config.username || !config.password || !config.class) {
      // If not valid, set a default config for the editor to display
      this.config = {
        schoolnumber: "",
        username: "",
        password: "",
        class: "",
      };
      // Throw an error to indicate that the configuration is incomplete
      throw new Error("Please configure schoolnumber, username, password and class");
    }
    this.config = config;
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

    this.shadowRoot.querySelector('ha-card').header = `Substitution plan for ${kopf.DatumPlan['#text']}`;

    if (!planClass || !planClass.Pl || !planClass.Pl.Std) {
      this.shadowRoot.querySelector(".card-content").innerHTML = `<p>No substitution for class ${this.config.class} found.</p>`;
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
    this.shadowRoot.querySelector(".card-content").innerHTML = table;
  }

  displayError(error, isProxyError = false) {
    if (isProxyError) {
        this.shadowRoot.querySelector(".card-content").innerHTML = `
            <p style="color: red;"><b>CORS Proxy Error:</b> ${error}</p>
            <p>This may be due to the CORS-Anywhere proxy. Please click the button below to activate it, then reload the page.</p>
            <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank" rel="noopener noreferrer">
                <button>Activate Proxy</button>
            </a>
        `;
    } else {
        this.shadowRoot.querySelector(".card-content").innerHTML = `<p style="color: red;">${error}</p>`;
    }
  }

  getCardSize() {
    return 3;
  }

  static get _properties() {
    return {
      config: {},
    };
  }

  static getEditableProperties() {
    return [
      {
        key: "schoolnumber",
        label: "School Number",
        type: "string",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        type: "string",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        required: true,
      },
      {
        key: "class",
        label: "Class",
        type: "string",
        required: true,
      },
    ];
  }

  // This is required for the visual editor
  static getLovelaceEditor() {
    return class extends SubstituteCardEditor {
      setConfig(config) {
        super.setConfig(config);
      }
    };
  }
}

customElements.define("substitute-card", SubstituteCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "substitute-card",
  name: "Substitute Card",
  preview: false,
  description: "A card to display the substitution plan from vpMobil/Indiware."
});
