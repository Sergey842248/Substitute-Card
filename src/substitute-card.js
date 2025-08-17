const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

class SubstituteCard extends LitElement {
  static async getConfigElement() {
    await import("./substitute-card-editor.js");
    return document.createElement("substitute-card-editor");
  }

  static getStubConfig() {
    return {
      schoolnumber: "",
      username: "",
      password: "",
      class: "",
      show_date: true,
    };
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      data: {},
    };
  }

  setConfig(config) {
    if (!config.schoolnumber || !config.username || !config.password || !config.class) {
      throw new Error("Please configure schoolnumber, username, password and class");
    }
    this.config = { ...config, show_date: config.show_date !== false }; // Default to true if not specified
    this.fetchData();
  }

  async fetchData() {
    // The proxy is now handled by the local Nginx reverse proxy.
    // We will configure Nginx to forward requests from /stundenplan-proxy/
    // to https://www.stundenplan24.de/
    const url = `/stundenplan-proxy/${this.config.schoolnumber}/mobil/mobdaten/Klassen.xml`;

    console.log("Fetching data from:", url);

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(this.config.username + ":" + this.config.password));
    headers.set('X-Requested-With', 'XMLHttpRequest');


    try {
      const response = await fetch(url, { headers });
      console.log("Response:", response);
      if (!response.ok) {
        this.displayError(`Error fetching data: ${response.statusText}`);
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
    this.data = data;
  }

  displayError(error) {
    this.error = error;
  }

  static get styles() {
    return html`
      <style>
        .changed-item {
          color: red !important;
        }
        ha-card.no-header {
          padding-top: 0px !important;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .additional-info {
          margin-top: 16px;
        }
      </style>
    `;
  }

  render() {
    if (!this.config) {
      return html``;
    }

    if (this.error) {
      return html`
        <ha-card>
          <div class="card-content">
            <p style="color: red;">${this.error}</p>
          </div>
        </ha-card>
      `;
    }

    if (!this.data) {
      return html`
        <ha-card>
          <div class="card-content">
            <p>Loading substitution plan...</p>
          </div>
        </ha-card>
      `;
    }

    const kopf = this.data.VpMobil.Kopf;
    const klassen = this.data.VpMobil.Klassen.Kl;
    const planClass = klassen.find(k => k.Kurz['#text'].trim() === this.config.class.trim());

    const getStyledText = (prop, defaultText = '---') => {
      const text = (prop && prop['#text']) ? prop['#text'] : defaultText;
      if (prop && prop['@attributes']) {
        return html`<span class="changed-item">${text}</span>`;
      }
      return text;
    };

    let lessons = [];
    if (planClass && planClass.Pl && planClass.Pl.Std) {
      lessons = Array.isArray(planClass.Pl.Std) ? planClass.Pl.Std : [planClass.Pl.Std];
    }

    let additionalInfo = [];
    if (this.data.VpMobil.ZusatzInfo && this.data.VpMobil.ZusatzInfo.ZiZeile) {
      additionalInfo = Array.isArray(this.data.VpMobil.ZusatzInfo.ZiZeile)
        ? this.data.VpMobil.ZusatzInfo.ZiZeile
        : [this.data.VpMobil.ZusatzInfo.ZiZeile];
    }

    return html`
      <ha-card .header=${this.config.show_date ? kopf.DatumPlan['#text'] : ''}
               class=${this.config.show_date ? '' : 'no-header'}>
        <div class="card-content">
          ${lessons.length === 0
            ? html`<p>No substitution for class ${this.config.class} found.</p>`
            : html`
              <table>
                <tr>
                  <th>Lesson</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Info</th>
                </tr>
                ${lessons.map(
                  (lesson) => html`
                    <tr>
                      <td>${getStyledText(lesson.St)}</td>
                      <td>${getStyledText(lesson.Fa)}</td>
                      <td>${getStyledText(lesson.Le)}</td>
                      <td>${getStyledText(lesson.Ra)}</td>
                      <td>${getStyledText(lesson.If, '')}</td>
                    </tr>
                  `
                )}
              </table>
            `}
          <div class="additional-info">
            ${additionalInfo.map((info) => html`<p>${info['#text']}</p>`)}
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
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
