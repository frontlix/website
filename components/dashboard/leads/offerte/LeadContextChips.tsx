'use client'

/**
 * LeadContextChips, readonly chips die de lead-context tonen
 * waarop de automatische offerte-regels gebaseerd zijn.
 *
 * Layout: rij chips (wrap, gap 8px). Eerste chip is een label-chip
 * met sparkle-icoon ("OP BASIS VAN LEAD-DATA"). Rechts in de rij
 * staat "Pas aan in Info-tab" als tekst-link.
 *
 * Chips worden alleen gerenderd als hun bron-veld een waarde heeft.
 */

import { Sparkles, Pencil } from 'lucide-react'
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadContextChips.module.css'

export type LeadContextChipsProps = {
  lead: Lead
  /** Callback voor "Pas aan in Info-tab", fase 1: prop is voldoende. */
  onEditInfoClick?: () => void
}

/** Map van sub-dienst-keys naar human-readable Nederlandse labels. */
const SUB_DIENSTEN_LABELS: Record<string, string> = {
  invegen: 'Voegen invegen',
  preventieve_onkruid: 'Preventief onkruid',
  beschermlaag: 'Nieuwe beschermlaag',
  onderhoud: 'Onderhoud',
}

/** Map van voegzand-type-keys naar Nederlandse labels. */
const VOEGZAND_TYPE_LABELS: Record<string, string> = {
  normaal: 'normaal',
  onkruidwerend: 'onkruidwerend',
  beide: 'beide',
}

/** Eén data-chip met UPPERCASE label en waarde. */
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className={styles.chip}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
    </span>
  )
}

export function LeadContextChips({ lead, onEditInfoClick }: LeadContextChipsProps) {
  // --- Bouw data-chips conditioneel op ---
  const chips: Array<{ key: string; label: string; value: string }> = []

  // Oppervlakte
  if (lead.m2 != null) {
    chips.push({ key: 'm2', label: 'OPPERVLAKTE', value: `${lead.m2} m²` })
  }

  // Diensten
  if (Array.isArray(lead.sub_diensten) && lead.sub_diensten.length > 0) {
    const labels = lead.sub_diensten.map((d) => SUB_DIENSTEN_LABELS[d] ?? d)
    chips.push({ key: 'diensten', label: 'DIENSTEN', value: labels.join(' + ') })
  }

  // Voegzand, type + optionele kleur ("antraciet")
  if (lead.voegzand_type) {
    const typeLabel =
      VOEGZAND_TYPE_LABELS[lead.voegzand_type] ?? lead.voegzand_type
    const value = lead.zand_kleur
      ? `${typeLabel} · ${lead.zand_kleur}`
      : typeLabel
    chips.push({ key: 'voegzand', label: 'VOEGZAND', value })
  }

  // Korstmos (string ja/nee)
  if (lead.korstmos) {
    chips.push({ key: 'korstmos', label: 'KORSTMOS', value: lead.korstmos })
  }

  // Planten, "afschermen" als planten_afschermen truthy, anders "staan" als planten gevuld
  if (lead.planten_afschermen) {
    chips.push({ key: 'planten', label: 'PLANTEN', value: 'afschermen' })
  } else if (lead.planten) {
    chips.push({ key: 'planten', label: 'PLANTEN', value: 'staan' })
  }

  return (
    <div className={styles.container}>
      <div className={styles.chipsRow}>
        {/* Label-chip, uppercase, gradient-tint, sparkle-icoon. */}
        <span className={styles.labelChip}>
          <Sparkles size={11} aria-hidden="true" />
          OP BASIS VAN LEAD-DATA
        </span>

        {chips.map((c) => (
          <Chip key={c.key} label={c.label} value={c.value} />
        ))}

        {/* Edit-link wordt naar het einde van de rij geduwd via margin-left:auto. */}
        <button
          type="button"
          className={styles.editLink}
          onClick={() => onEditInfoClick?.()}
        >
          <Pencil size={12} aria-hidden="true" />
          Pas aan in Info-tab
        </button>
      </div>
    </div>
  )
}
