class SubstituteCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <style>
          .changed-item {
            color: red !important;
          }
          ha-card.no-header {
            padding-top: 0px !important;
          }
        </style>
        <ha-card>
          <div class="card-content">
            <p>Loading substitution plan...</p>
          </div>
        </ha-card>
      `;
      this.content = this.querySelector(".card-content");
    }
    // We don't want to overwrite the content every time hass is set.
    // The content is updated by processData().
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
    const kopf = data.VpMobil.Kopf;
    const klassen = data.VpMobil.Klassen.Kl;

    // --- DEBUGGING START ---
    const availableClasses = klassen.map(k => k.Kurz['#text']);
    console.log("Searching for class:", this.config.class);
    console.log("Available classes in API data:", availableClasses);
    // --- DEBUGGING END ---

    const planClass = klassen.find(k => k.Kurz['#text'].trim() === this.config.class.trim());
    
    console.log("Found class object:", planClass);

    if (this.config.show_date) {
      this.querySelector('ha-card').header = `${kopf.DatumPlan['#text']}`;
      this.querySelector('ha-card').classList.remove('no-header');
    } else {
      this.querySelector('ha-card').removeAttribute('header');
      this.querySelector('ha-card').classList.add('no-header');
    }

    if (!planClass || !planClass.Pl || !planClass.Pl.Std) {
      this.content.innerHTML = `<p>No substitution for class ${this.config.class} found.</p>`;
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

    let additionalInfo = '';
    console.log("Checking for additional info:", data.VpMobil.ZusatzInfo); // Debugging line
    if (data.VpMobil.ZusatzInfo && data.VpMobil.ZusatzInfo.ZiZeile) {
        let infoItems = data.VpMobil.ZusatzInfo.ZiZeile;
        if (!Array.isArray(infoItems)) {
            infoItems = [infoItems];
        }
        additionalInfo += '<div class="additional-info">';
        for (const info of infoItems) {
            if (info && info['#text']) {
                additionalInfo += `<p>${info['#text']}</p>`;
            }
        }
        additionalInfo += '</div>';
    }
    console.log("Generated additionalInfo HTML:", additionalInfo); // Debugging line to check content

    this.content.innerHTML = table + additionalInfo;
  }

  displayError(error) {
    this.content.innerHTML = `<p style="color: red;">${error}</p>`;
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
