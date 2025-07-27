import axios from "axios";

const SPOTIFY_CLIENT_ID = "889db36d555d41f1bcc56f22d1e2210c";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

//PKCE Flow helper function from spotify doc
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

export const login = () =>
  new Promise(async (resolve, reject) => {
    try {
      // 1) PKCE bits
      const codeVerifier = generateRandomString(64);
      const hashed = await sha256(codeVerifier);
      const codeChallenge = base64encode(hashed);

      // 2) Get a **stable** redirect and PERSIST it
      //    The optional path ("spotify_cb") makes the value explicit/consistent.
      const redirectUri = chrome.identity.getRedirectURL("spotify_cb");
      await chrome.storage.local.set({
        spotify_code_verifier: codeVerifier,
        spotify_redirect_uri: redirectUri,
      });

      // 3) Build authorize URL with the SAME redirectUri
      const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope:
          "streaming user-modify-playback-state user-read-currently-playing user-read-playback-state user-read-private playlist-read-private playlist-read-collaborative",
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state: generateRandomString(16), // optional but recommended
      });

      const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;

      // 4) Launch OAuth
      const finalUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      // 5) Handle callback
      const cb = new URL(finalUrl);
      const err = cb.searchParams.get("error");
      if (err) throw new Error(`Spotify auth error: ${err}`);

      const code = cb.searchParams.get("code");
      if (!code) throw new Error("No code returned from Spotify");

      // 6) Exchange code (this will read spotify_redirect_uri from storage)
      const tokens = await exchangeCodeForToken(code);
      resolve(tokens);
    } catch (e) {
      reject(e);
    }
  });

const exchangeCodeForToken = async (code) => {
  try {
    const { spotify_code_verifier, spotify_redirect_uri } =
      await chrome.storage.local.get(["spotify_code_verifier", "spotify_redirect_uri"]);

    if (!spotify_code_verifier) {
      throw new Error("Unable to find code verifier");
    }
    if (!spotify_redirect_uri) {
      throw new Error("Unable to find redirect URI used during authorization");
    }

    const payload = {
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: spotify_redirect_uri, // <-- reuse EXACT value
      code_verifier: spotify_code_verifier,
    };

    console.debug("Exchanging code with redirect_uri:", spotify_redirect_uri);

    const response = await axios.post(
      TOKEN_ENDPOINT,
      new URLSearchParams(payload).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in, token_type } = response.data;
    if (!access_token) {
      throw new Error("No access token found in token response");
    }

    // If Spotify doesn't send a new refresh_token, keep the old one if present
    const existing = await chrome.storage.local.get("spotify_refresh_token");

    await chrome.storage.local.set({
      spotify_access_token: access_token,
      spotify_refresh_token: refresh_token || existing.spotify_refresh_token || null,
      spotify_token_type: token_type || "Bearer",
      spotify_expires_in: typeof expires_in === "number" ? expires_in : null,
      spotify_token_created_at: Date.now(),
    });

    // Clean up one-time values
    await chrome.storage.local.remove(["spotify_code_verifier", "spotify_redirect_uri"]);

    return { access_token, refresh_token: refresh_token || existing.spotify_refresh_token || null };
  } catch (error) {
    console.error(
      "Token exchange failed",
      error?.response?.status,
      error?.response?.data || error?.message
    );
    throw error; // <-- not reject()
  }
};

export const logout = async () => {
  chrome.storage.local.remove([
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_code_verifier",
  ]);
};
