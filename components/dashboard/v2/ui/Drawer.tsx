"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Drawer.module.css";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Breedte in px (default 470). */
  width?: number;
  label?: string;
}

/** Rechter zij-drawer. Esc + klik-buiten sluiten. Port van PDrawer. */
export function Drawer({ open, onClose, children, width = 470, label }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Sluiten">
          <X size={15} strokeWidth={2.5} />
        </button>
        {children}
      </div>
    </div>
  );
}
