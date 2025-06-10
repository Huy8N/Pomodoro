import React from "react";
import spotifyIcon from "./assets/spotifyIcon.png";

const PreviousIcon = () => (
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
);

const NextIcon = () => (
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
);

const PlayIcon = () => (
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
);

const PauseIcon = () => (
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
);

export function SpotifyBanner({ track, isPlaying, controls }) {
  return (
    <div className="spotify-banner-container">
      <div className="spotify-banner">
        <div className="spotify-close-button-container">
          <img
            src={spotifyIcon}
            alt="Spotify Logo"
            className="spotify-logo-icon"
          />
        </div>

        <div className="spotify-content">
          <div className="album-art-container">
            <img src={track.albumArt} alt="Album Art" className="album-art" />
          </div>

          <div className="track-details-and-controls">
            <div className="track-info">
              <h3 className="track-title">{track.name}</h3>
              <p className="artist-name">{track.artist}</p>
            </div>

          <div className="progress-container">
            <span className="current-time">{track.currentTime}</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${track.progress}%` }}
              ></div>
            </div>
            <span className="total-time">{track.duration}</span>
          </div>

          <div className="playback-controls">
            <button onClick={controls.previousTrack} className="control-btn">
              <PreviousIcon />
            </button>

            <button
              onClick={controls.togglePlayPause}
              className="control-btn play-pause-btn"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button onClick={controls.nextTrack} className="control-btn">
              <NextIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
