// Initial timer state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 0.2 * 60,    // 10 seconds for testing purposes
    duration: 0.2 * 60,
    isRunning: false
  });
});

/**
 * Helper function to make API calls to Spotify
 * @param {string} endpoint - The Spotify API endpoint to call
 * @param {string} method - HTTP method (default: "PUT")
 * @param {object} body - Request body for POST/PUT requests
 */
async function callSpotifyAPI(endpoint, method = "PUT", body = null) {
  const { spotify_access_token: token } = await chrome.storage.local.get("spotify_access_token");
  if (!token) return;
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  await fetch(`https://api.spotify.com/v1${endpoint}`, opts);
}

// === Timer actions ===

/**
 * Starts the Pomodoro timer and begins playing work playlist
 * Creates a Chrome alarm for the countdown and switches to work music
 */
async function startTimer() {
  const { isRunning } = await chrome.storage.local.get("isRunning");
  if (isRunning) return;

  // Mark running & schedule
  await chrome.storage.local.set({ isRunning: true });
  const { timeLeft, duration } = await chrome.storage.local.get(["timeLeft","duration"]);
  chrome.alarms.create("pomodoroTimer", {
    delayInMinutes: (timeLeft || duration) / 60
  });

  // Switch to work playlist (if set)
  const { workPlaylistId } = await chrome.storage.local.get("workPlaylistId");
  // if (workPlaylistId) {
  //   await callSpotifyAPI("/me/player/shuffle?state=true");
  //   await callSpotifyAPI("/me/player/play", "PUT", {
  //     
  //   });
  // }

  if (timeLeft < duration && wasPlayingBeforePause) {
    await callSpotifyAPI("/me/player/play");
  } else if (workPlaylistId) {
    await callSpotifyAPI("/me/player/shuffle?state=true");
    await callSpotifyAPI("/me/player/play", "PUT", {
      context_uri: `spotify:playlist:${workPlaylistId}`
    })
  }
  broadcastState();
}

/**
 * Pauses the Pomodoro timer and optionally pauses music
 * Captures the current playback state before pausing
 */
async function pauseTimer() {
  // capture whether playback was active
  const { spotify_access_token: token } = await chrome.storage.local.get("spotify_access_token");
  if (token) {
    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    await chrome.storage.local.set({ wasPlayingBeforePause: data.is_playing });
  }

  // stop Pomodoro
  await chrome.storage.local.set({ isRunning: false });
  await chrome.alarms.clear("pomodoroTimer");

  // optionally pause music
  const { pauseMusicOnPause } = await chrome.storage.local.get("pauseMusicOnPause");
  if (pauseMusicOnPause) {
    await callSpotifyAPI("/me/player/pause");
  }

  broadcastState();
}

/**
 * Resets the timer to its original duration and stops the countdown
 * Clears any existing alarms and resets the timer state
 */
async function resetTimer() {
  const { duration } = await chrome.storage.local.get("duration");
  await chrome.storage.local.set({ isRunning: false, timeLeft: duration });
  await chrome.alarms.clear("pomodoroTimer");
  broadcastState();
}

/**
 * Sets a new timer duration and resets the current time left
 * @param {number} newDuration - New duration in seconds
 */
async function setTimer(newDuration) {
  await chrome.storage.local.set({ duration: newDuration, timeLeft: newDuration });
  broadcastState();
}

// === Countdown updater (runs every second) ===
setInterval(async () => {
  const all = await chrome.storage.local.get(null);
  if (!all.isRunning) return;

  const alarm = await chrome.alarms.get("pomodoroTimer");
  if (!alarm) return;

  const newLeft = Math.max(0, Math.round((alarm.scheduledTime - Date.now()) / 1000));
  if (newLeft !== all.timeLeft) {
    await chrome.storage.local.set({ timeLeft: newLeft });
    broadcastState();
  }
}, 1000);

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
    priority: 2
  });

  // switch to break playlist
  const { breakPlaylistId } = await chrome.storage.local.get("breakPlaylistId");
  if (breakPlaylistId) {
    await callSpotifyAPI("/me/player/shuffle?state=true");
    await callSpotifyAPI("/me/player/play", "PUT", {
      context_uri: `spotify:playlist:${breakPlaylistId}`
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
  chrome.runtime.sendMessage({ command: "updateState", state })
    .catch(err => {
      if (!err.message.includes("Could not establish connection")) {
        console.error("Broadcast error:", err);
      }
    });
}

// === Listen for messages from popup ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const actions = {
    start:     startTimer,
    pause:     pauseTimer,
    reset:     resetTimer,
    setDuration: () => setTimer(request.duration),
    getState:  async () => { sendResponse(await chrome.storage.local.get(null)); }
  };
  if (actions[request.command]) actions[request.command]();
  return true;  // keeps sendResponse valid for async
});
