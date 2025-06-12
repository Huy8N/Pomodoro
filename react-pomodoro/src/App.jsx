import Pomodoro from "./Pomodoro";
import Settings from "./Settings";
import { useCallback, useState } from "react";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("pomodoro");
  const [settings, setSettings] = useState(() => {
    const playSoundOnEnd = localStorage.getItem("playSoundOnEnd");
    const pauseMusicOnPause = localStorage.getItem("pauseMusicOnPause");
    const workPlaylistId = localStorage.getItem("workPlaylistId");
    const breakPlaylistId = localStorage.getItem("breakPlaylistId");

    return {
      playSoundOnEnd: playSoundOnEnd ? JSON.parse(playSoundOnEnd) : false,
      pauseMusicOnPause: pauseMusicOnPause
        ? JSON.parse(pauseMusicOnPause)
        : false,
      workPlaylistId: workPlaylistId ? workPlaylistId : null,
      breakPlaylistId: breakPlaylistId ? breakPlaylistId : null,
    };
  });

  //When settings is changed
  const handleSettingChange = useCallback((newSettings) => {
    Object.keys(newSettings).forEach(key => {
      localStorage.setItem(key, JSON.stringify(newSettings[key]));
    });
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
