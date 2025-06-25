// hooks
import { useState, useEffect, useCallback } from "react";
// axios for error handling
import axios from "axios";

import { login as spotifyLogin, logout as spotifyLogout } from "./spotifyAuth";

// function to authenticate
export const useSpotifyAuth = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  //check if token already exist in storage
  const checkIntialAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { spotify_access_token, spotify_refresh_token } =
        await chrome.storage.local.get([
          "spotify_access_token",
          "spotify_refresh_token",
        ]);

      if (spotify_access_token) {
        setAccessToken(spotify_access_token);
        setRefreshToken(spotify_refresh_token);
      }
    } catch (e) {
      setError("Failed to load token from storage.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkIntialAuth();
  }, [checkIntialAuth]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {access_token, refresh_token} = await spotifyLogin();
      setAccessToken(accessToken);
      setRefreshToken(refresh_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await spotifyLogout();
    setRefreshToken(null);
    setAccessToken(null);
    setIsLoading(false);
  };

  return {
    accessToken,
    error,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
  };
};
//   // exchange auth code for token
//   const exchangeCodeForToken = useCallback(
//     async (code) => {
//       if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URL) {
//         setError("Spotify Client ID or Redirect URI is not configured");
//         setIsLoading(false);
//         logout();
//         return;
//       }
//       setIsLoading(true);

//       const codeVerifier = localStorage.getItem("spotify_code_verifier");
//       if (!codeVerifier) {
//         setError("Invalid codeVerifier");
//         localStorage.removeItem("spotify_access_token");
//         localStorage.removeItem("spotify_refresh_token");
//         setIsLoading(false);
//         return;
//       }

//       // paylode to spotify in exchange for token
//       const payload = {
//         client_id: SPOTIFY_CLIENT_ID,
//         grant_type: "authorization_code",
//         code,
//         redirect_uri: SPOTIFY_REDIRECT_URL,
//         code_verifier: codeVerifier,
//       };

//       try {
//         const response = await axios.post(
//           TOKEN_ENDPOINT,
//           new URLSearchParams(payload).toString(),
//           { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );

//         const { access_token, refresh_token: newRefreshToken } = response.data;
//         setAccessToken(access_token);
//         localStorage.setItem("spotify_access_token", access_token);
//         if (newRefreshToken) {
//           setRefreshToken(newRefreshToken);
//           localStorage.setItem("spotify_refresh_token", newRefreshToken);
//         }
//         localStorage.removeItem("spotify_code_verifier");
//         setError(null);
//       } catch (error) {
//         setError("Exchange for token faield");
//         logout();
//         return null;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [logout]
//   );

//   const refreshAccessToken = useCallback(async () => {
//     if (!SPOTIFY_CLIENT_ID) {
//       setError("Spotify Client ID invalid");
//       logout();
//       return null;
//     }
//     const currentRefreshToken = localStorage.getItem("spotify_refresh_token");
//     if (!currentRefreshToken) {
//       setError("Invalid Refresh Token");
//       logout();
//       return null;
//     }
//     setIsLoading(true);
//     // Params to send to spotify for new tokens
//     const payload = {
//       grant_type: "refresh_token",
//       refresh_token: currentRefreshToken,
//       client_id: SPOTIFY_CLIENT_ID,
//     };

//     try {
//       const response = await axios.post(
//         TOKEN_ENDPOINT,
//         new URLSearchParams(payload).toString(),
//         { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//       );

//       const { access_token, refresh_token: newRefreshToken } = response.data;
//       setAccessToken(access_token);
//       localStorage.setItem("spotify_access_token", access_token);
//       if (newRefreshToken) {
//         setRefreshToken(newRefreshToken);
//         localStorage.setItem("spotify_refresh_token", newRefreshToken);
//       }
//       setError(null);
//       return access_token;
//     } catch (error) {
//       setError("Could not refresh token");
//       logout();
//       return null;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [logout]);

//   // If auth and token exchange is successful
//   useEffect(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const code = urlParams.get("code");

//     if (code) {
//       if (SPOTIFY_CLIENT_ID && SPOTIFY_REDIRECT_URL) {
//         // Check if config is loaded
//         exchangeCodeForToken(code);
//       } else {
//         setError("Spotify configuration is missing. Cannot process login.");
//         setIsLoading(false);
//       }
//       window.history.replaceState({}, document.title, window.location.pathname); // Clears query params
//     } else {
//       const storedAccessToken = localStorage.getItem("spotify_access_token");
//       const storedRefreshToken = localStorage.getItem("spotify_refresh_token");
//       if (storedAccessToken) {
//         setAccessToken(storedAccessToken);
//         if (storedRefreshToken) setRefreshToken(storedRefreshToken);
//         setIsLoading(false);
//       } else if (storedRefreshToken) {
//         if (SPOTIFY_CLIENT_ID) {
//           // Check if config is loaded for refresh
//           refreshAccessToken().finally(() => setIsLoading(false));
//         } else {
//           console.error("Spotify config not loaded for token refresh.");
//           setError("Spotify configuration is missing. Cannot refresh token.");
//           setIsLoading(false);
//         }
//       } else {
//         setIsLoading(false);
//       }
//     }
//   }, [exchangeCodeForToken, refreshAccessToken]);

//   const spotifyAPICall = useCallback(
//     async (endpoint, method = "GET", body = null) => {
//       let currentAccessToken = localStorage.getItem("spotify_access_token");

//       if (!currentAccessToken) {
//         if (!SPOTIFY_CLIENT_ID) {
//           setError("Invalid spotify clien ID");
//           return null;
//         }
//         currentAccessToken = await refreshAccessToken();
//         if (!currentAccessToken) {
//           setError("Authentication required");
//           return null;
//         }
//       }
//       try {
//         const response = await axios({
//           method,
//           url: `${SPOTIFY_API_BASE_URL}${endpoint}`,
//           headers: {
//             Authorization: `Bearer ${currentAccessToken}`,
//             "Content-Type": body ? "application/json" : undefined,
//           },
//           data: body,
//         });
//         return response.data;
//       } catch (error) {
//         if (error.response && error.response.status === 403) {
//           console.log(error);
//           setError("Token expired");
//           if (!SPOTIFY_CLIENT_ID) {
//             setError("Spotify Client ID is not configured");
//             logout();
//             return null;
//           }

//           const newAccessToken = await refreshAccessToken();
//           if (newAccessToken) {
//             try {
//               const retryResponse = await axios({
//                 method,
//                 url: `${SPOTIFY_API_BASE_URL}${endpoint}`,
//                 headers: {
//                   Authorization: `Bearer ${newAccessToken}`,
//                   "Content-Type": body ? "application/json" : undefined,
//                 },
//                 data: body,
//               });
//               return retryResponse.data;
//             } catch (retryError) {
//               setError("API call no successful after refresh");
//               return null;
//             }
//           } else {
//             setError("Failed to refresh, try again");
//             logout();
//             return null;
//           }
//         } else {
//           setError("API Error");
//           return null;
//         }
//       }
//     },
//     [refreshAccessToken, logout]
//   );
//   return {
//     accessToken,
//     refreshToken,
//     error,
//     isLoading,
//     login,
//     logout,
//     spotifyAPICall,
//   };
// };
