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
let countdownIntervalId = null;

async function startTimer() {
  const { isRunning, timeLeft, duration } = await chrome.storage.local.get([
    "isRunning",
    "timeLeft",
    "duration",
  ]);
  if (isRunning) return;

  await chrome.storage.local.set({ isRunning: true });
  chrome.alarms.create("pomodoroTimer", {
    delayInMinutes: (timeLeft || duration) / 60,
  });

  if (!countdownIntervalId) {
    countdownIntervalId = setInterval(updateCountdown, 1000);
  }
  await callSpotifyAPI("/me/player/play", "PUT");
  broadcastState();
}

async function pauseTimer() {
  await chrome.storage.local.set({ isRunning: false });
  await chrome.alarms.clear("pomodoroTimer");

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  broadcastState();
}

async function resetTimer() {
  const { duration } = await chrome.storage.local.get("duration");
  await chrome.storage.local.set({ isRunning: false, timeLeft: duration });
  await chrome.alarms.clear("pomodoroTimer");

  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  broadcastState();
}

async function setTimer(newDuration) {
  await chrome.storage.local.set({
    duration: newDuration,
    timeLeft: newDuration,
  });
  broadcastState();
}

async function updateCountdown() {
  const { isRunning, timeLeft } = await chrome.storage.local.get([
    "isRunning",
    "timeLeft",
  ]);
  if (!isRunning) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    return;
  }

  const newTimeLeft = timeLeft - 1;
  if (newTimeLeft >= 0) {
    await chrome.storage.local.set({ timeLeft: newTimeLeft });
    broadcastState();
  } else {
    // Timer finished, handle alarm logic
    await chrome.storage.local.set({ isRunning: false });
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
}

// --- Event Listeners ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 5, // 25 minutes
    duration: 1500,
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
          const state = await chrome.storage.local.get(null);
          sendResponse(state);
          break;

        // Spotify Player Commands
        case "getCurrentPlayback":
          const playbackState = await callSpotifyAPI(
            "/me/player/currently-playing"
          );
          sendResponse(playbackState);
          break;
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
        case "getPlaylists":
          response = await callSpotifyAPI("/me/playlists");
          if (response && response.items) {
            sendResponse(response);
          } else {
            console.log("Unable to fetch playlists");
            sendResponse({ status: "unable to fetch playlist" });
          }
          break;
        case "playFromPlaylist":
          console.log(
            "▶️ background received playFromPlaylist for",
            request.playlistId
          );
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

async function broadcastState() {
  const state = await chrome.storage.local.get(null);
  // This sends to the popup
  chrome.runtime.sendMessage({ command: "updateState", state }).catch((err) => {
    if (err.message.includes("Could not establish connection")) {
      // This is normal if the popup is not open.
    } else {
      console.error("Broadcast error:", err);
    }
  });
}
