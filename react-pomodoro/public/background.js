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
  return self.crypto.subtle.digest("SHA-256", data);
};
//Derive a seperate key from that hash that can be used to verify user
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

async function handleLogin() {
      // 1) PKCE 
      const codeVerifier = generateRandomString(64);
      const hashed = await sha256(codeVerifier);
      const codeChallenge = base64encode(hashed);
      const redirectUri = chrome.identity.getRedirectURL('oauth2');

      await chrome.storage.local.set({
        spotify_code_verifier: codeVerifier,
        spotify_redirect_uri: redirectUri,
      });

      // 3) Build authorize URL 
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


      try {
        const finalUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      // 5) Handle callback
      const url = new URL(finalUrl);
      const code = url.searchParams.get("code");
      const err = url.searchParams.get("error");

      if (err) throw new Error(`Spotify auth error: ${err}`);
      if (!code) throw new Error("No code returned from Spotify");

      await exchangeCodeForToken(code);
      broadcastState();
    } catch (e) {
      console.log(e.message)
    }
  };

async function exchangeCodeForToken(code) {
  const { spotify_code_verifier, spotify_redirect_uri } =
    await chrome.storage.local.get(["spotify_code_verifier", "spotify_redirect_uri"]);

  if (!spotify_code_verifier || !spotify_redirect_uri) {
    throw new Error("Code verifier or redirect URI not found in storage.");
  }

  const payload = {
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotify_redirect_uri,
    code_verifier: spotify_code_verifier,
  };

  try {
    const response = await axios.post(
      TOKEN_ENDPOINT,
      new URLSearchParams(payload).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token } = response.data;
    if (!access_token) {
      throw new Error("No access token found in token response");
    }

    await chrome.storage.local.set({
      spotify_access_token: access_token,
      // Always save the new refresh token if one is provided
      spotify_refresh_token: refresh_token || (await chrome.storage.local.get('spotify_refresh_token')).spotify_refresh_token,
    });

  } catch (error) {
    console.error("Token exchange failed:", error?.response?.data || error.message);
    throw error;
  } finally {
    // Clean up one-time values regardless of success or failure
    await chrome.storage.local.remove(["spotify_code_verifier", "spotify_redirect_uri"]);
  }
}


async function handleLogout() {
  chrome.storage.local.remove([
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_code_verifier",
  ]);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Use a flag to handle async responses correctly
    let isAsync = false;

    switch (request.command) {
        case "login": // ADDED: Command to start login
            handleLogin();
            break;
        case "logout": // ADDED: Command to handle logout
            handleLogout();
            break;
        case "start":
            startTimer();
            break;
        case "pause":
            pauseTimer();
            break;
        case "reset":
            resetTimer();
            break;
        case "setDuration":
            setTimer(request.duration);
            break;
        case "getState":
            isAsync = true;
            chrome.storage.local.get(null).then(state => {
                sendResponse(state);
            });
            break;
        default:
            console.warn("Unknown command:", request.command);
    }

    // Return true to keep the message channel open for the async response
    return isAsync;
});

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
