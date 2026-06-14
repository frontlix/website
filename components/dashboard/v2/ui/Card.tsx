import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 24px (default) of 16px hoekradius. */
  radius?: "lg" | "md";
  /** Interne padding (default 22px); geef "none" voor zelf-padden. */
  pad?: "lg" | "md" | "none";
  children: ReactNode;
}

/** Witte kaart met hairline-schaduw (ccCard). */
export function Card({
  radius = "lg",
  pad = "lg",
  className = "",
  children,
  ...rest
}: CardProps) {
  const padClass = pad === "none" ? "" : pad === "md" ? styles.padMd : styles.padLg;
  return (
    <div
      className={`${styles.card} ${radius === "md" ? styles.radMd : styles.radLg} ${padClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
