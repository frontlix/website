import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/** Pill-knop. primary = blauw gevuld + glow, secondary = zacht blauw,
 *  ghost = transparant met hairline. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
