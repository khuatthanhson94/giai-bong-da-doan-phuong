"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

interface CountdownTimerProps {
  targetDate: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const secs = differenceInSeconds(new Date(targetDate), new Date());
      setRemaining(Math.max(0, secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (remaining === null) return null;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;

  return (
    <div className="mt-3 flex gap-3 text-center text-sm">
      {[
        { label: "Ngày", value: days },
        { label: "Giờ", value: hours },
        { label: "Phút", value: mins },
        { label: "Giây", value: secs },
      ].map((u) => (
        <div key={u.label} className="rounded-lg bg-white/10 px-3 py-2">
          <div className="text-xl font-bold tabular-nums">{pad(u.value)}</div>
          <div className="text-[10px] uppercase text-green-100">{u.label}</div>
        </div>
      ))}
    </div>
  );
}
