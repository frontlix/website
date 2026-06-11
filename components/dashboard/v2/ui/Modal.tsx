"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Breedte in px (default 560). De offerte-wizard gebruikt 1150. */
  width?: number;
  /** Toegankelijke titel voor de dialog. */
  label?: string;
}

/** Gecentreerde modal over een gedimde, geblurde pagina. Esc sluit;
 *  klik buiten de modal sluit. Port van PModal uit de handoff. */
export function Modal({ open, onClose, children, width = 560, label }: ModalProps) {
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
        className={styles.modal}
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
