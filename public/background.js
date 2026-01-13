importScripts("vendor/axios.min.js");

const SPOTIFY_CLIENT_ID = "889db36d555d41f1bcc56f22d1e2210c";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

// Auth flow with PKCE (Proof Key for Code Exchange)
const generateRandomString = (length) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return self.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

// Function to make API calls to Spotify
async function callSpotifyAPI(endpoint, method = "GET", body = null) {
  const { spotify_access_token: token } = await chrome.storage.local.get(
    "spotify_access_token"
  );
  if (!token) {
    console.log("No Spotify token found. Attempting refresh.");
    // Attempt to refresh the token if it's missing.
    try {
      await refreshToken();
      // Retry the API call with the new token
      const { spotify_access_token: newToken } = await chrome.storage.local.get(
        "spotify_access_token"
      );
      if (!newToken) throw new Error("Still no token after refresh.");
      return callSpotifyAPI(endpoint, method, body); // Recursive call
    } catch (error) {
      console.error("Could not refresh token. Please log in again.", error);
      // If refresh fails, prompt for login by clearing tokens which logs the user out.
      await handleLogout();
      return null;
    }
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : null,
    });

    // Referesh if token is expired
    if (response.status === 401) {
      console.log("Spotify token expired. Refreshing…");
      await refreshToken();
      return callSpotifyAPI(endpoint, method, body);
    }

    // Log any non-2xx responses
    if (!response.ok) {
      const errorText = await response.text(); // may itself be empty
      throw new Error(`Spotify API Error ${response.status}: ${errorText}`);
    }

    // no content to return
    if (response.status === 202 || response.status === 204) return null;

    // Parse JSON response
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("application/json")) {
      // some 200s send an empty body with a text/plain header
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Spotify API call failed:", err);
    throw err;
  }
}

// Spotify Authentication Flow
async function handleLogin() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  const redirectUri = chrome.identity.getRedirectURL(); // No path needed for manifest v3

  await chrome.storage.local.set({
    spotify_code_verifier: codeVerifier,
  });

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope:
      "streaming user-modify-playback-state user-read-currently-playing user-read-playback-state user-read-private playlist-read-private playlist-read-collaborative",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  try {
    const finalUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    const url = new URL(finalUrl);
    const code = url.searchParams.get("code");
    if (code) {
      await exchangeCodeForToken(code, redirectUri);
      broadcastState();
    }
  } catch (e) {
    console.log("Auth flow error:", e.message);
  }
}

