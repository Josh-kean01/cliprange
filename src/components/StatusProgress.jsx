import { useEffect, useRef } from "react";

import CountUp from "./CountUp";

export default function StatusProgress({ message, progress = 0, active = false }) {
  const previousProgressRef = useRef(progress);

  useEffect(() => {
    previousProgressRef.current = progress;
  }, [progress]);

  const previousProgress = active ? previousProgressRef.current : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-300">{message}</p>
        {active ? (
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            <CountUp
              key={progress}
              className="count-up-text"
              direction={progress < previousProgress ? "down" : "up"}
              duration={0.45}
              from={previousProgress}
              separator=","
              startCounting={active}
              to={progress}
            />
            %
          </span>
        ) : null}
      </div>
      {active ? (
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(130,90,255,0.95),rgba(68,211,255,0.92))] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
