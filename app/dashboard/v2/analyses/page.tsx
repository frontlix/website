// ─────────────────────────────────────────────────────────────────────
// Analyses (rebrand v2, desktop) — SERVER-COMPONENT.
//
// Volgt het master-data-contract: server-fetch → mapper → bestaande
// v2-componenten. Hergebruikt exact de queries/condities van de bestaande
// (app)-statistiekenpagina (lib/dashboard/stats-queries.ts) en haalt
// tenant-gescopete data op via v2Session() (RLS actief). Zonder sessie
// (dev-preview) valt 'ie terug op de bestaande demo-data.
//
// Het interactieve gedrag (punt klikken, periode-pill → URL-sync) zit in de
// dunne client-wrapper AnalysesClient; de visuele opzet is ongewijzigd.
// ─────────────────────────────────────────────────────────────────────

import { v2Session } from "@/lib/dashboard/v2/session";
import { parsePeriod, periodToRange, rangeToDays, periodLabel } from "@/lib/dashboard/period";
import {
  countLeads,
  countConverted,
  countOffertesVerstuurd,
  avgOfferteWaarde,
  avgReactietijdMs,
  leadsPerDag,
  omzetTotaal,
  omzetPerCategorie,
  omzetTrendVoorPeriode,
  statusVerdeling,
  categorieVerdeling,
  topTags,
} from "@/lib/dashboard/stats-queries";
import {
  PERIODES,
  FUNNEL,
  BRONNEN,
  INZICHTEN,
  TOP_DIENSTEN,
  STATUS_VERDELING,
  CATEGORIE_VERDELING,
  TOP_TAGS,
  ANALYSE_KPIS,
  type PeriodeNaam,
} from "@/components/dashboard/v2/analyses/analyses-data";
import {
  mapKpis,
  mapPeriodeReeks,
  mapFunnel,
  mapBronnen,
  mapTopDiensten,
  mapStatusVerdeling,
  mapCategorieVerdeling,
  keyNaarPeriode,
  euroCompact,
  type KanaalLeadRow,
} from "@/components/dashboard/v2/analyses/analyses-mappers";
import { AnalysesClient } from "./AnalysesClient";

