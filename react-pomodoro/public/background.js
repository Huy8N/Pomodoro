// background.js
// Always-loaded service worker for Pomodoro + Spotify

// On install: set up a short test timer
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 0.1 * 60,    // 6 seconds for testing
    duration: 0.1 * 60,
    isRunning: false
  });
});

// === Spotify helper ===
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
  if (workPlaylistId) {
    await callSpotifyAPI("/me/player/shuffle?state=true");
    await callSpotifyAPI("/me/player/play", "PUT", {
      context_uri: `spotify:playlist:${workPlaylistId}`
    });
  }

  broadcastState();
}

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

async function resetTimer() {
  const { duration } = await chrome.storage.local.get("duration");
  await chrome.storage.local.set({ isRunning: false, timeLeft: duration });
  await chrome.alarms.clear("pomodoroTimer");
  broadcastState();
}

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

// === Notify popup/UI of state changes ===
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
