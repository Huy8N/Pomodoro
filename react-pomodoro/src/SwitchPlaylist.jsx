import { useState, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";

function SwitchPlaylist({ settings, onSettingChange }) {
  const { spotifyAPICall, accessToken } = useSpotifyAuth();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!accessToken) return;
      setIsLoading(true);
      const data = await spotifyAPICall("/me/playlists", "GET");
       console.log("Data received from Spotify API:", data); 
      if (data && data.items) {
        setPlaylists(data.items);
      }
      setIsLoading(false);
    };
    fetchPlaylists();
  }, [accessToken, spotifyAPICall]);

  const handlePlaylistChange = (type, playlistId) => {
    const newSettings = {
      ...settings,
      [type]: playlistId,
    };
    onSettingChange(newSettings);
  };

  if (isLoading) {
    return <p>Loading playlists...</p>;
  }

  return (
    <div className="playlist-selectors">
      <div className="playlist-selector">
        <label htmlFor="work-playlist">Work Playlist</label>
        <select
          id="work-playlist"
          value={settings.workPlaylistId || ""}
          onChange={(e) =>
            handlePlaylistChange("workPlaylistId", e.target.value)
          }
        >
          <option value="">Select a playlist</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      </div>
      <div className="playlist-selector">
        <label htmlFor="break-playlist">Break Playlist</label>
        <select
          id="break-playlist"
          value={settings.breakPlaylistId || ""}
          onChange={(e) =>
            handlePlaylistChange("breakPlaylistId", e.target.value)
          }
        >
          <option value="">Select a playlist</option>
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default SwitchPlaylist;
