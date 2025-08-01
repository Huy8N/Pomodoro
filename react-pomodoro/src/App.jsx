import Pomodoro from "./Pomodoro";
import Settings from "./Settings";
import { useCallback, useState, useEffect} from "react";
import "./App.css";

function App() {
  // Set initial view on installed
  const [currentView, setCurrentView] = useState("pomodoro");
  // default settings on installed
  const [settings, setSettings] = useState({
    playSoundOnEnd: false,
    pauseMusicOnPause: false,
    workPlaylistId: null,
    breakPlaylistId: null,
  });

  // Update settings
  useEffect(() => {
    chrome.storage.local.get(
      [
        "playSoundOnEnd",
        "pauseMusicOnPause",
        "workPlaylistId",
        "breakPlaylistId",
      ],
      (stored) => {
        setSettings({
          playSoundOnEnd: stored.playSoundOnEnd ?? false,
          pauseMusicOnPause: stored.pauseMusicOnPause ?? false,
          workPlaylistId: stored.workPlaylistId ?? null,
          breakPlaylistId: stored.breakPlaylistId ?? null,
        });
      }
    );
  }, []);

  //When settings is changed
  const handleSettingChange = useCallback((newSettings) => {
    chrome.storage.local.set(newSettings, () => {
      setSettings(newSettings);
    });
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
