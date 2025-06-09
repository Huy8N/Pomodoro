import React from "react";

const PlayIcon = () => {
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
    className="icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
    />
  </svg>;
};

const PauseIcon = () => {
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    fill="none"
    className="icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
    />
  </svg>;
};

const ResetIcon = () => {
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    class="size-6"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>;
};

export function TimerControls({
  isRunning,
  onToggle,
  onReset,
  presets,
  activePreset,
  onSelectPreset,
}) {
  return (
    <>
      <div className="controls">
        <button onClick={onToggle} className="control-btn">
          {isRunning ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={onReset} className="reset-btn">
          <ResetIcon />
        </button>
      </div>

      <div className="presets">
        {presets.map((preset, index) => (
          <button
            className={`preset-btn ${activePreset === index ? "ative" : ""}`}
            key={preset.name}
            oncClick={() => onSelectPreset(preset.seconds, index)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </>
  );
}
