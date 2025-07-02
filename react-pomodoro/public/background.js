// huy8n/pomodoro/Pomodoro-feature-extension/react-pomodoro/public/background.js
chrome.runtime.onInstalled.addListener(() => {
  // Initialize state on installation
  chrome.storage.local.set({
    timeLeft: 0.1 * 60, // Default: 15 minutes
    isRunning: false,
    duration: 0.1 * 60,
  });
});

// Timer update loop
setInterval(async () => {
  const allState = await chrome.storage.local.get(null);
  if (allState.isRunning) {
    const alarm = await chrome.alarms.get("pomodoroTimer");
    if (alarm) {
      const newTimeLeft = Math.round((alarm.scheduledTime - Date.now()) / 1000);
      if (newTimeLeft !== allState.timeLeft) {
        chrome.storage.local.set({ timeLeft: newTimeLeft });
        broadcastState();
      }
    }
  }
}, 1000);


chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pomodoroTimer") {
    await chrome.storage.local.set({ isRunning: false, timeLeft: 0 });
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'PomoSpot128.png',
      title: "Time's Up!",
      message: "Your Pomodoro session has ended.",
      priority: 2
    });
    broadcastState();
  }
});

async function startTimer() {
  const allState = await chrome.storage.local.get(null);
  if (allState.isRunning) return;

  await chrome.storage.local.set({ isRunning: true });
  const durationInMinutes = (allState.timeLeft || allState.duration) / 60;
  chrome.alarms.create("pomodoroTimer", { delayInMinutes: durationInMinutes });
  broadcastState();
}

async function pauseTimer() {
  await chrome.storage.local.set({ isRunning: false });
  await chrome.alarms.clear("pomodoroTimer");
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

async function broadcastState() {
  const allState = await chrome.storage.local.get(null);
  chrome.runtime.sendMessage({ command: 'updateState', state: allState }).catch(error => {
    if (error.message.includes("Could not establish connection")) {
        // Expected if the popup is closed
    } else {
        console.error("Broadcast error:", error);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const actions = {
    start: startTimer,
    pause: pauseTimer,
    reset: resetTimer,
    setDuration: () => setTimer(request.duration),
    getState: async () => {
      const state = await chrome.storage.local.get(null);
      sendResponse(state);
    }
  };

  if (actions[request.command]) {
    actions[request.command]();
  }
  return true; // Keep message channel open for async response
});