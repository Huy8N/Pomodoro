import Pomodoro from "./Pomodoro";
import Settings from "./Settings";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("pomodoro");
  const [settings, setSettings] = useState({
    playSoundOnEnd: false,
    pauseMusicOnPause: false,
    workPlaylistId: null,
    breakPlaylistId: null,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get([
          "playSoundOnEnd",
          "pauseMusicOnPause",
          "workPlaylistId",
          "breakPlaylistId",
        ]);
        setSettings({
          playSoundOnEnd: result.playSoundOnEnd ?? false,
          pauseMusicOnPause: result.pauseMusicOnPause ?? false,
          workPlaylistId: result.workPlaylistId ?? null,
          breakPlaylistId: result.breakPlaylistId ?? null,
        });
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, []);

  //When settings are changed, persist them to chrome.storage
  const handleSettingChange = useCallback(async (newSettings) => {
    try {
      await chrome.storage.local.set(newSettings);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
    setSettings(newSettings);
  }, []);

  //switch to settings view
  const openSettings = () => {
    setCurrentView("settings");
  };

  //Switch back to pomodoro
  const closeSettings = () => {
    setCurrentView("pomodoro");
  };

  return (
    <div className="app-container">
      {currentView === "pomodoro" ? (
        <Pomodoro settings={settings} onOpenSettings={openSettings} />
      ) : (
        <Settings
        settings={settings}
          onSettingChange={handleSettingChange}
          onCloseSettings={closeSettings}
        />
      )}
    </div>
  );
}

export default App;
