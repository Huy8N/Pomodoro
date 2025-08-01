import { useState, useEffect, useRef, useCallback } from "react";
import defaultAlbumCover from "./assets/defaultAlbumCover.png";
import { useSpotifyAuth } from "./useSpotifyAuth";

const formatSpotifyTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const NO_TRACK_PLAYING = {
  name: "No track playing",
  artist: "Connect to spotify",
  duration: "0:00",
  currentTime: "0:00",
  progress: 0,
  albumArt: defaultAlbumCover,
};

export const useSpotifyPlayback = () => {
  const { accessToken, login } = useSpotifyAuth();
  const [currentTrack, setCurrentTrack] = useState(NO_TRACK_PLAYING);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const playbackIntervalRef = useRef(null);

  const getCurrentPlayback = useCallback(() => {
    if (!accessToken) return;
    chrome.runtime.sendMessage({ command: "getCurrentPlayback" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting current playback:", chrome.runtime.lastError.message);
        setCurrentTrack(NO_TRACK_PLAYING);
        setIsSpotifyPlaying(false);
        return;
      }

      if (response && response.item) {
        setCurrentTrack({
          name: response.item.name,
          artist: response.item.artists.map((artist) => artist.name).join(", "),
          duration: formatSpotifyTime(response.item.duration_ms),
          currentTime: formatSpotifyTime(response.progress_ms),
          progress: Math.round(
            (response.progress_ms / response.item.duration_ms) * 100
          ),
          albumArt: response.item.album.images[0]?.url || defaultAlbumCover,
        });
        setIsSpotifyPlaying(response.is_playing);
      } else {
        setCurrentTrack(NO_TRACK_PLAYING);
        setIsSpotifyPlaying(false);
      }
    });
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      getCurrentPlayback();
      playbackIntervalRef.current = setInterval(getCurrentPlayback, 1000);
    } else {
      clearInterval(playbackIntervalRef.current);
    }
    return () => clearInterval(playbackIntervalRef.current);
  }, [accessToken, getCurrentPlayback]);

  const sendMessageWithCallback = (command) => {
    chrome.runtime.sendMessage({ command }, () => {
      setTimeout(getCurrentPlayback, 500);
    });
  };

  const togglePlayPause = async () => {
    if (!accessToken) {
      login();
      return;
    }
    sendMessageWithCallback(isSpotifyPlaying ? "pauseSpotify" : "playSpotify");
  };

  const nextTrack = async () => {
    if (!accessToken) return;
    sendMessageWithCallback("nextTrack");
  };

  const previousTrack = async () => {
    if (!accessToken) return;
    sendMessageWithCallback("previousTrack");
  };

  return {
    currentTrack,
    isSpotifyPlaying,
    accessToken,
    controls: {
      togglePlayPause,
      nextTrack,
      previousTrack,
    },
  };
};