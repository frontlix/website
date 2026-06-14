import type { ReactNode } from "react";
import type { StatusKind } from "../demo-data";
import styles from "./StatusPill.module.css";

interface StatusPillProps {
  /** Stuurt de kleur (hot=blauw, new=mint, plan=cyaan, sent=grijs). */
  kind?: StatusKind;
  children: ReactNode;
}

/** Status-pill, kleuren conform ccStatusPill uit de design-handoff. */
export function StatusPill({ kind = "sent", children }: StatusPillProps) {
  return <span className={`${styles.pill} ${styles[kind]}`}>{children}</span>;
}
