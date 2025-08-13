class SubstituteCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card header="Vertretungsplan">
          <div class="card-content"></div>
        </ha-card>
      `;
      this.content = this.querySelector("div");
    }

    this.content.innerHTML = `
      <p>Hier wird der Vertretungsplan angezeigt.</p>
    `;
  }

  setConfig(config) {
    if (!config.schoolnumber || !config.username || !config.password || !config.class) {
      throw new Error("Please configure schoolnumber, username, password and class");
    }
    this.config = config;
    this.fetchData();
  }

  async fetchData() {
    const url = `https://www.stundenplan24.de/${this.config.schoolnumber}/mobil/mobdaten/Klassen.xml`;
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(this.config.username + ":" + this.config.password));

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        this.displayError(`Error fetching data: ${response.statusText}`);
        return;
      }
      const xmlText = await response.text();
      const data = this.xmlToJson(new DOMParser().parseFromString(xmlText, 'text/xml'));
      this.processData(data);
    } catch (error) {
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
    const kopf = data.VpMobil.Kopf;
    const klassen = data.VpMobil.Klassen.Kl;
    const planClass = klassen.find(k => k.Kurz['#text'] === this.config.class);

    this.querySelector('ha-card').header = `Vertretungsplan für ${kopf.DatumPlan['#text']}`;

    if (!planClass || !planClass.Pl || !planClass.Pl.Std) {
      this.content.innerHTML = "<p>Keine Vertretungen für heute.</p>";
      return;
    }

    let lessons = planClass.Pl.Std;
    if (!Array.isArray(lessons)) {
        lessons = [lessons];
    }

    let table = `
      <table>
        <tr>
          <th>Stunde</th>
          <th>Fach</th>
          <th>Lehrer</th>
          <th>Raum</th>
          <th>Info</th>
        </tr>
    `;

    for (const lesson of lessons) {
      table += `
        <tr>
          <td>${lesson.St['#text']}</td>
          <td>${lesson.Fa['#text']}</td>
          <td>${lesson.Le['#text']}</td>
          <td>${lesson.Ra['#text']}</td>
          <td>${lesson.If ? lesson.If['#text'] : ''}</td>
        </tr>
      `;
    }

    table += "</table>";
    this.content.innerHTML = table;
  }

  displayError(error) {
    this.content.innerHTML = `<p style="color: red;">${error}</p>`;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("substitute-card", SubstituteCard);
