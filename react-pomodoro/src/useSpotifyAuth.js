import { useState, useEffect, useCallback } from "react";

export const useSpotifyAuth = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to sync state of access token from background script
  const syncState = useCallback(() => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ command: "getState" }, (response) => {
      if (chrome.runtime.lastError) {
        // Handle potential errors if the background script isn't ready
        setError(chrome.runtime.lastError.message);
        setIsLoading(false);
        return;
      }
      if (response) {
        setAccessToken(response.spotify_access_token || null);
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    syncState();
    // Set up a listener for broadcasts from the background script
    const handleMessage = (message, sender, sendResponse) => {
      if (message.command === "updateState") {
        setAccessToken(message.state.spotify_access_token || null);
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    // Cleanup: remove the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [syncState]);

  // Command functions that just send a message to the background script
  const login = () => {
    chrome.runtime.sendMessage({ command: "login" });
  };

  const logout = () => {
    chrome.runtime.sendMessage({ command: "logout" });
  };

  return {
    accessToken,
    isLoading,
    error,
    login,
    logout,
  };
};