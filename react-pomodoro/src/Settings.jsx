import { useState, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";
import spotifyIcon from "./assets/spotifyIcon.png";

function Settings({ onSettingChange, onCloseSettings }) {
  // Hooks - using React state instead of localStorage for Claude environment
  const [playSoundOnEnd, setPlaySoundOnEnd] = useState(false);
  const [pauseMusicOnPause, setPauseMusicOnPause] = useState(false);

  //spotify connection status
  const [isConnect, setIsConnect] = useState(false);
  const [isError, setIsError] = useState(false);

  //Hook for spotify auth
  const { accessToken, error, isLoading, login, logout, spotifyAPICall } =
    useSpotifyAuth();

  useEffect(() => {
    // In your actual app, uncomment these localStorage lines:
    // localStorage.setItem("playSoundOnEnd", JSON.stringify(playSoundOnEnd));
    // localStorage.setItem("pauseMusicOnPause", JSON.stringify(pauseMusicOnPause));

    if (onSettingChange) {
      onSettingChange({
        playSoundOnEnd,
        pauseMusicOnPause,
      });
    }
  }, [playSoundOnEnd, pauseMusicOnPause, onSettingChange]);

  //check if user is login
  const checkSpotifyConnected = async () => {
    if (!accessToken) {
      setIsError("Invalid access token");
    }
  };

  //Handling login and logout
  const handleSpotifyConnection = () => {
    if (accessToken) {
      logout();
    } else {
      login();
    }
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
                <span className="connected-text">Connected</span>
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

        <div className="timer-settings">
          <div className="setting-item">
            <ToggleSwitch
              isOn={playSoundOnEnd}
              onToggle={() => setPlaySoundOnEnd(!playSoundOnEnd)}
              label="Play sound when timer ends"
            />
          </div>

          <div className="setting-item">
            <ToggleSwitch
              isOn={pauseMusicOnPause}
              onToggle={() => setPauseMusicOnPause(!pauseMusicOnPause)}
              label="Pause music on timer pause"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
