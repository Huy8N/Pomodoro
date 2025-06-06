import Pomodoro from "./Pomodoro";
import Settings from "./Settings";
import { useCallback, useState } from "react";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("pomodoro");
  const [settings, setSettings] = useState(() => {
    const playSoundOnEnd = localStorage.getItem("playSoundOnEnd");
    const pauseMusicOnPause = localStorage.getItem("pauseMusicOnPause");
    return {
      playSoundOnEnd: playSoundOnEnd ? JSON.parse(playSoundOnEnd) : false,
      pauseMusicOnPause: pauseMusicOnPause
        ? JSON.parse(pauseMusicOnPause)
        : false,
    };
  });

  //When settings is changed
  const handleSettingChange = useCallback(
    (newSettings) => setSettings(newSettings), []
  );

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
          onSettingChange={handleSettingChange}
          onCloseSettings={closeSettings}
        />
      )}
    </div>
  );
}

export default App;
