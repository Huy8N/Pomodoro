import {useState, useEffect, useRef} from 'react'



function Pomodoro() {
    //Change if the timer active or not
    const [isRunning, setIsRunning] = useState(false);
    // Keep track of time left
    const [timeLeft, setTimeLeft] = useState(10 * 60)
    //change our interval with rerendering
    const intervalRef = useRef(NULL);

    //Formatting the timer in MM:SS
    const fortmatTime = (seconds) => {
        const mintues = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mintues.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    }, [isRunning, TimeRanges]);

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    }

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(10 * 60);
    }

    return (
        <> 
        <div className="pomodoro-container">
                <h1>Pomodoro+</h1> 
                <div className="liveTimer-container">
                    <p>{fortmatTime(timeLeft)}</p>
                </div>   
        </div>       
        </>
    )
}

export default Pomodoro