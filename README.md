# PomoSpot

A Chrome extension that combines a Pomodoro timer with Spotify integration. Stay focused with timed work sessions while your music automatically syncs with your productivity flow.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)

## Features

- **Pomodoro Timer** - Preset timers (5, 10, 15, 20 min) or custom durations up to 4 hours
- **Spotify Integration** - Control playback directly from the extension
- **Auto Music Control** - Optionally pause music when timer pauses, resume when timer starts
- **Playlist Switching** - Set different playlists for work and break sessions
- **Persistent Timer** - Timer continues running even when popup is closed
- **Desktop Notifications** - Get notified when your session ends

## Installation

### From Source

1. Clone the repository
   ```bash
   git clone https://github.com/Huy8N/Pomodoro.git
   cd Pomodoro
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/` folder

## Development

```bash
npm run dev      # Start dev server at http://127.0.0.1:3000
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Architecture

```
├── src/                    # React frontend (popup UI)
│   ├── App.jsx            # Root component, view switching
│   ├── Pomodoro.jsx       # Main timer view
│   ├── Settings.jsx       # Settings panel
│   ├── SpotifyBanner.jsx  # Now playing display
│   └── use*.js            # Custom hooks
├── public/
│   ├── background.js      # Service worker (timer + Spotify API)
│   └── manifest.json      # Extension manifest (V3)
└── index.html             # Popup entry point
```

### How It Works

1. **Timer State** - Lives in the background service worker, survives popup close
2. **Spotify Auth** - OAuth 2.0 with PKCE via `chrome.identity`
3. **Communication** - Popup ↔ Background via `chrome.runtime.sendMessage()`
4. **Persistence** - Settings and tokens stored in `chrome.storage.local`

## Spotify Setup

The extension uses Spotify's Web API. To use your own Spotify app:

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add your Chrome extension redirect URI:
   ```
   https://<extension-id>.chromiumapp.org/
   ```
3. Update the client ID in:
   - `src/constants.jsx`
   - `public/background.js`

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Chrome Extension Manifest V3** - Extension platform
- **Spotify Web API** - Music integration

## License

MIT

## Author

[Huy Nguyen](https://github.com/Huy8N)
