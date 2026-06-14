"use client";

import Link from "next/link";
import { MapPin, Ruler } from "lucide-react";
import { V2_BASE } from "../ui/Shell";
import { StatusPill } from "../ui/StatusPill";
import { Avatar } from "../ui/Avatar";
import type { LeadContext as LeadContextFields } from "./inbox-data";
import styles from "./LeadContext.module.css";

interface LeadContextProps {
  leadId: string;
  naam: string;
  initials: string;
  context: LeadContextFields;
}

/** Rechterkolom (330px): compact lead-dossier naast het gesprek. Toont kop,
 *  status + fase, werk (adres/oppervlakte), offertebedrag en tags, en de twee
 *  acties "Open in Leads" en "Plan in agenda". Alleen ingevulde velden. */
export function LeadContext({ leadId, naam, initials, context }: LeadContextProps) {
  const leadHref = `${V2_BASE}/leads/${leadId}`;
  const heeftWerk = Boolean(context.adres) || context.m2 != null;
  // Kanaal-accent: Telefoon cyaan, anders WhatsApp-groen.
  const isTelefoon = context.kanaal === "Telefoon";

  return (
    <div className={styles.card}>
      <div className="rb-section-label">Lead-dossier</div>

      <div className={styles.head}>
        <span
          className={`${styles.avatarWrap} ${
            isTelefoon ? styles.channelTelefoon : styles.channelWhatsApp
          }`}
        >
          <Avatar name={naam} initials={initials} size={42} radius={14} />
          <span className={styles.channelDot} aria-hidden="true" />
        </span>
        <div className={styles.headBody}>
          <div className={styles.naam}>{naam}</div>
          <div className={styles.plaats}>
            {context.plaats} ·{" "}
            <span
              className={`${styles.kanaal} ${
                isTelefoon ? styles.kanaalTelefoon : styles.kanaalWhatsApp
              }`}
            >
              {context.kanaal}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.scroll}>
        {/* Status */}
        <Section label="Status">
          <div className={styles.pills}>
            <StatusPill kind={context.statusKind}>
              {context.statusLabel}
            </StatusPill>
            {context.faseLabel && (
              <span className={styles.fasePill}>Fase: {context.faseLabel}</span>
            )}
          </div>
        </Section>

        {/* Werk */}
        {heeftWerk && (
          <Section label="Werk">
            {context.adres && (
              <Row icon={<MapPin size={14} strokeWidth={2.25} />}>
                {context.adres}
              </Row>
            )}
            {context.m2 != null && (
              <Row icon={<Ruler size={14} strokeWidth={2.25} />}>
                {context.m2} m&sup2;
              </Row>
            )}
          </Section>
        )}

        {/* Offerte */}
        {context.bedrag && (
          <Section label="Offerte">
            <div className={styles.offerteBox}>
              <div className={styles.offerteBedrag}>{context.bedrag}</div>
            </div>
          </Section>
        )}

        {/* Tags */}
        {context.tags.length > 0 && (
          <Section label="Tags">
            <div className={styles.tags}>
              {context.tags.map((tag) => {
                const kleur = tag.kleur ?? "var(--rb-muted)";
                return (
                  <span
                    key={tag.id}
                    className={styles.tag}
                    style={{
                      color: kleur,
                      borderColor: kleur,
                      background: `color-mix(in srgb, ${kleur} 12%, transparent)`,
                    }}
                  >
                    {tag.naam}
                  </span>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      <div className={styles.actions}>
        <Link href={leadHref} className={styles.primary}>
          Open in Leads
        </Link>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowValue}>{children}</span>
    </div>
  );
}
