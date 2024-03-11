import React, { useEffect, useState } from 'react';
import "./progress.scss"

interface ProgressPops {
    progress: number
}

const CircularProgressBar = ({ progress }: ProgressPops) => {
    const [offset, setOffset] = useState<number>(1);
    const radius = 8; // half of the diameter
    const circumference = 2 * Math.PI * radius;
    useEffect(() => {
        setOffset(circumference - progress * circumference)
    }, [progress, circumference])

    return (
        <svg width="18" height="18" className='-rotate-45' xmlns="http://www.w3.org/2000/svg">
            <circle
                className='progress-circle'
                cx="9"
                cy="9"
                r={radius}
                fill="none"
                strokeWidth="2"
            />
            <circle
                cx="9"
                cy="9"
                stroke="#575bc7"
                r={radius}
                fill="none"
                strokeWidth="2"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
            />
        </svg>
    );
};

export default CircularProgressBar;