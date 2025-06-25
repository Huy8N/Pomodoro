import axios from "axios";

const SPOTIFY_CLIENT_ID = "0655552f30f84e6395f29a0b8d1b529c";
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


export const login = () => {
    return new Promise(async (resolve, reject) => {
        const codeVerifier = generateRandomString(64);
        const hashed = await sha256(codeVerifier);
        const codeChallenge = base64encode(hashed);

        await chrome.stroage.local.set({spotify_code_verifier: codeVerifier});

        const params = {
            client_id: SPOTIFY_CLIENT_ID,
            response_type: "code",
            redirect_uri: chrome.identify.getRedirectURL(),
            scope: "streaming user-modify-playback-state user-read-currently-playing user-read-playback-state user-read-private playlist-read-private playlist-read-collaborative",
            code_challenge_method: "S256",
            code_challenge: codeChallenge,
        };

        const authURL = `https://accounts.spotify.com/authroize?${new URLSearchParams(params).toString}`;

        chrome.identity.launchWebAuthFlow(
            {
                url: authURL,
                interactive: true,
            },
            async (reponseUrl) => {
                if (chrome.runtime.lastError || !reponseUrl) {
                    return reject(new Error("Login window was closed"));
                }

                const url = new URL(reponseUrl);
                const code = url.searchParams.get("code");

                if (!code) {
                    return reject(new Error("Authorization failed"));
                }
                try {
                    const token = await exchangeCodeForToken(code);
                    resolve(tokens);
                } catch(error) {
                    reject(error);
                }
            }
        )

    })
}