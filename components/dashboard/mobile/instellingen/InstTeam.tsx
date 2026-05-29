'use client'

// v1 — UI met lokale state; team-actions nog niet gekoppeld.
// Zie plan § Context: "wiring to real settings server-actions is deferred".

import { Plus } from 'lucide-react'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import { INST_TEAM } from './instellingen-mock'
import styles from './InstTeam.module.css'

/** Initialen uit volledige naam: eerste 2 woorden, eerste letter elk. */
function initials(naam: string): string {
  return naam
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
}

/** Team-detailscherm. Plain content — drilldown layer levert header. */
export function InstTeam() {
  return (
    <div className={styles.container}>
      <InstGroupCard>
        {INST_TEAM.map((m, i) => (
          <div
            key={m.email}
            className={styles.row}
            /* Tint als CSS custom property; bg/fg via color-mix in CSS */
            style={{ '--tint': m.tint } as React.CSSProperties}
            data-last={i === INST_TEAM.length - 1 || undefined}
          >
            {/* Avatar-cirkel: bg color-mix tint 13%, kleur tint */}
            <div className={styles.avatar} aria-hidden="true">
              {initials(m.naam)}
            </div>

            {/* Naam + e-mail */}
            <div className={styles.info}>
              <div className={styles.naam}>{m.naam}</div>
              <div className={styles.email}>{m.email}</div>
            </div>

            {/* Rol-pill: tinted via --tint */}
            <span className={styles.rolePill}>{m.role}</span>
          </div>
        ))}
      </InstGroupCard>

      {/* Uitnodigingsknop */}
      <div className={styles.btnWrap}>
        <InstGhostBtn>
          <Plus size={15} aria-hidden="true" />
          Lid uitnodigen
        </InstGhostBtn>
      </div>
    </div>
  )
}
