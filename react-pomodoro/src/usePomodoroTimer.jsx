import { useState, useEffect, useRef } from "react";

export const usePomodoroTimer = (initialDuration) => {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [currentDuration, setCurrentDuration] = useState(initialDuration);
  const intervalRef = useRef(null);

  //Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1); 
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);


  // Set timer to opposite of previous state pause => play, vice versa
  const toggleTimer = () => {
    setIsRunning(prev => !prev);
  }

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(currentDuration);
  }

  const setTimer = (seconds) => {
    setIsRunning(false);
    setTimeLeft(seconds);
    setCurrentDuration(seconds);
  }

  const formatTime = (seconds) => {
    if (seconds >= 3600) {
      const minutes = Math.floor((seconds % 3600) / 60);
      const hours = Math.floor(seconds / 3600);
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  };

  return {
    timeLeft,
    isRunning,
    formattedTime: formatTime(timeLeft),
    toggleTimer,
    resetTimer,
    setTimer
  };
};
