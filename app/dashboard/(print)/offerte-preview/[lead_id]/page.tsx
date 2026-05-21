import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import { formatEuro, formatDateNL } from '@/lib/dashboard/format'
import styles from './page.module.css'

/**
 * Offerte-preview pagina — toont de huidige offerte-state als nette
 * HTML-rendering, zoals de klant 'm zou ontvangen in PDF-vorm.
 *
 * Gebaseerd LIVE op de prijsregels in de database, dus elke aanpassing
 * in de Offerte-tab is hier meteen zichtbaar zodra de auto-save klaar is.
 *
 * Print-vriendelijk: user kan via browser-print naar PDF exporteren
 * (Ctrl/⌘+P).
 */
export const dynamic = 'force-dynamic'

export default async function OffertePreviewPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  // Auth: alleen approved dashboard-users mogen previews zien
  await requireApprovedUser()

  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)
  if (!detail) notFound()

  const { lead, prijsregels, offertes } = detail
  const huidige = offertes.find((o) => o.is_concept) ?? offertes[0]
  const versie = huidige?.versie ?? 1
  const versieDatum = huidige?.aangemaakt_op ?? new Date().toISOString()

  // Totalen berekenen uit de regels — zelfde logica als de Offerte-tab.
  const kortingPct = Number(lead.korting_percentage ?? 0)
  const regelTotalen = prijsregels.map((r) => Number(r.totaal ?? 0))
  const totalen = berekenTotalen(regelTotalen, kortingPct)

  // Geldigheidsdatum = versie-aanmaak + geldigheid_dagen (default 30)
  const geldigheidDagen = lead.offerte_geldigheid_dagen ?? 30
  const geldigTot = new Date(versieDatum)
  geldigTot.setDate(geldigTot.getDate() + geldigheidDagen)

  // Klant-adres samenstellen
  const adresLine1 = [lead.straat, lead.huisnummer].filter(Boolean).join(' ')
  const adresLine2 = [lead.postcode, lead.plaats].filter(Boolean).join(' ')

  return (
    <main className={styles.sheet}>
      {/* ─── Header: logo + bedrijf + offerte-meta ─────────────── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/logo-trans.png"
            alt="Frontlix"
            width={40}
            height={40}
            className={styles.logo}
            priority
          />
          <div className={styles.brandText}>
            <div className={styles.brandName}>Schoon-Straatje</div>
            <div className={styles.brandSub}>Voegen invegen · straatwerk</div>
          </div>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Offerte</span>
            <span className={styles.metaValue}>v{versie}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Datum</span>
            <span className={styles.metaValue}>{formatDateNL(versieDatum)}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Geldig t/m</span>
            <span className={styles.metaValue}>{formatDateNL(geldigTot.toISOString())}</span>
          </div>
        </div>
      </header>

      {/* ─── Klantgegevens ────────────────────────────────────── */}
      <section className={styles.klant}>
        <div className={styles.klantLabel}>Aan</div>
        <div className={styles.klantNaam}>{lead.naam ?? 'Klant'}</div>
        {adresLine1 ? <div className={styles.klantLine}>{adresLine1}</div> : null}
        {adresLine2 ? <div className={styles.klantLine}>{adresLine2}</div> : null}
        {lead.email ? <div className={styles.klantLine}>{lead.email}</div> : null}
        {lead.telefoon ? <div className={styles.klantLine}>{lead.telefoon}</div> : null}
      </section>

      {/* ─── Regels-tabel ─────────────────────────────────────── */}
      <section className={styles.regelsBlok}>
        <table className={styles.regelsTabel}>
          <thead>
            <tr>
              <th className={styles.thOmschrijving}>Omschrijving</th>
              <th className={styles.thNumeric}>Aantal</th>
              <th className={styles.thEenheid}>Eenheid</th>
              <th className={styles.thNumeric}>Prijs / eenh.</th>
              <th className={styles.thNumeric}>Totaal</th>
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
                  <td>{r.omschrijving}</td>
                  <td className={styles.tdNumeric}>{r.aantal ?? '—'}</td>
                  <td>{r.eenheid ?? '—'}</td>
                  <td className={styles.tdNumeric}>{formatEuro(Number(r.stukprijs))}</td>
                  <td className={styles.tdNumeric}>{formatEuro(Number(r.totaal))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* ─── Totalen (rechtsuitgelijnd blok) ─────────────────────── */}
      <section className={styles.totalenBlok}>
        <div className={styles.totalenInner}>
          <div className={styles.totaalRow}>
            <span>Subtotaal</span>
            <span>{formatEuro(totalen.subtotaalExcl)}</span>
          </div>
          {kortingPct > 0 && totalen.kortingBedrag > 0 ? (
            <div className={`${styles.totaalRow} ${styles.totaalRowKorting}`}>
              <span>
                Korting ({kortingPct}%){' '}
                {lead.korting_omschrijving ? (
                  <span className={styles.kortingOmschr}>· {lead.korting_omschrijving}</span>
                ) : null}
              </span>
              <span>− {formatEuro(totalen.kortingBedrag)}</span>
            </div>
          ) : null}
          <div className={`${styles.totaalRow} ${styles.totaalRowStrong}`}>
            <span>Excl. BTW</span>
            <span>{formatEuro(totalen.naKortingExcl)}</span>
          </div>
          <div className={`${styles.totaalRow} ${styles.totaalRowMuted}`}>
            <span>BTW {totalen.btwPercentage}%</span>
            <span>{formatEuro(totalen.btw)}</span>
          </div>
          <div className={`${styles.totaalRow} ${styles.totaalRowHero}`}>
            <span>Totaal incl. BTW</span>
            <span>{formatEuro(totalen.totaalIncl)}</span>
          </div>
        </div>
      </section>

      {/* ─── Footer: voorwaarden + tip om te printen ─────────────── */}
      <footer className={styles.footer}>
        <p className={styles.voorwaarden}>
          Op deze offerte zijn onze algemene voorwaarden van toepassing. Met
          garantie voor 12 maanden op uitgevoerd werk.
        </p>
        <p className={styles.printHint}>
          Tip: gebruik Cmd/Ctrl + P om deze pagina af te drukken of als PDF op
          te slaan.
        </p>
      </footer>
    </main>
  )
}
