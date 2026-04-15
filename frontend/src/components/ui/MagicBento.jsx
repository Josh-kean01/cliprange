import { useMemo, useRef, useState } from "react";

import { cn } from "../../utils/cn";

function createStars(count) {
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    return {
      id: `star-${seed}`,
      x: ((seed * 17) % 100) + "%",
      y: ((seed * 29) % 100) + "%",
      size: 1.5 + ((seed * 7) % 10) / 10,
      delay: `${(seed % 9) * 0.45}s`,
      duration: `${4.5 + (seed % 5) * 0.7}s`,
      opacity: 0.18 + (seed % 5) * 0.08,
    };
  });
}

export default function MagicBento({
  as: Component = "section",
  className,
  contentClassName,
  children,
  textAutoHide = false,
  enableStars = false,
  enableSpotlight = false,
  enableBorderGlow = false,
  enableTilt = false,
  enableMagnetism = false,
  clickEffect = false,
  spotlightRadius = 360,
  particleCount = 8,
  glowColor = "132, 0, 255",
  disableAnimations = false,
  style,
  ...props
}) {
  const rootRef = useRef(null);
  const [pointer, setPointer] = useState({ x: 50, y: 50, active: false });
  const [ripples, setRipples] = useState([]);
  const pointerEffectsEnabled =
    !disableAnimations && (enableSpotlight || enableTilt || enableMagnetism);
  const showRipples = clickEffect && !disableAnimations;
  const showStars = enableStars && !disableAnimations;
  const hasMotion = pointerEffectsEnabled || showRipples || showStars;
  const stars = useMemo(
    () => (showStars ? createStars(Math.max(particleCount, 8)) : []),
    [particleCount, showStars],
  );

  const handlePointerMove = (event) => {
    if (!pointerEffectsEnabled) {
      return;
    }

    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y, active: true });
  };

  const handlePointerLeave = () => {
    if (!pointerEffectsEnabled) {
      return;
    }

    setPointer((current) => ({ ...current, active: false }));
  };

  const handleClick = (event) => {
    if (!showRipples) {
      return;
    }

    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const ripple = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setRipples((current) => [...current, ripple]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((item) => item.id !== ripple.id));
    }, 750);
  };

  const rotateX = pointer.active ? ((pointer.y - 50) / 50) * -4 : 0;
  const rotateY = pointer.active ? ((pointer.x - 50) / 50) * 4 : 0;
  const translateX = enableMagnetism && pointer.active ? ((pointer.x - 50) / 50) * 8 : 0;
  const translateY = enableMagnetism && pointer.active ? ((pointer.y - 50) / 50) * 8 : 0;

  return (
    <Component
      ref={rootRef}
      className={cn(
        "magic-bento surface-panel--strong group relative isolate overflow-hidden backdrop-blur-xl transition-[transform,border-color,background-color] duration-200",
        className,
      )}
      data-disable-animations={disableAnimations ? "true" : "false"}
      data-has-motion={hasMotion ? "true" : "false"}
      data-text-auto-hide={textAutoHide ? "true" : "false"}
      onClick={showRipples ? handleClick : undefined}
      onMouseLeave={pointerEffectsEnabled ? handlePointerLeave : undefined}
      onMouseMove={pointerEffectsEnabled ? handlePointerMove : undefined}
      style={{
        ...style,
        "--mx": `${pointer.x}%`,
        "--my": `${pointer.y}%`,
        "--glow-color": glowColor,
        "--spotlight-radius": `${spotlightRadius}px`,
        transform: enableTilt ? `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : undefined,
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-px"
        style={{
          borderRadius: "calc(var(--radius-panel) - 1px)",
          background: "var(--gradient-shell)",
        }}
      />

      {enableBorderGlow ? <div className="magic-bento__border pointer-events-none absolute inset-0 rounded-panel" /> : null}
      {enableSpotlight ? <div className="magic-bento__spotlight pointer-events-none absolute inset-0 rounded-panel" /> : null}

      {showStars ? (
        <div className="magic-bento__stars pointer-events-none absolute inset-0 overflow-hidden rounded-panel">
          {stars.map((star) => (
            <span
              key={star.id}
              className="magic-bento__star"
              style={{
                left: star.x,
                top: star.y,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
                animationDuration: star.duration,
                opacity: star.opacity,
              }}
            />
          ))}
        </div>
      ) : null}

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="magic-bento__ripple pointer-events-none absolute"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}

      <div
        className={cn("relative z-10", contentClassName)}
        style={
          enableMagnetism && pointerEffectsEnabled
            ? { transform: `translate(${translateX}px, ${translateY}px)` }
            : undefined
        }
      >
        {children}
      </div>
    </Component>
  );
}
