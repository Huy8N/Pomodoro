import { useState, useEffect, useCallback } from "react";
import axios from "axios";

//get env varibles
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

//endpoints
const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
//What to have access to
const SCOPES =
  "streaming user-modify-playback-state user-read-currently-playing";

//PKCE helper function from spotify doc
//Generate a key
const generateRandomString = (length) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};
//Encrypt that key with hash
const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
};
//Derive a seperate key from that hash that can be used to verify user
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const useSpotifyAuth = () => {
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("spotify_access_token")
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("spotify_refresh_token")
  );
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(null);

  const login = async () => {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
      setError("Spotify Client ID or Redirect URI is not configured");
      setIsLoading(false);
      return;
    }
    setError(null);

    //generate the crypto code
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    localStorage.setItem("spotify_code_verifier", codeVerifier);

    const params = {
      client_id: SPOTIFY_CLIENT_ID,
      reponse_type: "code",
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: "S256",
      code_challeng: codeChallenge,
    };

    const authURL = `${AUTHORIZE_ENDPOINT}?${new URLSearchParams(
      params
    ).toString()}`;
    window.location.href = authURL.toString();
  };

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    localStorage.removeItem("spotify_code_verifier");
    window.history.replaceState({}, document.title, "/");
    setError(null);
    setIsLoading(false);
  }, []);

  const exchangeCodeForToken = useCallback(
    async (code) => {
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
        setError("Spotify Client ID or Redirect URI is not configured");
        setIsLoading(false);
        logout();
        return;
      }
      setIsLoading(true);

      const codeVerifier = localStorage.getItem("spotify_code_verifier");
      if (!codeVerifier) {
        setError("Authorization failed");
        localStorage.removeItem("spotify_acceess_token");
        localStorage.removeItem("spotify_refresh_token");
        setIsLoading(false);
        return;
      }

      const payload = {
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: codeVerifier,
      };

      try {
        const reponse = await axios.post(
          TOKEN_ENDPOINT,
          new URLSearchParams(payload).toString(),
          { header: { "Content-Type": "application/x-www.form-urlencoded" } }
        );

        const { access_token, refresh_token: newRefreshtoken } = response.data;
        setAccessToken(access_token);
        localStorage.setItem("spotify_access_token", access_token);
        if (newRefreshtoken) {
          setRefreshToken(newRefreshtoken);
          localStorage.setItem("spotify_refresh_token", newRefreshtoken);
        }
        setError(null);
        return access_token;
      } catch (error) {
        console.log("No spotify refresh token");
        logout();
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [logout]);

    const refreshAccessToken = useCallback(async () => {
        if (!SPOTIFY_CLIENT_ID) {
            setError("Spotify Client ID invalid");
            logout();
            return null;
        }
        const currentRefreshToken = localStorage.getItem('spotify_refresh_token');
        if (!currentRefreshToken) {
            setError("Please login again");
            logout();
            return null;
        }
        setIsLoading(true);
        const payload = {
            grant_type: "refresh_token",
            refresh_token: currentRefreshToken,
            client_id: SPOTIFY_CLIENT_ID,
        };

        try {
            const reponse = await axios.post(
                TOKEN_ENDPOINT,
                new URLSearchParams(payload).toString(),
                    { header: { "Content-Type": "application/x-www.form-urlencoded" } }
            );

            const {access_token, refresh_token: newRefreshtoken} = reponse.data;
            setAccessToken(access_token);
            localStorage.setItem('spotify_access_token'. access_token);
            if (newRefreshtoken) {
                setRefreshToken(newRefreshtoken);
                localStorage.setItem('spotify_refresh_token', newRefreshtoken);
            }
            setError(null);
            return access_token;
        } catch (error) {
            setError("Could not refresh token");
            logout();
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
      if (SPOTIFY_CLIENT_ID && SPOTIFY_REDIRECT_URI) { // Check if config is loaded
        exchangeCodeForToken(code);
      } else {
        console.error("Spotify config not loaded on redirect.");
        setError("Spotify configuration is missing. Cannot process login.");
        setIsLoading(false);
      }
    } else {
      const storedAccessToken = localStorage.getItem('spotify_access_token');
      const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
         setIsLoading(false);
      } else if (storedRefreshToken) {
        if (SPOTIFY_CLIENT_ID) { // Check if config is loaded for refresh
            refreshAccessToken().finally(() => setIsLoading(false));
        } else {
            console.error("Spotify config not loaded for token refresh.");
            setError("Spotify configuration is missing. Cannot refresh token.");
            setIsLoading(false);
        }
      } else {
        setIsLoading(false); 
      }
    }
  }, [exchangeCodeForToken, refreshAccessToken]);;
  





};
