import { useEffect } from "react";

export function useTimerEndPopup({ timeLeft, isRunning, onShow }) {
  useEffect(() => {
    if (timeLeft === 0 && !isRunning) onShow();
  }, [timeLeft, isRunning, onShow]);
}
