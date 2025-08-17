const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

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
      _data: { state: true },
      _error: { state: true },
    };
  }

  static get styles() {
    return css`
      .changed-item { color: red !important; }
      ha-card.no-header { padding-top: 0px !important; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      .additional-info { margin-top: 16px; }
      .error { color: red; }
    `;
  }

  setConfig(config) {
    if (!config.schoolnumber || !config.username || !config.password || !config.class) {
      throw new Error("Please configure schoolnumber, username, password and class");
    }
    this.config = { ...config, show_date: config.show_date !== false };
    this.fetchData();
  }

  async fetchData() {
    const url = `/stundenplan-proxy/${this.config.schoolnumber}/mobil/mobdaten/Klassen.xml`;
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(this.config.username + ":" + this.config.password));
    headers.set('X-Requested-With', 'XMLHttpRequest');

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        this._error = `Error fetching data: ${response.statusText}`;
        this._data = undefined;
        return;
      }
      const xmlText = await response.text();
      this._data = this.xmlToJson(new DOMParser().parseFromString(xmlText, 'text/xml'));
      this._error = undefined;
    } catch (error) {
      this._error = `Error fetching data: ${error.message}`;
      this._data = undefined;
    }
  }

  xmlToJson(xml) {
    let obj = {};
    if (xml.nodeType == 1) {
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {};
        for (let j = 0; j < xml.attributes.length; j++) {
          let attribute = xml.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType == 3) {
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

  render() {
    if (this._error) {
      return html`
        <ha-card>
          <div class="card-content">
            <p class="error">${this._error}</p>
          </div>
        </ha-card>
      `;
    }

    if (!this._data) {
      return html``;
    }

    const data = this._data;
    const kopf = data.VpMobil.Kopf;
    const klassen = data.VpMobil.Klassen.Kl;
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
    if (data.VpMobil.ZusatzInfo && data.VpMobil.ZusatzInfo.ZiZeile) {
      additionalInfo = Array.isArray(data.VpMobil.ZusatzInfo.ZiZeile)
        ? data.VpMobil.ZusatzInfo.ZiZeile
        : [data.VpMobil.ZusatzInfo.ZiZeile];
    }

    let table = '';
    if (lessons.length > 0) {
      table = html`
        <table>
          <tr>
            <th>Lesson</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Room</th>
            <th>Info</th>
          </tr>
          ${lessons.map(lesson => html`
            <tr>
              <td>${getStyledText(lesson.St)}</td>
              <td>${getStyledText(lesson.Fa)}</td>
              <td>${getStyledText(lesson.Le)}</td>
              <td>${getStyledText(lesson.Ra)}</td>
              <td>${getStyledText(lesson.If, '')}</td>
            </tr>
          `)}
        </table>
      `;
    } else {
      table = html`<p>No substitution for class ${this.config.class} found.</p>`;
    }

    const additionalInfoHtml = additionalInfo
      .filter(info => info && info['#text'])
      .map(info => html`<p>${info['#text']}</p>`);

    return html`
      <ha-card header="${this.config.show_date && kopf.DatumPlan ? kopf.DatumPlan['#text'] : ''}"
               class="${this.config.show_date ? '' : 'no-header'}">
        <div class="card-content">
          ${table}
          <div class="additional-info">
            ${additionalInfoHtml}
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
