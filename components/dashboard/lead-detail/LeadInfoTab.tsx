import type { Lead } from '@/lib/dashboard/database.types'
import { SUB_OPTIES, DIENST_LABELS } from '@/lib/dashboard/manual-offerte-types'
import { EditableField, type EditorConfig, type SelectOption } from './EditableField'
import { LeadToelichtingBlock } from './LeadToelichtingBlock'
import styles from './LeadInfoTab.module.css'

// ── Constants voor de dropdowns ──────────────────────────────────────
const HOOFDCATEGORIE_OPTIES: SelectOption[] = [
  { value: 'oprit_terras_terrein', label: 'Oprit / Terras / Terrein' },
  { value: 'onkruidbeheersing', label: 'Onkruidbeheersing' },
]

const BRON_OPTIES: SelectOption[] = [
  { value: 'website', label: 'Website-formulier' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'handmatig', label: 'Handmatig' },
]

const JA_NEE_OPTIES: SelectOption[] = [
  { value: 'ja', label: 'Ja' },
  { value: 'nee', label: 'Nee' },
]

const ZAND_KLEUR_OPTIES: SelectOption[] = [
  { value: 'naturel', label: 'Naturel' },
  { value: 'antraciet', label: 'Antraciet' },
  { value: 'gemengd', label: 'Gemengd' },
]

const SUB_DIENSTEN_OPTIES: SelectOption[] = SUB_OPTIES.map((o) => ({
  value: o.k,
  label: DIENST_LABELS[o.k],
}))

type RowDef = {
  label: string
  /** read-mode display string */
  display: string
  /** sub-tekst onder de waarde (alleen in read-mode) */
  sub?: string | null
  /** initiële waarde voor edit-mode (string / array / adres-object) */
  initial: string | string[] | { straat: string; huisnummer: string; postcode: string; plaats: string } | null
  editor: EditorConfig
}

/**
 * Info-tab: "Lead-gegevens" paneel met twee-koloms layout (KLANT | WERK).
 * Per rij label links + waarde rechts. Hover op een rij → pencil-icoon
 * verschijnt; klik → die rij wordt inline bewerkbaar.
 */
export function LeadInfoTab({ lead }: { lead: Lead }) {
  const klantRows: RowDef[] = [
    {
      label: 'Naam',
      display: lead.naam,
      initial: lead.naam ?? '',
      editor: { kind: 'text', field: 'naam' },
    },
    {
      label: 'Bedrijf',
      display: lead.bedrijfsnaam ?? '—',
      initial: lead.bedrijfsnaam ?? '',
      editor: { kind: 'text', field: 'bedrijfsnaam', placeholder: 'Bedrijfsnaam (optioneel)' },
    },
    {
      label: 'Telefoon',
      display: lead.telefoon,
      initial: lead.telefoon ?? '',
      editor: { kind: 'text', field: 'telefoon', inputType: 'tel' },
    },
    {
      label: 'E-mail',
      display: lead.email,
      initial: lead.email ?? '',
      editor: { kind: 'text', field: 'email', inputType: 'email' },
    },
    {
      label: 'Adres',
      display: formatAdres(lead),
      initial: {
        straat: lead.straat ?? '',
        huisnummer: lead.huisnummer ?? '',
        postcode: lead.postcode ?? '',
        plaats: lead.plaats ?? '',
      },
      editor: { kind: 'adres' },
    },
    {
      label: 'Afstand',
      display: lead.afstand_km !== null ? `${lead.afstand_km} km` : '—',
      sub: lead.afstand_km !== null && lead.afstand_km <= 25 ? 'Binnen gratis radius' : null,
      initial: lead.afstand_km !== null ? String(lead.afstand_km) : '',
      editor: { kind: 'number', field: 'afstand_km', suffix: 'km' },
    },
    {
      label: 'Bron',
      display: humanizeBron(lead.bron),
      initial: lead.bron ?? '',
      editor: { kind: 'select', field: 'bron', options: BRON_OPTIES, allowEmpty: true },
    },
  ]

  const subDiensten = lead.sub_diensten ?? []
  const werkRows: RowDef[] = [
    {
      label: 'Hoofdcategorie',
      display: humanize(lead.hoofdcategorie),
      initial: lead.hoofdcategorie ?? '',
      editor: { kind: 'select', field: 'hoofdcategorie', options: HOOFDCATEGORIE_OPTIES },
    },
    {
      label: 'Diensten',
      display: subDiensten.length > 0 ? subDiensten.map(humanize).join(' + ') : '—',
      initial: subDiensten,
      editor: { kind: 'multiselect', field: 'sub_diensten', options: SUB_DIENSTEN_OPTIES },
    },
    {
      label: 'Oppervlakte',
      display: lead.m2 !== null ? `${lead.m2} m²` : '—',
      initial: lead.m2 !== null ? String(lead.m2) : '',
      editor: { kind: 'number', field: 'm2', suffix: 'm²' },
    },
    {
      label: 'Voegzand',
      display: lead.zand_kleur ? humanize(lead.zand_kleur) : '—',
      initial: lead.zand_kleur ?? '',
      editor: { kind: 'select', field: 'zand_kleur', options: ZAND_KLEUR_OPTIES, allowEmpty: true },
    },
    {
      label: 'Groene aanslag',
      display: lead.groene_aanslag ? humanize(lead.groene_aanslag) : '—',
      initial: lead.groene_aanslag ?? '',
      editor: { kind: 'select', field: 'groene_aanslag', options: JA_NEE_OPTIES, allowEmpty: true },
    },
    {
      label: 'Planten',
      display: lead.planten ? humanize(lead.planten) : '—',
      initial: lead.planten ?? '',
      editor: { kind: 'text', field: 'planten', placeholder: 'bv. ja, nee, beetje' },
    },
    {
      label: 'Planten afschermen',
      display: lead.planten_afschermen ? humanize(lead.planten_afschermen) : '—',
      initial: lead.planten_afschermen ?? '',
      editor: { kind: 'text', field: 'planten_afschermen' },
    },
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>Lead-gegevens</h2>
        <span className={styles.hint}>Hover een rij om te bewerken</span>
      </div>

      <div className={styles.grid}>
        <Column heading="Klant" rows={klantRows} leadId={lead.lead_id} />
        <Column heading="Werk" rows={werkRows} leadId={lead.lead_id} />
      </div>

      <LeadToelichtingBlock leadId={lead.lead_id} toelichting={lead.toelichting} />
    </div>
  )
}

function Column({ heading, rows, leadId }: { heading: string; rows: RowDef[]; leadId: string }) {
  return (
    <div className={styles.column}>
      <div className={styles.columnHeading}>{heading}</div>
      <dl className={styles.list}>
        {rows.map((row) => (
          <EditableField
            key={row.label}
            leadId={leadId}
            label={row.label}
            display={row.display}
            sub={row.sub ?? null}
            initial={row.initial}
            editor={row.editor}
          />
        ))}
      </dl>
    </div>
  )
}

function formatAdres(lead: Lead): string {
  const street = lead.straat ? `${lead.straat} ${lead.huisnummer}`.trim() : null
  const city = `${lead.postcode} ${lead.plaats ?? ''}`.trim()
  return [street, city].filter(Boolean).join(', ')
}

function humanize(key: string | null): string {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeBron(bron: string | null): string {
  if (!bron) return 'Onbekend'
  const map: Record<string, string> = {
    website: 'Website-formulier',
    whatsapp: 'WhatsApp',
    handmatig: 'Handmatig',
  }
  return map[bron] ?? humanize(bron)
}
