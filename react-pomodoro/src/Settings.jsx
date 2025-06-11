import { useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";
import spotifyIcon from "./assets/spotifyIcon.png";

function Settings({ onSettingChange, onCloseSettings, settings }) {
  // Hooks - using React state instead of localStorage for Claude environment
  const {playSoundOnEnd, pauseMusicOnPause} = settings;

  //Hook for spotify auth
  const { accessToken, error, isLoading, login, logout, spotifyAPICall } =
    useSpotifyAuth();

  //Handling login and logout
  const handleSpotifyConnection = () => {
    if (accessToken) {
      logout();
    } else {
      login();
    }
  };

  const handleToggle = (settingKey) => {
    // Create the new, updated settings object
    const newSettings = {
      ...settings, // 1. Copy all current settings
      [settingKey]: !settings[settingKey], // 2. Flip the value of the one that was clicked
    };
    // 3. Call the function from App.jsx to update the master state
    onSettingChange(newSettings);
  };

  const ToggleSwitch = ({ isOn, onToggle, label }) => {
    return (
      <div className="toggle-container">
        <span className="toggle-label">{label}</span>
        <div
          className={`toggle-switch ${isOn ? "active" : ""}`}
          onClick={onToggle}
        >
          <div className="toggle-slider"></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="settings-container">
        <h1>Settings</h1>
        <button className="back-btn" onClick={onCloseSettings}>
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
              d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
            />
          </svg>
        </button>
        <div className="spotify-connection">
          {accessToken ? (
            <div className="connected-state">
              <div className="spotify-info">
                <div className="spotify-setting-logo">
                  <img src={spotifyIcon} alt="Spotify" />
                </div>
              </div>
              <button
                className="disconnect-btn"
                onClick={handleSpotifyConnection}
                disabled={isLoading}
              >
                {isLoading ? "Loading" : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              className="connect-btn"
              onClick={handleSpotifyConnection}
              disabled={isLoading}
            >
              {isLoading ? "Loading" : "Connect"}
            </button>
          )}
        </div>

        <div className="playlist-sync">
          <h2>Playlist sync for Pomodoro</h2>
          <div className="playlist-show">
            
          </div>
        </div>

        <div className="timer-settings">
          <div className="setting-item">
            <ToggleSwitch
              isOn={playSoundOnEnd}
              onToggle={() => handleToggle('playSoundOnEnd')}
              label="Play sound when timer ends"
            />
          </div>

          <div className="setting-item">
            <ToggleSwitch
              isOn={pauseMusicOnPause}
              onToggle={() => handleToggle('pauseMusicOnPause')}
              label="Pause music on timer pause"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
