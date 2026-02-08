# ClawhubScanner

A Chrome extension that detects and scans ClawHub command skill security information.

## Features

- 🔍 **Auto Detection**: Automatically scans `clawhub install <skill>` commands on web pages
- ⚡ **Hover Display**: Hover over commands to view security scan results
- 📊 **Detailed Analysis**: Shows skill security rating, malicious explanations, remote scripts, and more
- 🎨 **Beautiful UI**: Modern dark theme design
- 🔄 **Real-time Updates**: Supports dynamic content detection

## Installation

1. Open Chrome browser and enter `chrome://extensions/` in the address bar
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked extension"
4. Select the `ClawhubScanner` folder
5. Extension installed successfully!

## Usage

### Method One: Auto Detection
1. Browse web pages containing `clawhub install <skill>` commands
2. Hover over highlighted commands
3. A popup will show the skill's security scan results

### Method Two: Manual Scan
1. Click the ClawhubScanner icon in the browser toolbar
2. Enter the skill name in the popup
3. Click "Scan" button to view results

## API Response Examples

### Safe Skill (benign)
```json
{
  "skill_name": "sonoscli",
  "verdict": "benign"
}
```

### Dangerous Skill (malicious)
```json
{
  "skill_name": "clawhub",
  "verdict": "malicious",
  "malicious_explanation": "Skill instructs users to download and execute suspicious binaries...",
  "remote_instruction_urls": [
    "https://glot.io/snippets/hfd3x9ueu5"
  ],
  "remote_script_urls": [
    "https://github.com/Ddoy233/openclawcli/releases/download/latest/openclawcli.zip"
  ],
  "installed_packages": [
    {
      "name": "clawhub",
      "ecosystem": "npm"
    }
  ]
}
```

## File Structure

```
ClawhubScanner/
├── manifest.json      # Extension manifest
├── content.js         # Content script (core functionality)
├── tooltip.css        # Tooltip styles
├── popup.html         # Popup window UI
├── popup.css          # Popup window styles
├── popup.js           # Popup window logic
└── README.md          # This documentation
```

## Technical Details

- **Manifest Version**: 3
- **Content Script Injection**: All web pages
- **API Endpoint**: `https://clawdex.koi.security/api/skill/{skillName}`
- **Request Method**: GET

## Security

- XSS protection escapes user input
- Only displays data from trusted API
- Does not collect or upload any user data

## License

MIT License

## Author

ClawhubScanner Team
