import { useState, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";
import spotifyIcon from "./assets/spotifyIcon.png";
import Pomodoro from "./Pomodoro";

function Settings() {
  // Hooks
  const [isConnect, setIsConnect] = useState(false);
  const [isPlaylist1, setIsPlaylist1] = useState(false);
  const [isPlaylist2, setIsPlaylist2] = useState(false);
  const [isError, setIsError] = useState(false);

  const {toggleTimer} = Pomodoro();

  //Hook for spotify auth
  const { accessToken, error, isLoading, login, logout, spotifyAPICall } =
    useSpotifyAuth();

  //check if user is login
  const checkSpotifyConnected = async () => {
    if (!accessToken) {
      setIsError("Invalid access token");
    }
  };

  const handleSpotifyConnection = () => {
    if (accessToken) {
      logout();
    } else {
      login();
    }
  };

  const endOfTimer = async () => {
    if (toggleTimer) {

    }
  }

  const [switch1, setSwitch1] = useState(false);
  const [switch2, setSwitch2] = useState(false);


  const ToggleSwitch = ({isOn, onToggle, label}) => {
    return (
        <div className="toggle-container">
            <span className="toggle-label">{label}</span>
            <div
                className={`toggle-switch ${isOn ? 'active' : ''}`}
                onClick={onToggle}
            >
                <div className="toggle-slider"></div>
            </div>
        </div>
    )
  };

  return (
    <>
      <div className="settings-container">
        <h1>Settings</h1>
        <div className="spotify-connection">
          {accessToken ? (
            <div className="connected-state">
              <div className="spotify-info">
                <div className="spotify-setting-logo">
                  <img src={spotifyIcon}></img>
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
              className="connected-btn"
              onClick={handleSpotifyConnection}
              disabled={isLoading}
            >
              {isLoading ? "Loading" : "Connected"}
            </button>
          )}
        </div>
        <div className="pause-music">
            <div>
                <ToggleSwitch
                    isOn={switch1}
                    onToggle={() => setSwitch1(!switch1)}
                    label="Pause music on timer pause"
                />
            </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
