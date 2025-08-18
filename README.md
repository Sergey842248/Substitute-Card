# Substitute Card

A Lovelace card to display the daily substitution plan from the Substitute App (based on vpMobil/Indiware).
The Card only works on external Home Asistant Sites, not the ip-based internal ones. For internal use please take version 1.8 in HACS and skip the updates.


## Requirements
  1. Home Assistant externally forwarded.
  2. Nignx Proxy Manager

  
## Features

*   Displays substitution plan for a specified class.
*   Highlights changed items in red.
*   Configurable to show or hide the date in the card header.
*   Includes additional information from the substitution plan if available.

## Installation

### Via HACS (Recommended)

1.  Ensure you have [HACS (Home Assistant Community Store)](https://hacs.xyz/) installed.
2.  In Home Assistant, navigate to HACS.
3.  Click on the three dots in the top right corner and select "Custom repositories".
4.  Add this repository URL (`https://github.com/Sergey842248/Substitute-Card`) with category "Lovelace".
5.  Search for "Substitute Card" in HACS and install it.
6.  Refresh your browser.
7.  Add the card to your Lovelace dashboard (see Configuration below).

### Manual Installation

1.  Download the `substitute-card.js` file from the latest [release](https://github.com/Sergey842248/Substitute-Card/releases).
2.  Place the `substitute-card.js` file in your Home Assistant `config/www/` directory. If the `www` directory doesn't exist, create it.
3.  Add the following to your `ui-lovelace.yaml` or via the Raw Configuration Editor in Lovelace:

    ```yaml
    resources:
      - url: /local/substitute-card.js
        type: module
    ```
4.  Refresh your browser.
5.  Add the card to your Lovelace dashboard (see Configuration below).

## Configuration

### Lovelace Card
To use the card, add a new card to your Lovelace dashboard and select "Manual Card". Then, paste the following configuration, replacing the placeholder values with your actual details:

```yaml
type: custom:substitute-card
schoolnumber: YOUR_SCHOOL_NUMBER
username: YOUR_USERNAME
password: YOUR_PASSWORD
class: YOUR_CLASS_NAME
show_date: true # Optional: Set to false to hide the date and header space. Defaults to true.
```

### Nginx-Setup

1. Open your Nginx Proxy Manger Addon and click at the 3 dots next at your Home Assistant forwarding proxy entry.
2. Click `Edit` and open the tab `Custom Locations`, there you have to enter the following fields:
  
    ```yaml
    Location: /stundenplan-proxy/
    Scheme: https
    Forward Hostname/IP: stundenplan24.de
    Forward Port: 443
    ```
3. Click on the gear icon ("Advanced") and paste the following code:
    ```yaml
        # For Custom Location /stundenplan-proxy/
    location /stundenplan-proxy/ {
        proxy_pass https://stundenplan24.de/;
        proxy_http_version 1.1;
        proxy_set_header Host stundenplan24.de;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Adapt Redirects (Location-Header)
        proxy_redirect https://stundenplan24.de/ /stundenplan-proxy/;
        proxy_redirect / /stundenplan-proxy/;

        # Adapt Cookies
        proxy_cookie_path / /stundenplan-proxy/;

        # Simple HTML/JS/CSS Rewriting
        sub_filter_types text/html text/css application/javascript;
        sub_filter_once off;
        sub_filter 'href="/' 'href="/stundenplan-proxy/';
        sub_filter 'src="/'  'src="/stundenplan-proxy/';
    }

4. Open the `SSL` Tab and activate `HTTP/2 Support` and `Force SSL`
5. Click Save