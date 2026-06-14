"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { PRIMARY_NAV, TENANT, type NavItem } from "../demo-data";
import { NotificationsBell } from "./NotificationsBell";
import type { NotifItem } from "@/components/dashboard/NotificationPanel";
import styles from "./Shell.module.css";

/** Basispad van de v2-preview, zoals de browser het op de dashboard-host
 *  ziet (de middleware rewrit /v2/* → intern /dashboard/v2/*). */
export const V2_BASE = "/v2";

function isActive(pathname: string, href: string): boolean {
  const full = href === "" ? V2_BASE : `${V2_BASE}${href}`;
  if (pathname === full) return true;
  // /v2 (Overzicht) mag niet matchen op /v2/leads; submatch alleen voor non-index.
  return href !== "" && pathname.startsWith(`${full}/`);
}

interface ShellProps {
  children: ReactNode;
  /** Tenant-naam onder "Frontlix"; default demo. */
  tenant?: string;
  /** Initialen in het avatar rechtsboven; default demo. */
  userInitials?: string;
  /** Pill-nav met (echte) badges; default demo. */
  nav?: NavItem[];
  /** True = geen sessie; toon de "Demo-data"-indicator. */
  isDemo?: boolean;
  /** Bedrijfslogo-URL voor de avatar rechtsboven; null = initialen-fallback. */
  logoUrl?: string | null;
  /** Meldingen-feed voor de bel-dropdown (leeg in demo). */
  notifications?: NotifItem[];
  /** Aantal ongelezen meldingen voor de bel-badge. */
  unreadCount?: number;
}

/** De rebrand-shell: aurora-achtergrond, header met logo, gecentreerde
 *  glas-pill-navigatie, "+ Nieuwe offerte" en avatar → Instellingen. */
export function Shell({
  children,
  tenant = TENANT.tenant,
  userInitials = TENANT.initials,
  nav = PRIMARY_NAV,
  isDemo = false,
  logoUrl = null,
  notifications = [],
  unreadCount = 0,
}: ShellProps) {
  const pathname = usePathname() ?? V2_BASE;
  const settingsActive = isActive(pathname, "/instellingen");

  // De "+ Nieuwe offerte"-knop opent de offerte-wizard. De wizard-modal
  // wordt centraal in de layout gemount en luistert op dit event, zodat de
  // shell niet aan de wizard hoeft te koppelen.
  const openNewOfferte = () => {
    window.dispatchEvent(new CustomEvent("rb:new-offerte"));
  };

  return (
    <div className={`rbRoot ${styles.shell}`}>
      <div className={styles.auroraWrap} aria-hidden="true">
        <div className={`${styles.aurora} ${styles.aurora1}`} />
        <div className={`${styles.aurora} ${styles.aurora2}`} />
        <div className={`${styles.aurora} ${styles.aurora3}`} />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <Link href={V2_BASE} className={styles.brand}>
            <Image
              src="/logo-trans.png"
              alt="Frontlix"
              width={38}
              height={38}
              className={styles.logo}
              priority
            />
            <span>
              <span className={styles.brandName}>Frontlix</span>
              <span className={styles.brandTenant}>{tenant}</span>
            </span>
          </Link>

          <nav className={styles.nav}>
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href === "" ? V2_BASE : `${V2_BASE}${item.href}`}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                >
                  {item.label}
                  {typeof item.badge === "number" ? (
                    <span className={`${styles.navBadge} ${active ? styles.navBadgeActive : ""}`}>
                      {item.badge}
                    </span>
                  ) : typeof item.badge === "string" ? (
                    <span className={styles.navBadgeSoon}>{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className={styles.right}>
            {isDemo ? (
              <a className={styles.demoPill} href="/login" title="Je bekijkt demo-data. Log in om je echte gegevens te zien.">
                Demo-data, log in
              </a>
            ) : null}
            <button type="button" className={styles.newBtn} onClick={openNewOfferte}>
              <Plus size={16} strokeWidth={2.5} />
              Nieuwe offerte
            </button>
            <NotificationsBell items={notifications} unreadCount={unreadCount} />
            <Link
              href={`${V2_BASE}/instellingen`}
              className={`${styles.avatar} ${settingsActive ? styles.avatarActive : ""}`}
              title="Instellingen"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Bedrijfslogo" className={styles.avatarImg} />
              ) : (
                userInitials
              )}
            </Link>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
