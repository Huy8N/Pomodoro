importScripts('vendor/axios.min.js');

const SPOTIFY_CLIENT_ID = "889db36d555d41f1bcc56f22d1e2210c";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize/"

//PKCE Flow helper function from spotify doc
//Generate a key
const generateRandomString = (length) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};
//Encrypt that key with hash
const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};
//Derive a seperate key from that hash that can be used to verify user
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const login = () =>
  new Promise(async (resolve, reject) => {
    try {
      // 1) PKCE bits
      const codeVerifier = generateRandomString(64);
      const hashed = await sha256(codeVerifier);
      const codeChallenge = base64encode(hashed);

      // 2) Get a **stable** redirect and PERSIST it
      //    The optional path ("spotify_cb") makes the value explicit/consistent.
      const redirectUri = chrome.identity.getRedirectURL();
      await chrome.storage.local.set({
        spotify_code_verifier: codeVerifier,
        spotify_redirect_uri: redirectUri,
      });

      // 3) Build authorize URL with the SAME redirectUri
      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope:
          "streaming user-modify-playback-state user-read-currently-playing user-read-playback-state user-read-private playlist-read-private playlist-read-collaborative",
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams(
      params
    ).toString()}`;


      // 4) Launch OAuth
      const finalUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      // 5) Handle callback
      const cb = new URL(finalUrl);
      const err = cb.searchParams.get("error");
      if (err) throw new Error(`Spotify auth error: ${err}`);

      const code = cb.searchParams.get("code");
      if (!code) throw new Error("No code returned from Spotify");

      // 6) Exchange code (this will read spotify_redirect_uri from storage)
      const tokens = await exchangeCodeForToken(code);
      resolve(tokens);
    } catch (e) {
      reject(e);
    }
  });

const exchangeCodeForToken = async (code) => {
  try {
    const { spotify_code_verifier, spotify_redirect_uri } =
      await chrome.storage.local.get(["spotify_code_verifier", "spotify_redirect_uri"]);

    if (!spotify_code_verifier) {
      throw new Error("Unable to find code verifier");
    }
    if (!spotify_redirect_uri) {
      throw new Error("Unable to find redirect URI used during authorization");
    }

    const payload = {
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: spotify_redirect_uri, // <-- reuse EXACT value
      code_verifier: spotify_code_verifier,
    };

    console.debug("Exchanging code with redirect_uri:", spotify_redirect_uri);

    const response = await axios.post(
      TOKEN_ENDPOINT,
      new URLSearchParams(payload).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in, token_type } = response.data;
    if (!access_token) {
      throw new Error("No access token found in token response");
    }

    // If Spotify doesn't send a new refresh_token, keep the old one if present
    const existing = await chrome.storage.local.get("spotify_refresh_token");

    await chrome.storage.local.set({
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token || existing.spotify_refresh_token || null,
      spotify_token_type: token_type || "Bearer",
      spotify_expires_in: typeof expires_in === "number" ? expires_in : null,
      spotify_token_created_at: Date.now(),
    });

    // Clean up one-time values
    await chrome.storage.local.remove(["spotify_code_verifier", "spotify_redirect_uri"]);

    return { access_token, refresh_token: refresh_token || existing.spotify_refresh_token || null };
  } catch (error) {
    console.error(
      "Token exchange failed",
      error?.response?.status,
      error?.response?.data || error?.message
    );
    throw error; // <-- not reject()
  }
};

export const logout = async () => {
  chrome.storage.local.remove([
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_code_verifier",
  ]);
};

// Initial timer state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 10 * 60, // 10 seconds for testing purposes
    duration: 10 * 60,
    isRunning: false,
  });
});

let countdownIntervalId = null;

/**
 * Helper function to make API calls to Spotify
 * @param {string} endpoint - The Spotify API endpoint to call
 * @param {string} method - HTTP method (default: "PUT")
 * @param {object} body - Request body for POST/PUT requests
 */
async function callSpotifyAPI(endpoint, method = "PUT", body = null) {
  try {
    const { spotify_access_token: token } = await chrome.storage.local.get(
      "spotify_access_token"
    );
    if (!token) return; // if no token, don't make the API call
    const opts = { method, headers: { Authorization: `Bearer ${token}` } };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    await fetch(`https://api.spotify.com/v1${endpoint}`, opts);
  } catch (error) {
    console.error("Spotify API call failed:", error);
  }
}

// === Timer actions ===
/**
 * Starts the Pomodoro timer and begins playing work playlist
 * Creates a Chrome alarm for the countdown and switches to work music
 */
