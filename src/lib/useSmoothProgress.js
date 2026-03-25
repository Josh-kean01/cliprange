import { useEffect, useRef, useState } from "react";

function clampProgress(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

export default function useSmoothProgress(targetProgress, active) {
  const safeTarget = active ? clampProgress(targetProgress) : 0;
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const lastTargetRef = useRef(safeTarget);
  const lastTargetUpdateAtRef = useRef(Date.now());

  useEffect(() => {
    if (!active) {
      lastTargetRef.current = 0;
      lastTargetUpdateAtRef.current = Date.now();
      return;
    }

    if (safeTarget !== lastTargetRef.current) {
      lastTargetRef.current = safeTarget;
      lastTargetUpdateAtRef.current = Date.now();
    }
  }, [active, safeTarget]);

  useEffect(() => {
    if (!active) {
      setDisplayedProgress(0);
      return;
    }

    setDisplayedProgress((current) => {
      if (!current && safeTarget > 0) {
        return Math.min(safeTarget, 6);
      }

      return Math.min(current, safeTarget);
    });
  }, [active, safeTarget]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setDisplayedProgress((current) => {
        const stalledForMs = Date.now() - lastTargetUpdateAtRef.current;
        const optimisticBuffer =
          stalledForMs < 700
            ? 0
            : stalledForMs < 1800
              ? 3
              : stalledForMs < 3200
                ? 6
                : stalledForMs < 5200
                  ? 9
                  : 12;
        const optimisticTarget =
          safeTarget >= 95 ? safeTarget : clampProgress(Math.min(safeTarget + optimisticBuffer, 96));
        const desiredTarget = Math.max(safeTarget, optimisticTarget);

        if (current >= desiredTarget) {
          return current;
        }

        const delta = desiredTarget - current;
        const step =
          current < safeTarget
            ? delta >= 30
              ? 8
              : delta >= 20
                ? 5
                : delta >= 10
                  ? 3
                  : 1
            : 1;

        return Math.min(desiredTarget, current + step);
      });
    }, 90);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active, safeTarget]);

  return active ? displayedProgress : 0;
}
