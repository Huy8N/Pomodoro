import { useState, useEffect, useRef } from "react";
import defaultAlbumCover from "./assets/defaultAlbumCover.png";
import spotifyIcon from "./assets/spotifyIcon.png";
import { useSpotifyAuth } from "./useSpotifyAuth";

function Pomodoro() {
  //Change if the timer active or not
  const [isRunning, setIsRunning] = useState(false);
  // Keep track of time left
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  //change our interval with rerendering
  const intervalRef = useRef(null);
  //set the duration
  const [currentDuration, setCurrentDuration] = useState(0.1 * 60);
  // Track active preset for styling
  const [activePreset, setActivePreset] = useState(1); // Default to 10 min (index 1)
  //Show custom time menu
  const [showTimeMenu, setTimeMenu] = useState(false);
  //Popup for when timer is up
  const [showTimerUp, setShowTimerUp] = useState(false);
  //Show spotify play banner if active
  const [showSpotify, setShowSpotify] = useState(true);

  //Hook for spotify auth
  const { accessToken, error, isLoading, login, logout, spotifyAPICall } =
    useSpotifyAuth();

  //function to check if spotify is currently playing
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  //Set spotify track function
  const [currentTrack, setCurrentTrack] = useState({
    name: "No track playing",
    artist: "Connect to spotify",
    duration: "0:00",
    currentTime: "0:00",
    progress: 0, // percentage
    albumArt: defaultAlbumCover,
  });

  //Get current song playing
  const getCurrentPlayback = async () => {
    if (!accessToken) {
      return;
    }

    try {
      const data = await spotifyAPICall("/me/player/currently-playing");

      if (data && data.item) {
        setCurrentTrack({
          name: data.item.name,
          artist: data.item.artists.map((artist) => artist.name).join(", "),
          duration: formatSpotifyTime(data.item.duration_ms),
          currentTime: formatSpotifyTime(data.progress_ms),
          progress: Math.round(
            (data.progress_ms / data.item.duration_ms) * 100
          ),
          albumArt: data.item.album.images[0]?.url || theWeeknd,
        });
        setIsSpotifyPlaying(data.is_playing);
      } else {
        // No track playing
        setCurrentTrack({
          name: "No track playing",
          artist: "Start playing music on Spotify",
          duration: "0:00",
          currentTime: "0:00",
          progress: 0,
          albumArt: theWeeknd,
        });
        setIsSpotifyPlaying(false);
      }
    } catch (err) {
      console.error("Error getting current playback:", err);
    }
  };

  //format spotify progress time
  const formatSpotifyTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  //toggle playbacks controls
  const toggleSpotifyPlaybacks = async () => {
    if (!accessToken) {
      login();
      return;
    }

    try {
      if (isSpotifyPlaying) {
        await spotifyAPICall("/me/player/pause", "PUT");
      } else {
        await spotifyAPICall("/me/player/play", "PUT");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const previousTrack = async () => {
    if (!accessToken) {
      return;
    }

    try {
      await spotifyAPICall("/me/player/previous", "POST");
      setTimeout(getCurrentPlayback, 500);
    } catch (error) {
      console.log(error);
    }
  };

  const nextTrack = async () => {
    if (!accessToken) {
      return;
    }

    try {
      await spotifyAPICall("/me/player/next", "POST");
      setTimeout(getCurrentPlayback, 500);
    } catch (error) {
      console.log(error);
    }
  };
  const closeSpotifyBanner = () => {
    setShowSpotify(false);
    // Clear the playback polling when banner is closed
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const checkAccountType = async () => {
    if (!accessToken) {
      console.log("No access token available");
      return;
    }

    try {
      const userData = await spotifyAPICall("/me");
      console.log("=== SPOTIFY ACCOUNT INFO ===");
      console.log("Display Name:", userData.display_name);
      console.log("Email:", userData.email);
      console.log("Country:", userData.country);
      console.log("Product (Subscription):", userData.product);
      console.log("Followers:", userData.followers.total);
      console.log("=== END ACCOUNT INFO ===");

      if (userData.product === "free") {
        console.log("🚫 FREE ACCOUNT - Playback controls will not work");
        alert(
          "Free Spotify account detected. Playback controls require Spotify Premium."
        );
      } else if (userData.product === "premium") {
        console.log("✅ PREMIUM ACCOUNT - Playback controls should work");
      } else {
        console.log("❓ Unknown subscription type:", userData.product);
      }

      return userData;
    } catch (error) {
      console.error("Error checking account type:", error);
      console.log("Full error object:", error);
    }
  };

  const openSpotify = () => {
    window.open("spotify:", "_blank");
  };

  const playbackIntervalRef = useRef(null);

  useEffect(() => {
    if (accessToken) {
      getCurrentPlayback();

      playbackIntervalRef.current = setInterval(() => {
        getCurrentPlayback(); // ADD () here - you're missing the function call!
      }, 2000);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    // Add cleanup function
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [accessToken]);

  //Formatting the timer in MM:SS
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

  //Update the timer
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setShowTimerUp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  // Start or Pause timer
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(currentDuration);
  };

  // double cliking on timer to show menu
  const singleClickOnTimer = () => {
    //Don't allow double click if timer is running
    if (isRunning) return;
    setTimeMenu(true);
  };

  //Close timer menu
  const closeTimeMenu = () => {
    setTimeMenu(false);
  };

  const closeTimerUpPopup = () => {
    setShowTimerUp(false);
  };

  //Selecting a custom time
  const selectCustomTime = (seconds) => {
    setIsRunning(false);
    setTimeLeft(seconds);
    setCurrentDuration(seconds);
    setActivePreset(-1);
    setTimeMenu(false);
  };

  //Spotify play controls
  const toggleSpotifyPlayback = () => {
    setIsSpotifyPlaying(!isSpotifyPlaying);
  };

  //A list of preset times
  const presetTime = [
    { name: "5m", seconds: 5 * 60 },
    { name: "10m", seconds: 10 * 60 },
    { name: "15m", seconds: 15 * 60 },
    { name: "20m", seconds: 20 * 60 },
  ];

  //list of custom time option
  const customTimeOptions = [
    { label: "25 min", seconds: 25 * 60 },
    { label: "30 min", seconds: 30 * 60 },
    { label: "35 min", seconds: 35 * 60 },
    { label: "40 min", seconds: 40 * 60 },
    { label: "45 hour", seconds: 45 * 60 },
    { label: "1 hours", seconds: 60 * 60 },
    { label: "2 hours", seconds: 120 * 60 },
    { label: "3 hours", seconds: 180 * 60 },
    { label: "4 hours", seconds: 240 * 60 },
  ];

  //presetTimer function
  const selectPreset = (seconds, index) => {
    setIsRunning(false);
    setTimeLeft(seconds);
    setCurrentDuration(seconds);
    setActivePreset(index);
    setTimeMenu(false);
  };

  return (
    <>
      <div className="pomodoro-container">
        <h1>Pomodoro+</h1>

        {/* DEBUG: Show authentication status
        <div className="auth-debug" style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <h4>🔧 Auth Debug Info:</h4>
          <p><strong>Access Token:</strong> {accessToken ? '✅ Connected' : '❌ Not connected'}</p>
          <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Error:</strong> {error || 'None'}</p>
          {accessToken && (
            <div>
              <button onClick={logout} style={{ marginRight: '10px' }}>Logout</button>
              <button onClick={getCurrentPlayback}>Test API Call</button>
            </div>
          )}
        </div>

        <button onClick={checkAccountType} style={{ marginLeft: '10px' }}>
  Check Account Type
</button> */}

        <div
          className={`liveTimer-container ${
            !isRunning ? "double-clickable" : ""
          }`}
          onClick={singleClickOnTimer}
        >
          <p>{formatTime(timeLeft)}</p>
        </div>

        {showTimerUp && (
          <div className="timer-up-overlay" onClick={closeTimerUpPopup}>
            <div
              className="timer-up-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <h2>⏰ Time's Up!</h2>
              <p>Your pomodoro has finished.</p>
              <button className="dismiss-btn" onClick={closeTimerUpPopup}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {showTimeMenu && (
          <div className="time-menu-overlay" onClick={closeTimeMenu}>
            <div className="time-menu" onClick={(e) => e.stopPropagation()}>
              <h3>Select Time</h3>
              <div className="time-options">
                {customTimeOptions.map((option, index) => (
                  <button
                    key={index}
                    className="time-option"
                    onClick={() => selectCustomTime(option.seconds)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button className="close-menu" onClick={closeTimeMenu}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="controls">
          <button onClick={toggleTimer} className="control-btn">
            {isRunning ? (
              //pause
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
              </svg>
            ) : (
              // Play icon
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
              </svg>
            )}
          </button>
          <button onClick={resetTimer} className="reset-btn">
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
            </svg>
          </button>
        </div>

        <div className="presets">
          {presetTime.map((preset, index) => (
            <button
              className={`preset-btn ${activePreset === index ? "active" : ""}`}
              key={index}
              onClick={() => selectPreset(preset.seconds, index)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {showSpotify && (
        <div className="spotify-banner-container">
          <div className="spotify-banner">
            {/* Spotify Logo/Close Button - Positioned via CSS */}
            <div className="spotify-close-button-container">
              <img
                src={spotifyIcon} // Use imported icon
                alt="Close Spotify Banner"
                className="spotify-logo-icon"
              />
            </div>

            <div className="spotify-content">
              <div className="album-art-container">
                <img
                  src={currentTrack.albumArt}
                  alt="Album Art"
                  className="album-art"
                />
              </div>

              <div className="track-details-and-controls">
                <div className="track-info">
                  <h3 className="track-title">{currentTrack.name}</h3>
                  <p className="artist-name">{currentTrack.artist}</p>
                </div>

                <div className="progress-container">
                  <span className="current-time">
                    {currentTrack.currentTime}
                  </span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${currentTrack.progress}%` }}
                    ></div>
                  </div>
                  <span className="total-time">{currentTrack.duration}</span>
                </div>

                <div className="playback-controls">
                  {/* {!accessToken} ? (
                    <button onClick={login} className="spotify-login-btn">
                      Login to Spotify
                    </button>
                  ) */}
                  <button onClick={previousTrack} className="control-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061A1.125 1.125 0 0 1 21 8.689v8.122ZM11.25 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061a1.125 1.125 0 0 1 1.683.977v8.122Z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={toggleSpotifyPlaybacks}
                    className="control-btn play-pause-btn"
                  >
                    {isSpotifyPlaying ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-8 h-8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-8 h-8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                        />
                      </svg>
                    )}
                  </button>

                  <button onClick={nextTrack} className="control-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Pomodoro;