async function startTimer() {
  try {
    const {
      isRunning,
      timeLeft,
      duration,
      workPlaylistId,
      wasPlayingBeforePause,
    } = await chrome.storage.local.get([
      "isRunning",
      "timeLeft",
      "duration",
      "workPlaylistId",
      "wasPlayingBeforePause",
    ]); // check if timer is already running
    if (isRunning) return; // if so, do nothing

    // Mark running & schedule
    await chrome.storage.local.set({ isRunning: true }); // set running to true
    chrome.alarms.create("pomodoroTimer", {
      // create an alarm for the countdown
      delayInMinutes: (timeLeft || duration) / 60, // set the delay to the time left or duration
    });

    if (!countdownIntervalId) {
      countdownIntervalId = setInterval(updateCountdown, 1000);
    }

    if (timeLeft < duration && wasPlayingBeforePause) {
      await callSpotifyAPI("/me/player/play");
    } else if (workPlaylistId) {
      await callSpotifyAPI("/me/player/shuffle?state=true");
      await callSpotifyAPI("/me/player/play", "PUT", {
        context_uri: `spotify:playlist:${workPlaylistId}`,
      });
    }
    broadcastState();
  } catch (error) {
    console.error("Start timer error:", error);
  }
}

async function updateCountdown() {
  const { isRunning, timeLeft: prevLeft } = await chrome.storage.local.get([
    "isRunning",
    "timeLeft",
  ]);
  if (!isRunning) return; //If the timer is not running, do nothing

  //get the alarm
  const alarm = await chrome.alarms.get("pomodoroTimer");
  if (!alarm) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
    return;
  }

  const newLeft = Math.max(
    0,
    Math.round((alarm.scheduledTime - Date.now()) / 1000)
  );

  if (newLeft !== prevLeft) {
    await chrome.storage.local.set({ timeLeft: newLeft });
    broadcastState();
  }
}

/**
 * Pauses the Pomodoro timer and optionally pauses music
 * Captures the current playback state before pausing
 */
async function pauseTimer() {
  try {
    const { spotify_access_token: token, pauseMusicOnPause } =
      await chrome.storage.local.get([
        "spotify_access_token",
        "pauseMusicOnPause",
      ]);
    if (token) {
      const res = await fetch("https://api.spotify.com/v1/me/player", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fix: Check response before parsing JSON
      if (res.ok && res.status !== 204) {
        const data = await res.json();
        await chrome.storage.local.set({
          wasPlayingBeforePause: data.is_playing,
        });
      } else {
        await chrome.storage.local.set({ wasPlayingBeforePause: false });
      }
    }

    // stop Pomodoro
    await chrome.storage.local.set({ isRunning: false });
    await chrome.alarms.clear("pomodoroTimer");

    if (pauseMusicOnPause) {
      await callSpotifyAPI("/me/player/pause");
    }
  } catch (error) {
    console.error("Pause timer error:", error);
    // Still pause timer even if Spotify fails
    await chrome.storage.local.set({ isRunning: false });
    await chrome.alarms.clear("pomodoroTimer");
  } finally {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    broadcastState();
  }
}

/**
 * Resets the timer to its original duration and stops the countdown
 * Clears any existing alarms and resets the timer state
 */
async function resetTimer() {
  try {
    const { duration } = await chrome.storage.local.get("duration");
    await chrome.storage.local.set({ isRunning: false, timeLeft: duration });
    await chrome.alarms.clear("pomodoroTimer");
  } catch (error) {
    console.error("Reset timer error:", error);
  } finally {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    broadcastState();
  }
}

/**
 * Sets a new timer duration and resets the current time left
 * @param {number} newDuration - New duration in seconds
 */
async function setTimer(newDuration) {
  try {
    await chrome.storage.local.set({
      duration: newDuration,
      timeLeft: newDuration,
    });
    broadcastState();
  } catch (error) {
    console.error("Set timer error:", error);
  }
}

// === Alarm fired ===
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pomodoroTimer") return;

  // stop timer & notify
  await chrome.storage.local.set({ isRunning: false, timeLeft: 0 });
  chrome.notifications.create({
    type: "basic",
    iconUrl: "PomoSpot128.png",
    title: "Time's Up!",
    message: "Your Pomodoro session has ended.",
    priority: 2,
  });

  // switch to break playlist
  const { breakPlaylistId } = await chrome.storage.local.get("breakPlaylistId");
  if (breakPlaylistId) {
    await callSpotifyAPI("/me/player/shuffle?state=true");
    await callSpotifyAPI("/me/player/play", "PUT", {
      context_uri: `spotify:playlist:${breakPlaylistId}`,
    });
  }

  broadcastState();
});

/**
 * Broadcasts the current timer state to all connected popup windows
 * Sends a message with the complete state to update the UI
 */
async function broadcastState() {
  const state = await chrome.storage.local.get(null);
  chrome.runtime.sendMessage({ command: "updateState", state }).catch((err) => {
    if (!err.message.includes("Could not establish connection")) {
      console.error("Broadcast error:", err);
    }
  });
}

// === Listen for messages from popup ===
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    switch (request.command) {
      case "start":
        await startTimer();
        break;
      case "pause":
        await pauseTimer();
        break;
      case "reset":
        await resetTimer();
        break;
      case "setDuration":
        await setTimer(request.duration);
        break;
      case "getState":
        const state = await chrome.storage.local.get(null);
        sendResponse(state);
        break;
      default:
        console.warn("Unknown command:", request.command);
    }
  } catch (error) {
    console.error(`Error executing ${request.command}:`, error);
  }

  return true; // keeps sendResponse valid for async
});
