import {useState, useEffect, useRef} from 'react'

function Pomodoro() {
    //Change if the timer active or not
    const [isRunning, setIsRunning] = useState(false);
    // Keep track of time left
    const [timeLeft, setTimeLeft] = useState(0.1 * 60)
    //change our interval with rerendering
    const intervalRef = useRef(null);   
    //set the duration
    const [currentDuration, setCurrentDuration] = useState(0.1 * 60);
    // Track active preset for styling
    const [activePreset, setActivePreset] = useState(1); // Default to 10 min (index 1)
    //Show custom time menu
    const [showTimeMenu, setTimeMenu] = useState(false)
    //Popup for when timer is up
    const [showTimerUp, setShowTimerUp] = useState(false);

    //Formatting the timer in MM:SS
    const formatTime = (seconds) => {
        if (seconds >= 3600) {
            const minutes = Math.floor((seconds % 3600) / 60);
            const hours = Math.floor(seconds / 3600);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    //Update the timer
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        setShowTimerUp(true);
                        return 0;
                    }
                    return prev -1;
                });
            }, 1000)
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning, timeLeft]);

    // Start or Pause timer
    const toggleTimer = () => {
        setIsRunning(!isRunning);
    }

    // reset timer
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(currentDuration);
    }

    // double cliking on timer to show menu
    const doubleClickOnTimer = () => {
        //Don't allow double click if timer is running
        if (isRunning) return;
        setTimeMenu(true);
    }

    //Close timer menu
    const closeTimeMenu = () => {
        setTimeMenu(false);
    }

    const closeTimerUpPopup = () => {
        setShowTimerUp(false);
    }

    //Selecting a custom time
    const selectCustomTime = (seconds) => {
        setIsRunning(false);
        setTimeLeft(seconds);
        setCurrentDuration(seconds);
        setActivePreset(-1);
        setTimeMenu(false);
    }

    //A list of preset times
    const presetTime = [
        {name: '5m', seconds: 5 * 60},
        {name: '10m', seconds: 10 * 60},
        {name: '30m', seconds: 30 * 60},
        {name: '45m', seconds: 45 * 60},
    ];

    //list of custom time option
    const customTimeOptions = [
        { label: '25 min', seconds: 25 * 60 },
        { label: '30 min', seconds: 30 * 60 },
        { label: '45 min', seconds: 45 * 60 },
        { label: '50 min', seconds: 50 * 60 },
        { label: '1 hour', seconds: 60 * 60 },
        { label: '1.5 hours', seconds: 90 * 60 },
        { label: '2 hours', seconds: 120 * 60 },
        { label: '3 hours', seconds: 180 * 60 },
        { label: '4 hours', seconds: 240 * 60 },
    ];

    //presetTimer function
    const selectPreset = (seconds, index) => {
        setIsRunning(false);
        setTimeLeft(seconds);
        setCurrentDuration(seconds);
        setActivePreset(index);
        setTimeMenu(false);
    }

    return (
        <> 
        <div className="pomodoro-container">
                <h1>Pomodoro+</h1> 
                <div className={`liveTimer-container ${!isRunning ? 'double-clickable' : ''}`}
                    onDoubleClick={doubleClickOnTimer}
                >
                    <p>{formatTime(timeLeft)}</p>
                </div>

                {showTimerUp && (
                    <div className="timer-up-overlay" onClick={closeTimerUpPopup}>
                        <div className="timer-up-popup" onClick={(e) => e.stopPropagation()}>
                            <h2>⏰ Time's Up!</h2>
                            <p>Your pomodoro has finished.</p>
                            <button className="dismiss-btn" onClick={closeTimerUpPopup}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {showTimeMenu && (
                    <div className="time-menu-overlay" onClick={closeTimeMenu}>
                        <div className="time-menu" onClick={(e) => e.stopPropagation()}>
                            <h3>Select Time</h3>
                            <div className="time-options">
                                {customTimeOptions.map((option, index) => (
                                    <button
                                        key={index}
                                        className="time-option"
                                        onClick={() => selectCustomTime(option.seconds)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <button className="close-menu" onClick={closeTimeMenu}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="controls">
                    <button 
                        onClick={toggleTimer}
                        className={isRunning ? 'pause' : ''}
                    >
                        {/* Icons will be handled by CSS pseudo-elements */}
                    </button>
                    <button onClick={resetTimer}>
                        {/* Reset icon handled by CSS */}
                    </button>
                </div> 
                
                <div className="presets">
                    {presetTime.map((preset, index) => (
                        <button 
                            className={`preset-btn ${activePreset === index ? 'active' : ''}`}
                            key={index}
                            onClick={() => selectPreset(preset.seconds, index)}
                        >
                            {preset.name}
                        </button>
                    ))}
                </div>
        </div>       
        </>
    )
}

export default Pomodoro