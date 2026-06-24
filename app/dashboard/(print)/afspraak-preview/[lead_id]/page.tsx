import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/dashboard/lead-queries";
import { requireApprovedUser } from "@/lib/dashboard/require-approved-user";
import { buildAfspraakInfo } from "@/lib/dashboard/afspraak-info";
import { PrintControls } from "./PrintControls";
import styles from "./page.module.css";

/**
 * Print-pagina voor een ingeplande afspraak: een overzichtelijke A4-kaart met
 * alle afspraakinfo (klant, planning, klus, locatie, contact) die de eigenaar
 * kan uitprinten en op een prikbord kan hangen. Wordt vanuit de agenda-modal
 * en de Afspraak-tab in een nieuw tabblad geopend.
 *
 * Print-vriendelijk: de browser-printdialoog wordt door PrintControls
 * automatisch geopend; afdrukken kan ook via Cmd/Ctrl+P.
 */
export const dynamic = "force-dynamic";

export default async function AfspraakPreviewPage({
  params,
}: {
  params: Promise<{ lead_id: string }>;
}) {
  await requireApprovedUser();
  const { lead_id } = await params;
  const detail = await getLeadDetail(lead_id);
  if (!detail) notFound();

  const info = buildAfspraakInfo(detail.lead);

  return (
    <main className={styles.page}>
      <PrintControls />

      <div className={styles.sheet}>
        {/* ── Kop ── */}
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>Afspraak</p>
            <h1 className={styles.naam}>{info.klantNaam}</h1>
          </div>
          <p className={styles.merk}>Schoon Straatje</p>
        </header>

        {!info.gepland ? (
          <p className={styles.leeg}>
            Voor deze lead is nog geen afspraak ingepland.
          </p>
        ) : (
          <>
            {/* ── Datum + tijd banner ── */}
            <div className={styles.banner}>
              <div>
                <span className={styles.bannerLabel}>Datum</span>
                <span className={styles.bannerValue}>{info.datumLang || "Onbekend"}</span>
              </div>
              <div className={styles.bannerTijd}>
                <span className={styles.bannerLabel}>Tijd</span>
                <span className={styles.bannerValue}>{info.tijd || "Onbekend"}</span>
              </div>
            </div>

            {/* ── Info-grid ── */}
            <div className={styles.grid}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Klus</h2>
                {info.dienst ? (
                  <Row label="Dienst" value={info.dienst} />
                ) : null}
                {info.subDiensten ? (
                  <Row label="Werkzaamheden" value={info.subDiensten} />
                ) : null}
                {info.oppervlakte ? (
                  <Row label="Oppervlakte" value={info.oppervlakte} />
                ) : null}
                {info.groeneAanslag ? <Row label="Groene aanslag" value="Aanwezig" /> : null}
                {info.plantenAfschermen ? (
                  <Row label="Planten" value="Afschermen" />
                ) : null}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Locatie</h2>
                {info.adres ? <Row label="Adres" value={info.adres} /> : null}
                {info.plaats ? <Row label="Plaats" value={info.plaats} /> : null}
                {info.reisAfstand ? (
                  <Row
                    label="Reisafstand"
                    value={
                      info.reisTijd
                        ? `${info.reisAfstand} · ${info.reisTijd}`
                        : info.reisAfstand
                    }
                  />
                ) : null}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Contact</h2>
                {info.telefoon ? <Row label="Telefoon" value={info.telefoon} /> : null}
              </section>
            </div>

            {info.geboektOp ? (
              <p className={styles.voet}>Afspraak geboekt op {info.geboektOp}</p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

/** Label-boven-waarde-rij binnen een info-kaart. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
