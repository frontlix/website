"use client";

import type { CSSProperties } from "react";
import {
  Building2,
  Wrench,
  Euro,
  Tag,
  CalendarClock,
  Radio,
  CalendarDays,
  MessageSquare,
  Bell,
  FileText,
  Users,
  BellRing,
  CreditCard,
  Lock,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import type { SettingsSection } from "./instellingen-data";
import { SETTINGS_MENU } from "./instellingen-data";
import styles from "./SettingsNav.module.css";

interface SettingsNavProps {
  active: SettingsSection;
  onSelect: (section: SettingsSection) => void;
}

/** Lucide-icoon per sectie, in dezelfde geest als de bestaande (app)-nav. */
const SECTION_ICON: Record<SettingsSection, LucideIcon> = {
  Bedrijfsprofiel: Building2,
  "Diensten": Wrench,
  Prijzen: Euro,
  Tags: Tag,
  Beschikbaarheid: CalendarClock,
  Kanalen: Radio,
  Integraties: CalendarDays,
  Openingsbericht: MessageSquare,
  Reminders: Bell,
  Offertes: FileText,
  Team: Users,
  Meldingen: BellRing,
  Abonnement: CreditCard,
  Account: Lock,
  Privacy: Shield,
};

/**
 * Kleur-accent per sectie (icoon-tint + actief-accent). Uitsluitend --rb-*-
 * tokens: een betekenisvolle tint per gebied zodat de nav "vol en levendig"
 * oogt zonder de layout te wijzigen (bedrijf=blauw, diensten=groen,
 * prijzen=amber, tags=paars, agenda=cyaan, enz.).
 */
const SECTION_ACCENT: Record<SettingsSection, string> = {
  Bedrijfsprofiel: "var(--rb-data-1)", // blauw
  "Diensten": "var(--rb-data-2)", // groen
  Prijzen: "var(--rb-data-3)", // amber
  Tags: "var(--rb-data-4)", // paars
  Beschikbaarheid: "var(--rb-data-7)", // teal
  Kanalen: "var(--rb-data-5)", // cyaan
  Integraties: "var(--rb-data-8)", // indigo
  Openingsbericht: "var(--rb-data-6)", // koraal
  Reminders: "var(--rb-data-3)", // amber
  Offertes: "var(--rb-data-1)", // blauw
  Team: "var(--rb-data-4)", // paars
  Meldingen: "var(--rb-data-6)", // koraal
  Abonnement: "var(--rb-data-2)", // groen
  Account: "var(--rb-data-8)", // indigo
  Privacy: "var(--rb-data-1)", // blauw
};

/** Verticaal zijmenu met de instellingen-secties, actief item in sectie-tint. */
export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  return (
    <Card pad="none" className={styles.nav}>
      {SETTINGS_MENU.map((m) => {
        const Icon = SECTION_ICON[m];
        const isActive = m === active;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSelect(m)}
            className={`${styles.item} ${isActive ? styles.active : ""}`}
            style={{ "--rb-accent": SECTION_ACCENT[m] } as CSSProperties}
          >
            <span className={styles.iconWrap}>
              <Icon size={15} strokeWidth={2} />
            </span>
            <span>{m}</span>
          </button>
        );
      })}
    </Card>
  );
}
