// Initial timer state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timeLeft: 0.2 * 60, // 10 seconds for testing purposes
    duration: 0.2 * 60,
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

// // === Countdown updater (runs every second) ===
// setInterval(async () => {
//   const all = await chrome.storage.local.get(null);
//   if (!all.isRunning) return;

//   const alarm = await chrome.alarms.get("pomodoroTimer");
//   if (!alarm) return;

//   const newLeft = Math.max(
//     0,
//     Math.round((alarm.scheduledTime - Date.now()) / 1000)
//   );
//   if (newLeft !== all.timeLeft) {
//     await chrome.storage.local.set({ timeLeft: newLeft });
//     broadcastState();
//   }
// }, 1000);

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
