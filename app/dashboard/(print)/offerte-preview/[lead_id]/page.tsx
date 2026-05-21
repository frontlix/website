import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import { formatEuro } from '@/lib/dashboard/format'
import styles from './page.module.css'

/**
 * Offerte-preview pagina — 1-op-1 visueel gelijk aan de echte
 * Schoon-Straatje PDF die naar klanten wordt verstuurd (zie
 * /schoon-straatje product/schoon-straatje-assistent/src/templates/
 * offerte-pdf-template.ts).
 *
 * Brand-kleuren:
 *  - Header crème:   #FAFAF0
 *  - Primary navy:   #002D63
 *  - Accent geel:    #F5C518
 *
 * Print-vriendelijk: Cmd/Ctrl+P → PDF.
 */
export const dynamic = 'force-dynamic'

// Bedrijfsgegevens — voor nu hardcoded voor Schoon Straatje (de enige
// live tenant). Toekomstig kan dit uit tenant_settings/db worden gelezen.
const BEDRIJF = {
  naam: 'Schoon Straatje',
  adres: 'Achterweg 23',
  postcode: '4521 CB',
  plaats: 'Biervliet',
  kvk: '62612018',
  btw: 'NL001708304B31',
  email: 'welkom@schoon-straatje.nl',
}

function formatDateNL(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCategorie(cat: string | null | undefined): string {
  if (!cat) return ''
  const map: Record<string, string> = {
    oprit_terras_terrein: 'Oprit / Terras / Terreinreiniging',
    onkruidbeheersing_zakelijk: 'Onkruidbeheersing zakelijk',
  }
  return map[cat] || cat
}

function formatSubDienst(d: string): string {
  const map: Record<string, string> = {
    invegen: 'Invegen',
    preventieve_onkruid: 'Preventieve onkruidbeheersing',
    preventieve_onkruidbeheersing: 'Preventieve onkruidbeheersing',
    beschermlaag: 'Nieuwe beschermlaag',
    onderhoud: 'Onderhoud',
    plan_4_weken: 'Plan per 4 weken',
    plan_8_weken: 'Plan per 8 weken',
    plan_12_weken: 'Plan per 12 weken',
    plan_16_weken: 'Plan per 16 weken',
  }
  return map[d] || d
}

export default async function OffertePreviewPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  await requireApprovedUser()
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)
  if (!detail) notFound()

  const { lead, prijsregels, offertes } = detail

  // Concept-aware: pak concept als die bestaat, anders laatst verzonden.
  const concept = offertes.find((o) => o.is_concept)
  const laatsteVerzonden = offertes.find((o) => !o.is_concept)
  const huidige = concept ?? laatsteVerzonden ?? offertes[0]

  // Datum: vandaag (de PDF van de bot regenereert met "vandaag" als datum
  // zodat de geldigheid mee-schuift bij elke regen).
  const today = new Date()
  const geldigheidDagen = lead.offerte_geldigheid_dagen ?? 30
  const geldigTot = new Date(today)
  geldigTot.setDate(geldigTot.getDate() + geldigheidDagen)

  const offertenummer = lead_id

  // Klant-data
  const klantNaam = lead.bedrijfsnaam || lead.naam || 'Klant'
  const klantContact = lead.bedrijfsnaam ? `T.a.v. ${lead.naam ?? ''}`.trim() : ''
  const klantAdres = [lead.straat, lead.huisnummer].filter(Boolean).join(' ').trim()
  const klantPlaats = [lead.postcode, lead.plaats].filter(Boolean).join(' ').trim()
  const klantTelefoon = lead.telefoon_offerte || lead.telefoon

  // Dienst / sub-diensten labels
  const dienstLabel = formatCategorie(lead.hoofdcategorie)
  const subDiensten = Array.isArray(lead.sub_diensten) ? lead.sub_diensten : []
  const subDienstenLabel = subDiensten.map(formatSubDienst).filter(Boolean).join(', ')

  // Totalen
  const kortingPct = Number(lead.korting_percentage ?? 0)
  const regelTotalen = prijsregels.map((r) => Number(r.totaal ?? 0))
  const totalen = berekenTotalen(regelTotalen, kortingPct)

  return (
    <main className={styles.page}>
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.title}>OFFERTE</p>
          <p className={styles.subtitle}>Nr. {offertenummer}</p>
        </div>
        <div className={styles.headerCenter}>
          <Image
            src="/assets/schoon-straatje/top-30-vakbedrijven.png"
            alt="Top 30 vakbedrijven"
            width={120}
            height={120}
            className={styles.headerBadge}
            priority
          />
        </div>
        <div className={styles.headerRight}>
          <Image
            src="/assets/schoon-straatje/logo.png"
            alt="Schoon Straatje"
            width={220}
            height={120}
            className={styles.headerLogo}
            priority
          />
        </div>
      </div>

      {/* Gouden accent-lijn onder header */}
      <div className={styles.accent} aria-hidden="true" />

      {/* ─── CONTENT ────────────────────────────────────────────── */}
      <div className={styles.content}>
        {/* META: offerte info + klant */}
        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Offerte gegevens</div>
            <div className={styles.metaRow}>
              <strong>Datum:</strong> {formatDateNL(today)}
            </div>
            <div className={styles.metaRow}>
              <strong>Geldig tot:</strong> {formatDateNL(geldigTot)}
            </div>
            {dienstLabel ? (
              <div className={styles.metaRow}>
                <strong>Dienst:</strong> {dienstLabel}
              </div>
            ) : null}
            {subDienstenLabel ? (
              <div className={styles.metaRow}>
                <strong>Subdiensten:</strong> {subDienstenLabel}
              </div>
            ) : null}
            {lead.m2 ? (
              <div className={styles.metaRow}>
                <strong>Oppervlakte:</strong> {lead.m2} m²
              </div>
            ) : null}
          </div>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Voor</div>
            <div className={styles.metaRow}>
              <span className={styles.klantName}>{klantNaam}</span>
              {klantContact ? (
                <>
                  {klantContact}
                  <br />
                </>
              ) : null}
              {klantAdres ? (
                <>
                  {klantAdres}
                  <br />
                </>
              ) : null}
              {klantPlaats ? (
                <>
                  {klantPlaats}
                  <br />
                </>
              ) : null}
              {lead.email ? (
                <>
                  {lead.email}
                  <br />
                </>
              ) : null}
              {klantTelefoon ? klantTelefoon : null}
            </div>
          </div>
        </div>

        {/* SPECIFICATIE */}
        <div className={styles.sectionTitle}>Specificatie</div>
        <table className={styles.regels}>
          <thead>
            <tr>
              <th className={styles.cellDesc}>Omschrijving</th>
              <th className={styles.cellNum}>Aantal</th>
              <th className={styles.cellNum}>Stukprijs</th>
              <th className={styles.cellNum}>Totaal</th>
            </tr>
          </thead>
          <tbody>
            {prijsregels.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  Geen specificatie beschikbaar
                </td>
              </tr>
            ) : (
              prijsregels.map((r) => {
                const aantal = r.aantal !== null ? Number(r.aantal) : null
                const aantalText =
                  aantal !== null
                    ? `${Number.isInteger(aantal) ? aantal : aantal.toFixed(2).replace('.', ',')}${r.eenheid ? ` ${r.eenheid}` : ''}`
                    : ''
                return (
                  <tr key={r.id}>
                    <td className={styles.cellDesc}>{r.omschrijving}</td>
                    <td className={styles.cellNum}>{aantalText}</td>
                    <td className={styles.cellNum}>{formatEuro(Number(r.stukprijs))}</td>
                    <td className={`${styles.cellNum} ${styles.cellTotal}`}>
                      {formatEuro(Number(r.totaal))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* TOTALS — rechts uitgelijnd ~60% breed */}
        <div className={styles.totalsWrap}>
          <table className={styles.totals}>
            <tbody>
              <tr>
                <td>Subtotaal diensten</td>
                <td className={styles.amount}>{formatEuro(totalen.subtotaalExcl)}</td>
              </tr>
              {kortingPct > 0 && totalen.kortingBedrag > 0 ? (
                <tr className={styles.korting}>
                  <td>
                    Actiekorting ({kortingPct}%)
                    {lead.korting_omschrijving ? ` — ${lead.korting_omschrijving}` : ''}
                  </td>
                  <td className={styles.amount}>− {formatEuro(totalen.kortingBedrag)}</td>
                </tr>
              ) : null}
              <tr className={styles.subtotal}>
                <td>Totaal excl. BTW</td>
                <td className={styles.amount}>{formatEuro(totalen.naKortingExcl)}</td>
              </tr>
              <tr>
                <td>BTW ({totalen.btwPercentage}%)</td>
                <td className={styles.amount}>{formatEuro(totalen.btw)}</td>
              </tr>
              <tr className={styles.grand}>
                <td>Totaal incl. BTW</td>
                <td className={styles.amount}>{formatEuro(totalen.totaalIncl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── VOORWAARDEN ─────────────────────────────────────────── */}
      <div className={styles.voorwaarden}>
        <div className={styles.voorwaardenLabel}>Voorwaarden</div>
        Deze offerte is geldig tot {formatDateNL(geldigTot)}. Alle bedragen zijn
        in euro&apos;s. BTW-tarief 21% is van toepassing op alle posten.
      </div>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <div className={styles.footerText}>
          <strong>{BEDRIJF.naam}</strong>
          <span className={styles.sep}>|</span>
          {BEDRIJF.adres}, {BEDRIJF.postcode} {BEDRIJF.plaats}
          <br />
          KvK {BEDRIJF.kvk}
          <span className={styles.sep}>|</span>
          BTW {BEDRIJF.btw}
          <span className={styles.sep}>|</span>
          {BEDRIJF.email}
        </div>
      </div>
    </main>
  )
}
