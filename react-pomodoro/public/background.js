// Run this script in background


chrome.alarms.OnAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroTimer") {
        chrome.notification.create({
            type: "basic",
            iconUrl: "./public/PomoSpot128.png",
            title: "Time's Up",
            messsage: "Your timer is up. Time for a break!",
            priority: 2
        });
    };
});