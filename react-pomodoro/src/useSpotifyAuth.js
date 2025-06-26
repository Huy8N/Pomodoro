// hooks
import { useState, useEffect, useCallback } from "react";
// axios for making HTTP requests
import axios from "axios";

// Imports for Chrome extension OAuth flow and constants
import { login as spotifyLogin, logout as spotifyLogout } from "./spotifyAuth";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_API_BASE_URL,
  TOKEN_ENDPOINT,
} from "./constants";

/**
 * A custom React hook to manage Spotify authentication and API calls for a Chrome Extension.
 * It handles login, logout, token storage, token refreshing, and authenticated API requests.
 */
export const useSpotifyAuth = () => {
  // 1. ALL useState hooks are at the top.
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. ALL supporting functions are defined next.

  // Function to perform logout, clear state and storage
  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    await spotifyLogout(); // Clears tokens from chrome.storage
    setAccessToken(null);
    setRefreshToken(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Function to refresh the access token using the refresh token
  const refreshAccessToken = useCallback(
    async (currentRefreshToken) => {
      if (!SPOTIFY_CLIENT_ID) {
        setError("Spotify Client ID is not configured.");
        await handleLogout();
        return null;
      }

      if (!currentRefreshToken) {
        setError("No refresh token available. Please log in again.");
        await handleLogout();
        return null;
      }

      const payload = {
        grant_type: "refresh_token",
        refresh_token: currentRefreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      };

      try {
        const response = await axios.post(
          TOKEN_ENDPOINT,
          new URLSearchParams(payload).toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        const { access_token, refresh_token: newRefreshToken } = response.data;
        const newTokens = { spotify_access_token: access_token };
        if (newRefreshToken) {
          newTokens.spotify_refresh_token = newRefreshToken;
        }

        await chrome.storage.local.set(newTokens);
        setAccessToken(access_token);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }
        return access_token;
      } catch (err) {
        console.error("Could not refresh token:", err);
        setError("Your session has expired. Please log in again.");
        await handleLogout();
        return null;
      }
    },
    [handleLogout]
  );

  // Check for existing tokens in chrome.storage on initial load
  const checkInitialAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { spotify_access_token, spotify_refresh_token } =
        await chrome.storage.local.get([
          "spotify_access_token",
          "spotify_refresh_token",
        ]);

      if (spotify_access_token) {
        setAccessToken(spotify_access_token);
        setRefreshToken(spotify_refresh_token || null);
      } else if (spotify_refresh_token) {
        await refreshAccessToken(spotify_refresh_token);
      }
    } catch (e) {
      console.error("Failed to load token from storage:", e);
      setError("Failed to load token from storage.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshAccessToken]);

  // 3. The useEffect hook that calls the function is right after the definition.
  useEffect(() => {
    checkInitialAuth();
  }, [checkInitialAuth]); // The name here matches the function name above.

  // Function to handle the login flow
  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { access_token, refresh_token } = await spotifyLogin();
      setAccessToken(access_token);
      setRefreshToken(refresh_token);
    } catch (e) {
      console.error("Login failed:", e);
      setError(e.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // The API call function is also defined inside the hook.
  const spotifyAPICall = useCallback(
    async (endpoint, method = "GET", body = null) => {
      let token = accessToken;

      if (!token) {
        setError("You are not authenticated.");
        return null;
      }

      try {
        const response = await axios({
          method,
          url: `${SPOTIFY_API_BASE_URL}${endpoint}`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": body ? "application/json" : undefined,
          },
          data: body,
        });
        return response.data;
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          console.log("Access token expired, attempting to refresh...");
          const newAccessToken = await refreshAccessToken(refreshToken);

          if (newAccessToken) {
            try {
              const retryResponse = await axios({
                method,
                url: `${SPOTIFY_API_BASE_URL}${endpoint}`,
                headers: {
                  Authorization: `Bearer ${newAccessToken}`,
                  "Content-Type": body ? "application/json" : undefined,
                },
                data: body,
              });
              return retryResponse.data;
            } catch (retryError) {
              console.error("API call failed after token refresh:", retryError);
              setError("API call failed after refreshing token.");
              return null;
            }
          } else {
            return null;
          }
        } else {
          console.error("Spotify API call error:", err);
          setError("An error occurred while communicating with Spotify.");
          return null;
        }
      }
    },
    [accessToken, refreshToken, refreshAccessToken, handleLogout]
  );

  // 4. There is ONLY ONE return statement at the very end.
  return {
    accessToken,
    error,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
    spotifyAPICall,
  };
}; // 5. The hook function closes here. Nothing else is outside.
