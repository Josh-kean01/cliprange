import { cn } from "../../lib/utils";

const variantClasses = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,rgba(130,90,255,0.95),rgba(68,211,255,0.92))] text-white shadow-[0_14px_34px_rgba(94,86,255,0.38)] hover:brightness-110",
  secondary:
    "border-white/12 bg-white/6 text-slate-100 hover:border-white/20 hover:bg-white/10",
  ghost: "border-white/8 bg-white/0 text-slate-300 hover:border-white/14 hover:bg-white/6 hover:text-white",
  danger: "border-red-400/25 bg-red-500/12 text-red-100 hover:border-red-300/35 hover:bg-red-500/16",
};

const sizeClasses = {
  default: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
  wide: "h-11 w-full px-4 text-sm",
};

function buttonVariants({ variant = "secondary", size = "default", className } = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl border font-medium tracking-[-0.02em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f] disabled:cursor-not-allowed disabled:opacity-55",
    variantClasses[variant] ?? variantClasses.secondary,
    sizeClasses[size] ?? sizeClasses.default,
    className,
  );
}

function Button({ className, href, size, type = "button", variant, ...props }) {
  const classes = buttonVariants({ variant, size, className });

  if (href) {
    return <a className={classes} href={href} {...props} />;
  }

  return <button className={classes} type={type} {...props} />;
}

export { Button, buttonVariants };