// De v2-pagina gebruikt z'n eigen searchparam `?periode=` (PeriodKey) zodat
// hij niet botst met de (app)-pagina die `?period=` leest. parsePeriod()
// accepteert beide; we mappen `periode` om naar de vorm die parsePeriod kent.
function leesPeriode(sp: { [k: string]: string | string[] | undefined }) {
  const raw = Array.isArray(sp.periode) ? sp.periode[0] : sp.periode;
  return parsePeriod({ period: raw });
}

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const periodKey = leesPeriode(sp);
  const periodeNaam: PeriodeNaam = keyNaarPeriode(periodKey);

  const s = await v2Session();

  // ── Demo-fallback (dev-preview zonder login) ─────────────────────────
  if (s === null) {
    const demo = PERIODES[periodeNaam];
    return (
      <AnalysesClient
        periode={periodeNaam}
        kpis={ANALYSE_KPIS}
        reeks={demo}
        funnel={FUNNEL}
        bronnen={BRONNEN}
        diensten={TOP_DIENSTEN}
        statusVerdeling={STATUS_VERDELING}
        categorieVerdeling={CATEGORIE_VERDELING}
        topTags={TOP_TAGS}
        inzichten={INZICHTEN}
        dienstenTotaal={demo.totaal}
        inzichtenMeta="juni 2026 · 38 leads · €11.9k"
        gemKluswaarde="€386"
      />
    );
  }

  // ── Echte, tenant-gescopete data (RLS actief via s.supabase) ─────────
  const range = periodToRange(periodKey);
  const trendDays = rangeToDays(range);

  // Kanaal-rijen voor de bronnen-grouping: zelfde leads-tabel + venster als
  // countLeads (filtert op `aangemaakt` met inclusieve from / exclusieve to).
  // De client is al gescoped, dus geen extra tenant-filter nodig.
  async function fetchKanaalRows(): Promise<KanaalLeadRow[]> {
    let q = s!.supabase
      .from("leads")
      .select(
        "kanaal, bron, aangemaakt, akkoord_op, afspraak_geboekt_op, totaal_prijs",
      );
    if (range.from) q = q.gte("aangemaakt", range.from);
    if (range.to) q = q.lt("aangemaakt", range.to);
    const { data, error } = await q;
    if (error) {
      console.error("[v2/analyses] kanaal-rijen failed:", error);
      return [];
    }
    return (data as KanaalLeadRow[] | null) ?? [];
  }

  // Funnel-stap "Gereageerd": unieke leads met minstens één uitgaand bericht,
  // binnen het leads-venster (zelfde afleiding als de (app)-funnel-logica /
  // het patroon uit avgReactietijdMs). Berekend via de gescopete client.
  async function countGereageerd(): Promise<number> {
    let leadsQ = s!.supabase.from("leads").select("lead_id");
    if (range.from) leadsQ = leadsQ.gte("aangemaakt", range.from);
    if (range.to) leadsQ = leadsQ.lt("aangemaakt", range.to);
    const { data: leadsData, error: leadsErr } = await leadsQ;
    if (leadsErr) {
      console.error("[v2/analyses] gereageerd-leads failed:", leadsErr);
      return 0;
    }
    const ids = ((leadsData as { lead_id: string }[] | null) ?? []).map(
      (r) => r.lead_id,
    );
    if (ids.length === 0) return 0;

    const { data: berData, error: berErr } = await s!.supabase
      .from("berichten")
      .select("lead_id")
      .eq("richting", "uitgaand")
      .in("lead_id", ids);
    if (berErr) {
      console.error("[v2/analyses] gereageerd-berichten failed:", berErr);
      return 0;
    }
    const unieke = new Set(
      ((berData as { lead_id: string }[] | null) ?? []).map((r) => r.lead_id),
    );
    return unieke.size;
  }

  const [
    total,
    converted,
    offertesVerstuurd,
    avgOfferte,
    avgReactieMs,
    perDag,
    omzet,
    omzetTrend,
    omzetDiensten,
    kanaalRows,
    gereageerd,
    statusRows,
    categorieRows,
    tagRows,
  ] = await Promise.all([
    countLeads(range),
    countConverted(range),
    countOffertesVerstuurd(range),
    avgOfferteWaarde(range),
    avgReactietijdMs(range),
    leadsPerDag(new Date(), trendDays),
    omzetTotaal(range),
    omzetTrendVoorPeriode(periodKey),
    omzetPerCategorie(range),
    fetchKanaalRows(),
    countGereageerd(),
    statusVerdeling(range),
    categorieVerdeling(range),
    topTags(range, 10),
  ]);

  const kpis = mapKpis({ total, converted, avgOfferte, avgReactieMs });
  const reeks = mapPeriodeReeks({
    periodKey,
    omzetTrend,
    leadsPerDag: perDag,
    omzetTotaal: omzet,
  });
  const funnel = mapFunnel({
    leadsBinnen: total,
    gereageerd,
    offertesVerstuurd,
    geaccepteerd: converted,
  });
  const bronnen = mapBronnen(kanaalRows);
  const diensten = mapTopDiensten(omzetDiensten);
  const statusVerdelingRows = mapStatusVerdeling(statusRows);
  const categorieVerdelingRows = mapCategorieVerdeling(categorieRows);

  // Gem. kluswaarde = totale omzet / aantal gewonnen leads (converted).
  const gemKluswaarde =
    converted > 0 ? euroCompact(omzet / converted) : "—";

  // Inzichten blijven het demo-prototype (Surface-API nog niet beschikbaar);
  // kop-meta toont wel de echte cijfers van de gekozen periode.
  const inzichtenMeta = `${periodLabel(periodKey)} · ${total} leads · ${euroCompact(omzet)}`;

  return (
    <AnalysesClient
      periode={periodeNaam}
      kpis={kpis}
      reeks={reeks}
      funnel={funnel}
      bronnen={bronnen}
      diensten={diensten}
      statusVerdeling={statusVerdelingRows}
      categorieVerdeling={categorieVerdelingRows}
      topTags={tagRows}
      inzichten={INZICHTEN}
      dienstenTotaal={euroCompact(omzet)}
      inzichtenMeta={inzichtenMeta}
      gemKluswaarde={gemKluswaarde}
    />
  );
}
