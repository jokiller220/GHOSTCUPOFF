import { useEffect, useState } from 'react';

interface CountdownProps {
  targetDate: string;
}

interface TimeLeft {
  jours: number;
  heures: number;
  minutes: number;
  secondes: number;
}

function computeTimeLeft(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    jours: Math.floor(diff / 86400000),
    heures: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    secondes: Math.floor((diff % 60000) / 1000),
  };
}

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(computeTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(computeTimeLeft(targetDate)), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: 'JOURS', value: timeLeft.jours },
    { label: 'HEURES', value: timeLeft.heures },
    { label: 'MINUTES', value: timeLeft.minutes },
    { label: 'SECONDES', value: timeLeft.secondes },
  ];

  return (
    <div className="flex gap-6 md:gap-10">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="font-barlow font-black text-4xl md:text-5xl text-white leading-none tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
          <span className="font-barlow text-ghost-gray text-[10px] uppercase tracking-widest mt-1">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