async function exchangeCodeForToken(code, redirectUri) {
  const { spotify_code_verifier } = await chrome.storage.local.get(
    "spotify_code_verifier"
  );

  const payload = {
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: spotify_code_verifier,
  };

  try {
    const response = await axios.post(
      TOKEN_ENDPOINT,
      new URLSearchParams(payload),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    const { access_token, refresh_token } = response.data;
    await chrome.storage.local.set({
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token,
    });
  } finally {
    await chrome.storage.local.remove("spotify_code_verifier");
  }
}

async function refreshToken() {
  const { spotify_refresh_token } = await chrome.storage.local.get(
    "spotify_refresh_token"
  );
  if (!spotify_refresh_token) throw new Error("No refresh token available.");

  const payload = {
    grant_type: "refresh_token",
    refresh_token: spotify_refresh_token,
    client_id: SPOTIFY_CLIENT_ID,
  };

  const response = await axios.post(
    TOKEN_ENDPOINT,
    new URLSearchParams(payload),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const { access_token, refresh_token: new_refresh_token } = response.data;
  await chrome.storage.local.set({
    spotify_access_token: access_token,
    // Spotify sometimes returns a new refresh token, so we save it.
    spotify_refresh_token: new_refresh_token || spotify_refresh_token,
  });
}

async function handleLogout() {
  await chrome.storage.local.remove([
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_code_verifier",
  ]);
  broadcastState(); // Notify UI of logout
}

// --- Timer Logic ---
// In-memory state for fast access (storage is only for persistence)
let timerState = {
  timeLeft: 1500,
  duration: 1500,
  isRunning: false,
};
let countdownIntervalId = null;
let tickCount = 0; // Track ticks for periodic storage sync

// Initialize in-memory state from storage (called on service worker wake)
async function initTimerState() {
  const stored = await chrome.storage.local.get(["timeLeft", "duration", "isRunning"]);
  timerState = {
    timeLeft: stored.timeLeft ?? 1500,
    duration: stored.duration ?? 1500,
    isRunning: stored.isRunning ?? false,
  };

  // Resume countdown if timer was running when service worker went to sleep
  if (timerState.isRunning && !countdownIntervalId) {
    countdownIntervalId = setInterval(updateCountdown, 1000);
  }
}

// Sync in-memory state to storage (for crash recovery)
async function syncToStorage() {
  await chrome.storage.local.set({
    timeLeft: timerState.timeLeft,
    duration: timerState.duration,
    isRunning: timerState.isRunning,
  });
}

async function startTimer() {
  if (timerState.isRunning) return;

  timerState.isRunning = true;
  await syncToStorage();

  chrome.alarms.create("pomodoroTimer", {
    delayInMinutes: timerState.timeLeft / 60,
  });

  if (!countdownIntervalId) {
    tickCount = 0;
    countdownIntervalId = setInterval(updateCountdown, 1000);
  }
  await callSpotifyAPI("/me/player/play", "PUT");
  broadcastState();
}

async function pauseTimer() {
  timerState.isRunning = false;
  await syncToStorage(); // Persist current time when pausing
  await chrome.alarms.clear("pomodoroTimer");

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  broadcastState();
}

async function resetTimer() {
  timerState.isRunning = false;
  timerState.timeLeft = timerState.duration;
  await syncToStorage();
  await chrome.alarms.clear("pomodoroTimer");

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  broadcastState();
}

async function setTimer(newDuration) {
  timerState.duration = newDuration;
  timerState.timeLeft = newDuration;
  await syncToStorage();
  broadcastState();
}

async function updateCountdown() {
  if (!timerState.isRunning) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    return;
  }

  timerState.timeLeft -= 1;
  tickCount += 1;

  if (timerState.timeLeft >= 0) {
    // Only sync to storage every 10 seconds (reduces I/O by 90%)
    if (tickCount % 10 === 0) {
      await syncToStorage();
    }
    broadcastState();
  } else {
    // Timer finished
    timerState.isRunning = false;
    timerState.timeLeft = timerState.duration;
    await syncToStorage();
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

// Initialize state when service worker starts
initTimerState();

// --- Event Listeners ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 1500,   // 25 minutes
    duration: 1500,   // 25 minutes
    isRunning: false,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pomodoroTimer") return;

  const { duration, breakPlaylistId } = await chrome.storage.local.get([
    "duration",
    "breakPlaylistId"
  ]);
  await chrome.storage.local.set({ isRunning: false, timeLeft: duration });

  if (breakPlaylistId) {
    await callSpotifyAPI("/me/player/play", "PUT", {
      context_uri: `spotify:playlist:${breakPlaylistId}`,
    });
  }

  chrome.notifications.create({
    type: "basic",
    iconUrl: "PomoSpot128.png",
    title: "Time's Up!",
    message: "Your Pomodoro session has ended.",
    priority: 2,
  });
  broadcastState();
  
  chrome.action.openPopup().catch(() => {
    // nothing to do here
  });


});

// MERGED MESSAGE LISTENER
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.command) {
        // Auth Commands
        case "login":
          await handleLogin();
          sendResponse({ status: "ok" });
          break;
        case "logout":
          await handleLogout();
          sendResponse({ status: "ok" });
          break;

        // Timer Commands
        case "start":
          await startTimer();
          sendResponse({ status: "ok" });
          break;
        case "pause":
          await pauseTimer();
          sendResponse({ status: "ok" });
          break;
        case "reset":
          await resetTimer();
          sendResponse({ status: "ok" });
          break;
        case "setDuration":
          await setTimer(request.duration);
          sendResponse({ status: "ok" });
          break;
        case "getState":
          // Return timer state from memory (faster than storage read)
          sendResponse({
            timeLeft: timerState.timeLeft,
            isRunning: timerState.isRunning,
            duration: timerState.duration,
          });
          break;

        // Spotify Player Commands
        case "getCurrentPlayback": {
          const playbackState = await callSpotifyAPI(
            "/me/player/currently-playing"
          );
          sendResponse(playbackState);
          break;
        }
        case "playSpotify":
          await callSpotifyAPI("/me/player/play", "PUT");
          sendResponse({ status: "ok" });
          break;
        case "pauseSpotify":
          await callSpotifyAPI("/me/player/pause", "PUT");
          sendResponse({ status: "ok" });
          break;
        case "nextTrack":
          await callSpotifyAPI("/me/player/next", "POST");
          sendResponse({ status: "ok" });
          break;
        case "previousTrack":
          await callSpotifyAPI("/me/player/previous", "POST");
          sendResponse({ status: "ok" });
          break;
        case "getPlaylists": {
          const playlistResponse = await callSpotifyAPI("/me/playlists");
          if (playlistResponse && playlistResponse.items) {
            sendResponse(playlistResponse);
          } else {
            console.log("Unable to fetch playlists");
            sendResponse({ status: "unable to fetch playlist" });
          }
          break;
        }
        case "playFromPlaylist":
          await callSpotifyAPI("/me/player/play", "PUT", {
            context_uri: `spotify:playlist:${request.playlistId}`,
          });
          sendResponse({ status: "ok" });
          break;
        default:
          console.warn("Unknown command:", request.command);
          sendResponse({ status: "error", message: "Unknown command" });
      }
    } catch (error) {
      console.error(`Error handling command "${request.command}":`, error);
      sendResponse({ status: "error", message: error.message });
    }
  })();

  // Return true to indicate that the response will be sent asynchronously.
  return true;
});

function broadcastState() {
  // Only send timer-relevant fields from in-memory state (no storage read!)
  const state = {
    timeLeft: timerState.timeLeft,
    isRunning: timerState.isRunning,
    duration: timerState.duration,
  };
  chrome.runtime.sendMessage({ command: "updateState", state }).catch((err) => {
    if (err.message.includes("Could not establish connection")) {
      // This is normal if the popup is not open.
    } else {
      console.error("Broadcast error:", err);
    }
  });
}
