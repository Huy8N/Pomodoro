import { useEffect, useRef } from "react";

export function useTimerEndPopup({ timeLeft, isRunning, onShow }) {
    const hasShownRef = useRef(false);

  useEffect(() => {
    if (isRunning) {
        hasShownRef.current = false;
        return;
    }

    if (timeLeft === 0 && !hasShownRef.current) {
    onShow();
    hasShownRef.current = true;
    }
  }, [timeLeft, isRunning, onShow]);
}
