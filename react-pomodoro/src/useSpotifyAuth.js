import {useState, useEffect, useCallback} from 'react';
import axios from 'axios';

//get env varibles
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

//endpoints
const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
//What to have access to
const SCOPES = 'streaming user-modify-playback-state user-read-currently-playing';

//PKCE helper function from spotify doc
//Generate a key
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}
//Encrypt that key with hash
const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}
//Derive a seperate key from that hash that can be used to verify user
const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const useSpotifyAuth = () => {
    const [accessToken, setAccessToken] = useState(localStorage.getItem('spotify_access_token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('spotify_refresh_token'));
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

        const authURL = `${AUTHORIZE_ENDPOINT}?${new URLSearchParams(params).toString()}`;
        window.location.href = authURL.toString();
    };

    const logout = useCallback(() => {
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_code_verifier');
        setError(null);
        setIsLoading(false);
    }, []);


    const 
}


