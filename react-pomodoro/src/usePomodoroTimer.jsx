// huy8n/pomodoro/Pomodoro-feature-extension/react-pomodoro/src/usePomodoroTimer.jsx
import { useState, useEffect, useCallback } from "react";
import { DEFAULT_TIMER_DURATION } from "./constants";

export const usePomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER_DURATION);
  const [isRunning, setIsRunning] = useState(false);

  const updateLocalState = useCallback((state) => {
      if (state) {
        setTimeLeft(state.timeLeft);
        setIsRunning(state.isRunning);
      }
  }, []);


  useEffect(() => {
    // Immediately request state from the background script
    chrome.runtime.sendMessage({ command: "getState" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(`Error getting state: ${chrome.runtime.lastError.message}`);
        } else {
            updateLocalState(response);
        }
    });

    // Listen for broadcasts from the background script
    const messageListener = (message) => {
        if (message.command === 'updateState') {
            updateLocalState(message.state);
        }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener on unmount
    return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [updateLocalState]);

  const toggleTimer = () => {
    chrome.runtime.sendMessage({ command: isRunning ? "pause" : "start" });
  };

  const resetTimer = () => {
    chrome.runtime.sendMessage({ command: "reset" });
  };

  const setTimer = (seconds) => {
    chrome.runtime.sendMessage({ command: "setDuration", duration: seconds });
  };

  const formatTime = (seconds) => {
    if (seconds === null || typeof seconds !== 'number') return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isRunning,
    formattedTime: formatTime(timeLeft),
    toggleTimer,
    resetTimer,
    setTimer,
  };
};