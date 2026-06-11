import { clsx } from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-base font-bold leading-none tracking-wide transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:text-lg",
        variant === "primary" &&
          "bg-black text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)] hover:bg-neutral-800",
        variant === "secondary" &&
          "border border-panel-border bg-white/90 text-foreground shadow-sm backdrop-blur hover:border-neutral-400 hover:bg-white",
        variant === "ghost" && "text-muted hover:bg-white/70 hover:text-foreground",
        variant === "danger" && "bg-black text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)] hover:bg-neutral-800",
        "disabled:opacity-50 disabled:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={clsx(
        "min-h-11 w-full rounded-full border border-panel-border bg-white/95 px-4 text-base font-medium outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 sm:text-lg",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={clsx(
        "min-h-11 w-full rounded-full border border-panel-border bg-white/95 px-4 text-base font-medium outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 sm:text-lg",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-base font-medium leading-none text-foreground sm:text-lg">
      {label}
      {children}
    </label>
  );
}

export function Panel({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={clsx(
        "rounded-[24px] border border-neutral-200 bg-white/92 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.035)] backdrop-blur sm:rounded-[28px] sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: "neutral" | "success" | "danger" | "accent" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold leading-none tracking-wide sm:text-base",
        tone === "neutral" && "bg-neutral-100 text-neutral-700",
        tone === "success" && "bg-black text-white",
        tone === "danger" && "bg-neutral-200 text-neutral-800",
        tone === "accent" && "bg-black text-white",
        className,
      )}
      {...props}
    />
  );
}
