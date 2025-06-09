import React from "react";

const CUSTOM_TIME_OPTIONS = [
  { label: "25 min", seconds: 25 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "35 min", seconds: 35 * 60 },
  { label: "40 min", seconds: 40 * 60 },
  { label: "45 min", seconds: 45 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "2 hours", seconds: 120 * 60 },
  { label: "3 hours", seconds: 180 * 60 },
  { label: "4 hours", seconds: 240 * 60 },
];

export function TimerSelectionMenu({ onSelect, onClose }) {
  const handleSelectTime = (seconds) => {
    onSelect(seconds);
    onClose();
  };
}

return (
  <div className="time-menu-overlay" onClick={onClse}>
    <div className="time=menu" onClick={(e) => e.stopPropagation()}>
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
