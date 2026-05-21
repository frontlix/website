import { notFound } from 'next/navigation'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import { formatEuro, formatDateNL } from '@/lib/dashboard/format'
import type { TenantSettings } from '@/lib/dashboard/database.types'
import styles from './page.module.css'

/**
 * Offerte-preview pagina — toont de huidige offerte-state in een lay-out
 * die zo dicht mogelijk de echte verzonden PDF benadert (zie
 * lead-automation/templates/quote.html voor het PDF-template dat de
 * bot-service gebruikt). Daarmee krijgt de owner een betrouwbare voor-
 * vertoning van wat de klant zou ontvangen na "Versturen via WhatsApp".
 *
 * Print-vriendelijk: Cmd/Ctrl+P → PDF.
 */
export const dynamic = 'force-dynamic'

export default async function OffertePreviewPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  await requireApprovedUser()
  const { lead_id } = await params

  const [detail, supabase] = await Promise.all([
    getLeadDetail(lead_id),
    getDashboardSupabase(),
  ])
  if (!detail) notFound()

  // Tenant-info: bedrijfsnaam, adres, contact — gevonden in tenant_settings
  // (single-row per tenant). Service-role is hier niet nodig: de user is
  // gauth'd en mag z'n eigen tenant lezen.
  const { data: tenantRaw } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  const tenant = (tenantRaw ?? null) as TenantSettings | null

  const { lead, prijsregels, offertes } = detail
  // "Huidige" = concept als die bestaat, anders laatst verstuurd; conform
  // wat de Offerte-tab ook toont.
  const concept = offertes.find((o) => o.is_concept)
  const laatsteVerzonden = offertes.find((o) => !o.is_concept)
  const huidige = concept ?? laatsteVerzonden ?? offertes[0]
  const versie = huidige?.versie ?? 1
  const versieDatum = huidige?.aangemaakt_op ?? new Date().toISOString()

  // Totalen berekenen uit de regels — zelfde logica als de Offerte-tab.
  const kortingPct = Number(lead.korting_percentage ?? 0)
  const regelTotalen = prijsregels.map((r) => Number(r.totaal ?? 0))
  const totalen = berekenTotalen(regelTotalen, kortingPct)

  // Geldigheidsdatum: versie-aanmaak + tenant.offerte_geldigheid_dagen.
  const geldigheidDagen = tenant?.offerte_geldigheid_dagen ?? 30
  const geldigTot = new Date(versieDatum)
  geldigTot.setDate(geldigTot.getDate() + geldigheidDagen)

  // ─── Tenant-blok (rechts in header) ─────────────────────────────
  const bedrijfsnaam = tenant?.bedrijfsnaam ?? 'Bedrijf'
  const bedrijfsAdresLines: string[] = []
  if (tenant?.adres) {
    const huisnr = tenant.base_huisnummer ? ` ${tenant.base_huisnummer}` : ''
    bedrijfsAdresLines.push(`${tenant.adres}${huisnr}`)
  }
  if (tenant?.postcode || tenant?.plaats) {
    bedrijfsAdresLines.push(
      [tenant.postcode, tenant.plaats].filter(Boolean).join(' '),
    )
  }
  const bedrijfsTel = tenant?.eigenaar_spoed_telefoon ?? tenant?.eigenaar_whatsapp ?? null
  const bedrijfsEmail = tenant?.eigenaar_email ?? null

  // Klant-adres samenstellen
  const klantAdresLine1 = [lead.straat, lead.huisnummer].filter(Boolean).join(' ')
  const klantAdresLine2 = [lead.postcode, lead.plaats].filter(Boolean).join(' ')

  // Sub-diensten label voor de eyebrow
  const diensten = Array.isArray(lead.sub_diensten) ? lead.sub_diensten : []
  const dienstenLabel =
    diensten.length > 0
      ? diensten
          .map((d: string) =>
            d === 'invegen'
              ? 'Voegen invegen'
              : d === 'preventieve_onkruid'
                ? 'Preventief onkruid'
                : d === 'beschermlaag'
                  ? 'Beschermlaag'
                  : d === 'onderhoud'
                    ? 'Onderhoud'
                    : d,
          )
          .join(' · ')
      : 'Straatwerk'

  const referentie = `L-${lead_id.slice(-4)} / v${versie}`

  return (
    <main className={styles.sheet}>
      {/* Top-gradient bar — Frontlix signature accent */}
      <div className={styles.topBar} aria-hidden="true" />

      <div className={styles.page}>
        {/* ─── HEADER ──────────────────────────────────────────────── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.brandName}>{bedrijfsnaam}</div>
            <div className={styles.powered}>
              Offerte gegenereerd door{' '}
              <span className={styles.brandFront}>Front</span>
              <span className={styles.brandLix}>lix</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.companyBlock}>
              <div className={styles.companyName}>{bedrijfsnaam}</div>
              {bedrijfsAdresLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              {bedrijfsTel ? <div>{bedrijfsTel}</div> : null}
              {bedrijfsEmail ? <div>{bedrijfsEmail}</div> : null}
            </div>
          </div>
        </header>

        {/* ─── TITEL + META ────────────────────────────────────────── */}
        <section className={styles.titleRow}>
          <div className={styles.titleCell}>
            <div className={styles.titleEyebrow}>
              Offerte &middot; {dienstenLabel}
            </div>
            <h1 className={styles.titleMain}>
              Voorstel voor {lead.naam ?? 'klant'}
            </h1>
          </div>
          <div className={styles.metaCell}>
            <div className={styles.metaLine}>
              Referentie<strong>{referentie}</strong>
            </div>
            <div className={styles.metaLine}>
              Datum<strong>{formatDateNL(versieDatum)}</strong>
            </div>
            <div className={styles.metaLine}>
              Geldig tot<strong>{formatDateNL(geldigTot.toISOString())}</strong>
            </div>
          </div>
        </section>

        {/* ─── KLANT ───────────────────────────────────────────────── */}
        <section className={styles.klantCard}>
          <div className={styles.klantEyebrow}>Klantgegevens</div>
          <div className={styles.klantField}>
            <span className={styles.klantKey}>Naam</span>
            <span className={styles.klantValue}>{lead.naam ?? '—'}</span>
          </div>
          {klantAdresLine1 ? (
            <div className={styles.klantField}>
              <span className={styles.klantKey}>Adres</span>
              <span className={styles.klantValue}>
                {klantAdresLine1}
                {klantAdresLine2 ? `, ${klantAdresLine2}` : ''}
              </span>
            </div>
          ) : null}
          {lead.email ? (
            <div className={styles.klantField}>
              <span className={styles.klantKey}>E-mail</span>
              <span className={styles.klantValue}>{lead.email}</span>
            </div>
          ) : null}
          {lead.telefoon ? (
            <div className={styles.klantField}>
              <span className={styles.klantKey}>Telefoon</span>
              <span className={styles.klantValue}>{lead.telefoon}</span>
            </div>
          ) : null}
        </section>

        {/* ─── PRIJSOVERZICHT ──────────────────────────────────────── */}
        <h2 className={styles.section}>Prijsoverzicht</h2>
        <table className={styles.priceTable}>
          <thead>
            <tr>
              <th>Omschrijving</th>
              <th className={styles.num}>Aantal</th>
              <th className={styles.num}>Eenheid</th>
              <th className={styles.num}>Per eenheid</th>
              <th className={styles.num}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {prijsregels.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  Geen prijsregels in deze offerte.
                </td>
              </tr>
            ) : (
              prijsregels.map((r) => (
                <tr key={r.id}>
                  <td className={styles.label}>{r.omschrijving}</td>
                  <td className={styles.num}>{r.aantal ?? '—'}</td>
                  <td className={styles.num}>{r.eenheid ?? '—'}</td>
                  <td className={styles.num}>
                    {r.stukprijs ? formatEuro(Number(r.stukprijs)) : '—'}
                  </td>
                  <td className={styles.amount}>{formatEuro(Number(r.totaal))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── TOTALEN ─────────────────────────────────────────────── */}
        <div className={styles.totals}>
          <div className={`${styles.totalsRow} ${styles.subtotal}`}>
            <span className={styles.l}>Subtotaal excl. BTW</span>
            <span className={styles.r}>{formatEuro(totalen.subtotaalExcl)}</span>
          </div>
          {kortingPct > 0 && totalen.kortingBedrag > 0 ? (
            <div className={`${styles.totalsRow} ${styles.korting}`}>
              <span className={styles.l}>
                Korting ({kortingPct}%)
                {lead.korting_omschrijving ? ` · ${lead.korting_omschrijving}` : ''}
              </span>
              <span className={styles.r}>− {formatEuro(totalen.kortingBedrag)}</span>
            </div>
          ) : null}
          <div className={`${styles.totalsRow} ${styles.btw}`}>
            <span className={styles.l}>BTW {totalen.btwPercentage}%</span>
            <span className={styles.r}>{formatEuro(totalen.btw)}</span>
          </div>
          <div className={`${styles.totalsRow} ${styles.grand}`}>
            <span className={styles.l}>Totaal incl. BTW</span>
            <span className={styles.r}>{formatEuro(totalen.totaalIncl)}</span>
          </div>
        </div>

        {/* ─── VOORWAARDEN ─────────────────────────────────────────── */}
        <div className={styles.conditions}>
          <strong>Voorwaarden &amp; geldigheid.</strong>{' '}
          Deze offerte is geldig tot {formatDateNL(geldigTot.toISOString())} en
          betreft een vrijblijvende prijsindicatie op basis van de door u
          verstrekte informatie. Definitieve afstemming volgt tijdens de
          afspraak ter plaatse. Genoemde bedragen zijn exclusief eventuele
          onvoorziene werkzaamheden en gelden onder voorbehoud van
          toegankelijkheid van het werkadres.
        </div>

        <p className={styles.printHint}>
          Tip: gebruik Cmd/Ctrl + P om deze pagina af te drukken of als PDF op
          te slaan.
        </p>
      </div>
    </main>
  )
}
