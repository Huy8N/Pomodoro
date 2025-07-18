export const PRESET_TIMES = [
    { name: "5m", seconds: 5 * 60 },
    { name: "10m", seconds: 10 * 60 },
    { name: "15m", seconds: 15 * 60 },
    { name: "20m", seconds: 20 * 60 },
]

export const CUSTOM_TIME_OPTIONS = [
  { label: "25 min", seconds: 25 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "35 min", seconds: 35 * 60 },
  { label: "40 min", seconds: 40 * 60 },
  { label: "45 min", seconds: 45 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "2 hours", seconds: 120 * 60 },
  { label: "3 hours", seconds: 180 * 60 },
  { label: "4 hours", seconds: 240 * 60 },
];

export const DEFAULT_TIMER_DURATION = 0.1 * 60;

export const SPOTIFY_CLIENT_ID = "889db36d555d41f1bcc56f22d1e2210c"
export const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"
export const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token" 