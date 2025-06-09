import { useState, useEffect, useRef } from "react";
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
  const { accessToken, login, spotifyAPICall } = useSpotifyAuth();
  const [currentTrack, setCurrentTrack] = useState(NO_TRACK_PLAYING);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const playbackIntervalRef = useRef(null);

  const getCurrentPlayback = async () => {
    if (!accessToken) return;
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
        setCurrentTrack(NO_TRACK_PLAYING);
        setIsSpotifyPlaying(false);
      }
    } catch (error) {
      console.error("Error getting current playback:", error);
    }
  };

  useEffect(() => {
    if (accessToken) {
      getCurrentPlayback();
      playbackIntervalRef.current = setInterval(getCurrentPlayback, 1000);
    }
    return () => clearInterval(playbackIntervalRef.current);
  }, [accessToken, spotifyAPICall]);

  const togglePlayPause = async () => {
    if (!accessToken) {
      login();
      return;
    }
    const endpoint = isSpotifyPlaying ? "/me/player/pause" : "/me/player/play";
    await spotifyAPICall(endpoint, "PUT");
    setTimeout(getCurrentPlayback, 500);
  };

  const nextTrack = async () => {
    if (!accessToken) return;
    await spotifyAPICall("/me/player/next", "POST");
    setTimeout(getCurrentPlayback, 500);
  };

  const previousTrack = async () => {
    if (!accessToken) return;
    await spotifyAPICall("/me/player/previous", "POST");
    setTimeout(getCurrentPlayback, 500);
  };

  const puaseMusic = () => {
    if (isSpotifyPlaying) {
      spotifyAPICall("/me/player/pause", "PUT");
    }
  };

  const resumeMusic = () => {
    spotifyAPICall("/me/player/play", "PUT");
  };

  return {
    currentTrack,
    isSpotifyPlaying,
    accessToken,
    controls: {
      togglePlayPause,
      nextTrack,
      previousTrack,
      puaseMusic,
      resumeMusic,
    },
  };
};
