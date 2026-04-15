import { useCallback, useEffect, useRef, useState } from "react";

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function getDecimalPlaces(value) {
  const stringValue = String(value);

  if (!stringValue.includes(".")) {
    return 0;
  }

  const decimals = stringValue.split(".")[1];
  return Number(decimals) ? decimals.length : 0;
}

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startCounting,
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}) {
  const ref = useRef(null);
  const timeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const shouldStart = (startCounting ?? startWhen) && isInView;
  const startValue = direction === "down" ? to : from;
  const endValue = direction === "down" ? from : to;
  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback((value) => {
    const options = {
      useGrouping: Boolean(separator),
      minimumFractionDigits: maxDecimals,
      maximumFractionDigits: maxDecimals,
    };
    const formattedNumber = new Intl.NumberFormat("en-US", options).format(value);
    return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
  }, [maxDecimals, separator]);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(startValue);
    }
  }, [formatValue, startValue]);

  useEffect(() => {
    const element = ref.current;

    if (!element || isInView) {
      return undefined;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isInView]);

  useEffect(() => {
    if (!shouldStart) {
      return undefined;
    }

    if (typeof onStart === "function") {
      onStart();
    }

    timeoutRef.current = window.setTimeout(() => {
      const startAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const durationMs = Math.max(duration * 1000, 16);

      const tick = (timestamp) => {
        const elapsed = timestamp - startAt;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeOutCubic(progress);
        const nextValue = startValue + (endValue - startValue) * eased;

        if (ref.current) {
          ref.current.textContent = formatValue(nextValue);
        }

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }

        if (ref.current) {
          ref.current.textContent = formatValue(endValue);
        }

        if (typeof onEnd === "function") {
          onEnd();
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }, delay * 1000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [delay, duration, endValue, formatValue, onEnd, onStart, shouldStart, startValue]);

  return <span className={className} ref={ref} />;
}
