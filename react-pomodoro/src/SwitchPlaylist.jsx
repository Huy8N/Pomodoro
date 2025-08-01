import { useState, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";

const SwitchPlaylist = () => {
  const { accessToken } = useSpotifyAuth();
  const [playlists, setPlaylists] = useState([]);
  const [selectedWorkPlaylist, setSelectedWorkPlaylist] = useState("");
  const [selectedBreakPlaylist, setSelectedBreakPlaylist] = useState("");

  // Fetch playlists from the service worker
  useEffect(() => {
    if (accessToken) {
      chrome.runtime.sendMessage({ command: "getPlaylists" }, (response) => {
        if (response && response.items) {
          setPlaylists(response.items);
        } else {
          console.error("Failed to fetch playlists:", response);
          setPlaylists([]);
        }
      });
    }
  }, [accessToken]);

  // Load saved playlist selections from storage
  useEffect(() => {
    chrome.storage.local.get(["workPlaylistId", "breakPlaylistId"], (result) => {
      if (result.workPlaylistId) {
        setSelectedWorkPlaylist(result.workPlaylistId);
      }
      if (result.breakPlaylistId) {
        setSelectedBreakPlaylist(result.breakPlaylistId);
      }
    });
  }, []);

  const handleWorkPlaylistChange = (e) => {
    const playlistId = e.target.value;
    setSelectedWorkPlaylist(playlistId);
    chrome.storage.local.set({ workPlaylistId: playlistId });
  };

  const handleBreakPlaylistChange = (e) => {
    const playlistId = e.target.value;
    setSelectedBreakPlaylist(playlistId);
    chrome.storage.local.set({ breakPlaylistId: playlistId });
  };

  if (!accessToken) {
    return <p>Please log in to Spotify to select playlists.</p>;
  }

  return (
    <div className="playlist-container">
      <div className="playlist-selector">
        <label htmlFor="work-playlist">Work Playlist</label>
        <select
          id="work-playlist"
          value={selectedWorkPlaylist}
          onChange={handleWorkPlaylistChange}
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
          value={selectedBreakPlaylist}
          onChange={handleBreakPlaylistChange}
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
};

export default SwitchPlaylist;