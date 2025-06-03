import {useState, useEffect} from 'react'

//function to retrie spotify info
const useSpotifyAuth = () => {
    // Access token
    const [accessToken, setAccessToken] = useState(null);
    // If user is authenticated
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const REDIRECT_URL = import.meta.env.VITE_SPOTIFY_REDIRECT_URL;
    const SCOPES = 'user-modify-playback-state user-read-playback-state streaming';

    const getAuthURL = () => {
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            reponse_type: 'token',
            redirect_url: REDIRECT_URL,
            scope: SCOPES,
        })
        return `https://accounts.spotify.com/authorize?${params}`;
    }

}