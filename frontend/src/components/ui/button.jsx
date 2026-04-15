import { forwardRef } from "react";

import { cn } from "../../utils/cn";

const variantClasses = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,var(--accent-start),var(--accent-end))] text-white shadow-button hover:brightness-110",
  secondary:
    "border-[color:var(--border-subtle)] bg-[var(--surface-overlay)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-white/10 hover:text-white",
  ghost:
    "border-transparent bg-transparent text-slate-300 hover:border-[color:var(--border-subtle)] hover:bg-[var(--surface-overlay)] hover:text-white",
  danger:
    "border-[color:var(--danger-border)] bg-[var(--danger-surface)] text-[color:var(--danger-ink)] hover:border-red-300/35 hover:bg-red-500/16",
};

const sizeClasses = {
  default: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
  wide: "h-11 w-full px-4 text-sm",
};

function buttonVariants({ variant = "secondary", size = "default", className } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-card border font-medium tracking-[-0.02em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-55",
    variantClasses[variant] ?? variantClasses.secondary,
    sizeClasses[size] ?? sizeClasses.default,
    className,
  );
}

const Button = forwardRef(function Button(
  { className, href, size, type = "button", variant, ...props },
  ref,
) {
  const classes = buttonVariants({ variant, size, className });

  if (href) {
    return <a className={classes} href={href} {...props} />;
  }

  return <button className={classes} ref={ref} type={type} {...props} />;
});

export { Button, buttonVariants };
