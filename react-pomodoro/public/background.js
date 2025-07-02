// huy8n/pomodoro/Pomodoro-feature-extension/react-pomodoro/public/background.js

// Timer state
let timerState = {
    timeLeft: null,
    isRunning: false,
    duration: 0.1 * 60, 
};

// Interval reference
let timerInterval = null;

// Timer logic
function startTimer() {
    if (timerState.isRunning) return;

    timerState.isRunning = true;
    if (timerState.timeLeft === null || timerState.timeLeft <= 0) {
        timerState.timeLeft = timerState.duration;
    }

    timerInterval = setInterval(() => {
        timerState.timeLeft--;
        broadcastState();

        if (timerState.timeLeft <= 0) {
            clearInterval(timerInterval);
            timerState.isRunning = false;
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'PomoSpot128.png',
                title: "Time's Up!",
                message: "Your Pomodoro session has ended.",
                priority: 2
            });
            // Wait for user action before resetting
            broadcastState();
        }
    }, 1000);
}

function pauseTimer() {
    timerState.isRunning = false;
    clearInterval(timerInterval);
    broadcastState();
}

function resetTimer() {
    timerState.isRunning = false;
    clearInterval(timerInterval);
    timerState.timeLeft = timerState.duration;
    broadcastState();
}

function setTimer(newDuration) {
    timerState.duration = newDuration;
    if (!timerState.isRunning) {
        timerState.timeLeft = newDuration;
    }
    broadcastState();
}

// Function to send the current state to the popup
function broadcastState() {
    chrome.runtime.sendMessage({ command: 'updateState', state: timerState }).catch(error => {
        // This can happen if the popup is closed, which is expected.
        if (error.message.includes("Could not establish connection")) {
            // console.log("Popup is not open.");
        } else {
            console.error("Broadcast error:", error);
        }
    });
}

// Message listener for commands from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.command) {
        case 'start':
            startTimer();
            break;
        case 'pause':
            pauseTimer();
            break;
        case 'reset':
            resetTimer();
            break;
        case 'setDuration':
            setTimer(request.duration);
            break;
        case 'getState':
             if (timerState.timeLeft === null) {
                timerState.timeLeft = timerState.duration;
            }
            sendResponse(timerState);
            break;
    }
    // `return true` is essential for async `sendResponse`
    return true;
});