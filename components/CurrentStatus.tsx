import React, { useState, useEffect, FC } from 'react';

export const CurrentStatus: FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }).format(time);

    const formattedTime = new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: true
    }).format(time);

    return (
        <div className="text-sm text-slate-400 mb-4 text-center p-2 bg-gray-800 rounded-lg">
           <span>{formattedDate} {formattedTime}</span>
        </div>
    )
}
