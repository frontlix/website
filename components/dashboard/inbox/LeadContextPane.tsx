import Link from 'next/link'
import {
  Eye,
  StickyNote,
  Edit3,
  Send,
  Archive,
  Plus,
} from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { InboxLeadContext } from '@/lib/dashboard/inbox-queries'
import {
  formatEuro,
  formatRelative,
  gesprekFaseLabel,
} from '@/lib/dashboard/format'
import type { Lead, GesprekFase } from '@/lib/dashboard/database.types'
import styles from './LeadContextPane.module.css'

/**
 * Rechterkolom van Inbox, compacte lead-info bij het actieve gesprek.
 * Layout volgt design:
 *   ┌ avatar + naam + lead_id · binnen
 *   ├ "Open volledig dossier" CTA
 *   ├ Status, pill(status) + pill(fase)
 *   ├ Werk, adres, oppervlakte, diensten, foto's
 *   ├ Offerte, gradient-block met bedrag (alleen als prijs > 0)
 *   ├ Snelle acties, 4 buttons
 *   └ Tags, chip-lijst + "+ Tag"
 */
export function LeadContextPane({ lead }: { lead: InboxLeadContext }) {
  const adres = [
    lead.straat ? `${lead.straat} ${lead.huisnummer}`.trim() : null,
    `${lead.postcode} ${lead.plaats ?? ''}`.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  const subDiensten = lead.sub_diensten ?? []
  const dienstenLabel = subDiensten.length > 0
    ? subDiensten.map(humanizeDienst).join(' + ')
    : humanize(lead.hoofdcategorie)

  return (
    <div className={styles.pane}>
      <div className={styles.head}>
        <div className={styles.headRow}>
          <Avatar name={lead.naam} size="lg" />
          <div className={styles.headBody}>
            <div className={styles.naam}>{lead.naam}</div>
            <div className={styles.meta}>
              {shortLeadId(lead.lead_id)} · {formatRelative(lead.aangemaakt)}
            </div>
          </div>
        </div>
        <Link href={`/leads/${lead.lead_id}`} className={styles.openBtn}>
          <Eye size={13} /> Open volledig dossier
        </Link>
      </div>

      <div className={styles.scroll}>
        {/* Status */}
        <Section label="Status">
          <div className={styles.pills}>
            <Pill tone={statusTone(lead.dashboard_status)} dot>
              {statusLabel(lead.dashboard_status, lead.gesprek_fase)}
            </Pill>
            {lead.gesprek_fase && (
              <Pill tone="gray">Fase: {gesprekFaseLabel(lead.gesprek_fase)}</Pill>
            )}
          </div>
        </Section>

        {/* Werk */}
        <Section label="Werk">
          <CompactRow l="Adres" v={adres || 'Adres onbekend'} />
          {lead.m2 != null && <CompactRow l="Oppervlakte" v={`${lead.m2} m²`} />}
          <CompactRow l="Diensten" v={dienstenLabel} />
          {lead.fotosCount > 0 && (
            <CompactRow l="Foto's" v={`${lead.fotosCount} ${lead.fotosCount === 1 ? 'stuk' : 'stuks'}`} />
          )}
        </Section>

        {/* Offerte */}
        {lead.totaal_prijs && lead.totaal_prijs > 0 && (
          <Section label="Offerte">
            <div className={styles.offerteBox}>
              <div className={styles.offerteBedrag}>{formatEuro(lead.totaal_prijs)}</div>
              <div className={styles.offerteSub}>
                {lead.offerte_verstuurd && lead.offerte_verstuurd_op
                  ? `Verstuurd ${formatRelative(lead.offerte_verstuurd_op)}`
                  : 'Nog niet verstuurd'}
              </div>
            </div>
          </Section>
        )}

        {/* Snelle acties */}
        <Section label="Snelle acties">
          <div className={styles.actionsList}>
            <Link
              href={`/leads/${lead.lead_id}?tab=notities`}
              className={styles.actionRow}
            >
              <StickyNote size={14} />
              <span>Interne notitie toevoegen</span>
            </Link>
            <Link
              href={`/leads/${lead.lead_id}?tab=info`}
              className={styles.actionRow}
            >
              <Edit3 size={14} />
              <span>Lead-gegevens aanpassen</span>
            </Link>
            <Link
              href={`/leads/${lead.lead_id}?tab=offerte`}
              className={styles.actionRow}
            >
              <Send size={14} />
              <span>Offerte opnieuw versturen</span>
            </Link>
            <Link
              href={`/leads/${lead.lead_id}?tab=notities`}
              className={`${styles.actionRow} ${styles.actionRowDanger}`}
            >
              <Archive size={14} />
              <span>Archiveren als afgerond</span>
            </Link>
          </div>
        </Section>

        {/* Tags */}
        <Section label="Tags">
          <div className={styles.tags}>
            <span className={styles.tagPlaceholder}>Geen tags</span>
            <Link href={`/leads/${lead.lead_id}?tab=info`} className={styles.tagAddBtn}>
              <Plus size={11} /> Tag
            </Link>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}

function CompactRow({ l, v }: { l: string; v: string }) {
  return (
    <div className={styles.compactRow}>
      <span className={styles.compactLabel}>{l}</span>
      <span className={styles.compactValue}>{v}</span>
    </div>
  )
}

function statusTone(status: Lead['dashboard_status']): 'blue' | 'green' | 'gray' | 'amber' | 'red' {
  switch (status) {
    case 'afgehandeld':     return 'green'
    case 'opgevolgd':       return 'blue'
    case 'no_show':         return 'amber'
    case 'geen_interesse':  return 'red'
    case 'archief':         return 'gray'
    default:                return 'blue'
  }
}

function statusLabel(
  status: Lead['dashboard_status'],
  fase: GesprekFase | null,
): string {
  if (status === 'afgehandeld') return 'Afgerond'
  if (status === 'geen_interesse') return 'Afgewezen'
  if (status === 'no_show') return 'No-show'
  if (status === 'archief') return 'Gearchiveerd'
  // 'open' / null → gebruik fase voor wat menselijker label
  if (fase === 'afspraak_bevestigd') return 'Goedgekeurd'
  if (fase === 'onderhandelen') return 'In review'
  if (fase === 'offerte_besproken') return 'Offerte verstuurd'
  return 'In gesprek'
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeDienst(key: string): string {
  const map: Record<string, string> = {
    invegen:             'Voegen invegen',
    preventieve_onkruid: 'Preventieve onkruidbehandeling',
    beschermlaag:        'Nieuwe beschermlaag',
    onderhoud:           'Onderhoudsplan',
    reinigen:            'Reiniging',
  }
  return map[key] ?? humanize(key)
}

/**
 * "1778672102687-17710" → "L-2687" (compact ID zoals in design).
 * Pakt de laatste 4 cijfers van het timestamp-deel.
 */
function shortLeadId(id: string): string {
  const ts = id.split('-')[0] ?? id
  return `L-${ts.slice(-4)}`
}
