"use client";

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
  "Diensten & prijzen": Wrench,
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
};

/** Verticaal zijmenu met de instellingen-secties, actief item blauw. */
export function SettingsNav({ active, onSelect }: SettingsNavProps) {
  return (
    <Card pad="none" className={styles.nav}>
      {SETTINGS_MENU.map((m) => {
        const Icon = SECTION_ICON[m];
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSelect(m)}
            className={`${styles.item} ${m === active ? styles.active : ""}`}
          >
            <Icon size={15} strokeWidth={2} />
            <span>{m}</span>
          </button>
        );
      })}
    </Card>
  );
}
