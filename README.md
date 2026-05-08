# IG Unfollower

A Chrome extension that automates unfollowing Instagram accounts directly from your browser. It uses human-like random delays between actions to behave naturally and avoid detection.

> **Disclaimer:** Automating actions on Instagram may violate their [Terms of Service](https://help.instagram.com/581066165581870). Use at your own risk.

---

## Features

- One-click automation from a clean popup UI
- Human-like random delays between each unfollow action
- Automatic retry logic if the following list needs to scroll further
- Stop at any time by clicking the extension icon
- Works entirely client-side — no data leaves your browser

## How It Works

1. The extension injects a content script on `instagram.com`
2. It detects when you are on your own profile page and enables the popup button
3. Clicking **Start Unfollowing** reloads the page and begins the automation
4. The script opens the "Following" dialog, scrolls through your list, and clicks **Unfollow** on each account
5. An on-page overlay notifies you that automation is running

## Installation

> The extension is not published to the Chrome Web Store. Load it manually as an unpacked extension.

1. Clone this repository:
   ```bash
   git clone https://github.com/petervavro/chrome-extension-ig-unfollower.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the cloned folder
5. The IG Unfollower icon will appear in your toolbar

## Usage

1. Go to [instagram.com](https://www.instagram.com) and open your profile
2. Click the **IG Unfollower** icon in the Chrome toolbar
3. Click **Start Unfollowing** in the popup
4. Keep the Instagram tab visible while the automation runs
5. Click **Stop** (or the extension icon) to pause at any time

## Project Structure

```
ig-unfollower/
├── images/              # Extension icons (16, 32, 48, 128px)
├── popup/
│   ├── popup.html       # Popup UI markup
│   ├── popup.css        # Popup styles
│   └── popup.js         # Popup logic (reads badge state, sends messages)
├── scripts/
│   ├── content.js       # Content script — overlay UI, URL change detection
│   └── libs/
│       └── unfollow.js  # UnfollowTask class — core automation logic
├── background.js        # Service worker — tab/badge state management
├── manifest.json        # Chrome Extension Manifest V3
└── LICENSE
```

## Technical Notes

- Built with **Chrome Extension Manifest V3** (service worker, no persistent background page)
- Uses `MutationObserver` to detect Instagram's client-side navigation (SPA route changes)
- DOM queries use `role` attributes rather than brittle class names where possible
- Confirmation dialogs are matched by button text (`"Unfollow"`) rather than position
- The retry system reloads the page up to 3 times if the following list becomes stale

## License

[MIT](LICENSE)
