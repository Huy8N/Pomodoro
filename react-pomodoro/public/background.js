// Run this script in background


chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroTimer") {
        chrome.notification.create({
            type: "basic",
            iconUrl: "PomoSpot128.png",
            title: "Time's Up",
            message: "Your timer is up. Time for a break!",
            priority: 2
        });
    };
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "startTimer") {
    // Clear any previous alarm to prevent duplicates
    chrome.alarms.clear("pomodoroTimer");
    // Create a new alarm
    chrome.alarms.create("pomodoroTimer", {
      delayInMinutes: request.duration / 60 // Alarms API uses minutes
    });
    sendResponse({ success: true });
  } else if (request.command === "resetTimer") {
    chrome.alarms.clear("pomodoroTimer");
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for an async response
});