import React from "react";
import { CUSTOM_TIME_OPTIONS } from "./constants";

export function TimerSelectionMenu({ onSelect, onClose }) {
  const handleSelectTime = (seconds) => {
    onSelect(seconds);
    onClose();
  };

  return (
    <div className="time-menu-overlay" onClick={onClse}>
      <div className="time-menu" onClick={(e) => e.stopPropagation()}>
        <h3>Select Time</h3>
        <div className="time-options">
          {CUSTOM_TIME_OPTIONS.map((option) => (
            <button
              key={option.label}
              className="time-option"
              onClick={() => handleSelectTime(option.seconds)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button className="close-menu" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
  
}
