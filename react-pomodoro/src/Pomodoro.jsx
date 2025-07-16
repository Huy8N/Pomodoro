import { useState, useEffect, useRef } from "react";
import { usePomodoroTimer } from "./usePomodoroTimer";
import { useSpotifyPlayback } from "./useSpotifyPlayback";
import { PRESET_TIMES, DEFAULT_TIMER_DURATION } from "./constants";
import { SpotifyBanner } from "./SpotifyBanner";
import { TimerControls } from "./TimerControls";
import { TimerSelectionMenu } from "./TimeSelectionMenu";
import { TimerUpPopup } from "./TimerUpPopup";
import { useTimerEndPopup } from "./useTimerEndPopup";
import { useAudioAlert } from "./useAudioAlert";

function Pomodoro({ settings = {}, onOpenSettings }) {
  const { playSoundOnEnd = false, pauseMusicOnPause = false, workPlaylistId, breakPlaylistId} = settings;

  const [activePreset, setActivePreset] = useState(1);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [showTimerUp, setShowTimerUp] = useState(false);
  const [wasPlayingBeforePause, setWasPlayingBeforePause] = useState(false);

  const timerStarted = useRef(false);
  const [popupHasBeenShown, setPopupHasBeenShown] = useState(false);

  const {
    timeLeft,
    isRunning,
    formattedTime,
    toggleTimer,
    resetTimer,
    setTimer,
  } = usePomodoroTimer();

  const {
    currentTrack,
    isSpotifyPlaying,
    accessToken,
    controls: spotifyControls,
  } = useSpotifyPlayback();

  // const audioRef = useRef(null);
  // useEffect(() => {
  //   audioRef.current = new Audio(
  //     "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
  //   );
  // }, []);

  // useEffect(() => {
  //   if (isRunning && !timerStarted.current) {
  //     spotifyControls.playFromPlaylist(workPlaylistId);
  //     timerStarted.current = true;
  //   } else if (!isRunning) {
  //     timerStarted.current = false;
  //   }
  // }, [isRunning, workPlaylistId, spotifyControls]);

  useEffect(() => {
    if (isRunning) {
      setPopupHasBeenShown(false);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!pauseMusicOnPause || !accessToken) return;

    if (isRunning) {
      if (wasPlayingBeforePause) {
        spotifyControls.resumeMusic();
        setWasPlayingBeforePause(false);
      }
    } else {
      if (isSpotifyPlaying) {
        setWasPlayingBeforePause(true);
        spotifyControls.pauseMusic();
      }
    }
  }, [
    isRunning,
    pauseMusicOnPause,
    accessToken,
    isSpotifyPlaying,
    spotifyControls,
  ]);

  const audioRef = useAudioAlert("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

  useTimerEndPopup({
    timeLeft,
    isRunning,
    onShow: () => {
      setShowTimerUp(true);
      if (playSoundOnEnd) audioRef.current.play();
      spotifyControls.playFromPlaylist(breakPlaylistId);
    }
  })
  const selectPreset = (seconds, index) => {
    setTimer(seconds);
    setActivePreset(index);
  };

  const handleClosePopup = () => {
    setShowTimerUp(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <>
    <div className="app-container">
      <div className="pomodoro-container">
        <h1>Pomodoro+</h1>
        <button className="settings-btn" onClick={onOpenSettings}>
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
              d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>

        <div
          className={`liveTimer-container ${!isRunning ? "double-clickable" : ""}`}
          onClick={() => !isRunning && setShowTimeMenu(true)}
        >
          <p>{formattedTime}</p>
        </div>

        <TimerControls
          isRunning={isRunning}
          onToggle={toggleTimer}
          onReset={resetTimer}
          presets={PRESET_TIMES}
          activePreset={activePreset}
          onSelectPreset={selectPreset}
        />
      </div>

      {accessToken && (
        <SpotifyBanner
          track={currentTrack}
          isPlaying={isSpotifyPlaying}
          controls={spotifyControls}
        />
      )}

      {showTimeMenu && (
        <TimerSelectionMenu
          onSelect={setTimer}
          onClose={() => setShowTimeMenu(false)}
        />
      )}
      {showTimerUp && <TimerUpPopup onClose={handleClosePopup} />}
    </div>
    </>
  );
}

export default Pomodoro;
