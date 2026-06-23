"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./Shell.module.css";

const STORAGE_KEY = "frontlix-dashboard-theme";

/**
 * Licht/donker-toggle voor het v2-desktopdashboard. Schakelt `.dark` op
 * <html>; het no-flash-script in de v2-layout zet die class al vóór de eerste
 * paint, deze knop schakelt live. Bewaart de keuze in localStorage onder
 * dezelfde sleutel als de mobiele toggle, zodat de voorkeur meereist tussen
 * telefoon en desktop.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // Lees de begintoestand uit de DOM (door het no-flash-script gezet), zodat
  // het icoon meteen klopt zonder flits.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* localStorage kan geblokkeerd zijn; thema schakelt dan alsnog live. */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={styles.themeBtn}
      aria-label={dark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
      title={dark ? "Lichte modus" : "Donkere modus"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
