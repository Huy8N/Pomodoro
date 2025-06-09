import { useState, useEffect, useRef } from "react";
import defaultAlbumCover from "./assets/defaultAlbumCover.png";
import spotifyIcon from "./assets/spotifyIcon.png";
import { useSpotifyAuth } from "./useSpotifyAuth";

function Pomodoro({ settings = {}, onOpenSettings }) {
  const { playSoundOnEnd = false, pauseMusicOnPause = false } = settings;

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
  const [wasPlayingBeforePause, setWasPlayingBeforePause] = useState(false);
  //Set spotify track function
  const [currentTrack, setCurrentTrack] = useState({
    name: "No track playing",
    artist: "Connect to spotify",
    duration: "0:00",
    currentTime: "0:00",
    progress: 0, // percentage
    albumArt: defaultAlbumCover,
  });

  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.src =
      "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const playTimerEndSound = () => {
    if (playSoundOnEnd && audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch((e) => {
        console.log("Could not play timer end sound", e);
      });
    }
  };

  const stopTimerSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };


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
          albumArt: data.item.album.images[0]?.url || defaultAlbumCover,
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
          albumArt: defaultAlbumCover,
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

  

  // Start or Pause timer
  const toggleTimer = () => {
    const newRunningState = !isRunning;

    if (pauseMusicOnPause && accessToken) {
      if (newRunningState) {
        if (wasPlayingBeforePause) {
          resumeSpotifyMusic();
          setWasPlayingBeforePause(false);
        }
      } else {
        if (isSpotifyPlaying) {
          setWasPlayingBeforePause(true);
          pauseSpotifyMusic();
        }
      }
    }
    setIsRunning(newRunningState);
  };

  // reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(currentDuration);
  };

  // single cliking on timer to show menu
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
    stopTimerSound();
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
        <button className="settings-btn" onClick={onOpenSettings}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>

        </button>
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
