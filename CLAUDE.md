# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PomoSpot is a Chrome Extension (Manifest V3) that combines a Pomodoro timer with Spotify integration. Users can set work/break timers and automatically control Spotify playback based on timer state.

## Commands

```bash
npm run dev      # Start dev server at http://127.0.0.1:3000
npm run build    # Build for production (output: dist/)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

To test the extension:
1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Architecture

### Chrome Extension Structure
- **Popup UI**: React app (`src/`) renders in the extension popup (`index.html`)
- **Background Service Worker**: `public/background.js` handles timer persistence, Spotify API calls, and Chrome alarms
- **Communication**: Popup and background communicate via `chrome.runtime.sendMessage()` with command-based message passing

### Key Data Flow
1. Timer state lives in the background service worker (survives popup close)
2. Popup syncs with background on mount via `getState` command
3. Settings persist in `chrome.storage.local`
4. Spotify tokens stored in `chrome.storage.local`, refreshed via background worker

### Component Structure
- `App.jsx` - Root component managing view switching (pomodoro/settings)
- `Pomodoro.jsx` - Main timer view with Spotify controls
- `Settings.jsx` - Settings panel for playlists and preferences
- `SpotifyBanner.jsx` - Current track display and playback controls
- `TimerControls.jsx` - Play/pause/reset buttons
- `SwitchPlaylist.jsx` - Playlist selection dropdown

### Custom Hooks
- `usePomodoroTimer.jsx` - Syncs timer state with background service worker
- `useSpotifyAuth.js` - Handles Spotify OAuth flow via Chrome identity API
- `useSpotifyPlayback.jsx` - Manages Spotify playback state and controls

### Background Service Worker Commands
The background script (`public/background.js`) responds to these commands:
- `getState` - Returns current timer state
- `start`, `pause`, `resume`, `reset` - Timer controls
- `setTime` - Set custom duration
- `getCurrentPlayback` - Get Spotify playback state
- `play`, `pauseSpotify` - Spotify playback controls
- `getPlaylists` - Fetch user's Spotify playlists

### Spotify Integration
- Uses OAuth 2.0 with PKCE via `chrome.identity.launchWebAuthFlow()`
- Client ID configured in `src/constants.jsx` and `public/background.js`
- Tokens auto-refresh via background service worker
