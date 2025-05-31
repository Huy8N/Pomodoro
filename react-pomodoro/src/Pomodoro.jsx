import {useState, useEffect, useRef} from 'react'



function Pomodoro() {
    //Change if the timer active or not
    const [isRunning, setIsRunning] = useState(false);
    // Keep track of time left
    const [timeLeft, setTimeLeft] = useState(10 * 60)
    //change our interval with rerendering
    const intervalRef = useRef(null);   
    //set the duration
    const [currentDuration, setCurrentDuration] = useState(10 * 60);

    //Formatting the timer in MM:SS
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    //Update the timer
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
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
        setCurrentDuration(currentDuration)
    }

    //A list of preset times
    const presetTime = [
        {name: '5 min', seconds: 5 * 60},
        {name: '10 min', seconds: 10 * 60},
        {name: '30 min', seconds: 30 * 60},
        {name: '45 min', seconds: 45 * 60},
    ];

    //presetTimer function
    const selectPreset = (seconds) => {
        setIsRunning(false);
        setTimeLeft(seconds);
        setCurrentDuration(seconds);
    }

    return (
        <> 
        <div className="pomodoro-container">
                <h1>Pomodoro+</h1> 
                <div className="liveTimer-container">
                    <p>{formatTime(timeLeft)}</p>
                </div>  

                <div className="controls">
                    <button onClick={toggleTimer}>
                        {isRunning ? 'Pause' : 'Start'}
                    </button>
                    <button onClick={resetTimer}>
                        Reset
                    </button>
                </div> 
                <div className="presets">
                    {presetTime.map((preset, index) => (
                        <button className='button-btn'
                        key={index}
                        onClick={() => selectPreset(preset.seconds)}
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