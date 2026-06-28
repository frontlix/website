"use client";

import { useRef, useState, useTransition } from "react";
import type { OfferteEditorApi } from "./OfferteEditor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, StickyNote, Archive, RotateCcw, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Avatar, StatusPill, SegmentedControl } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { archiveLead, unarchiveLead, markeerGeenEchteLead } from "@/lib/dashboard/lead-actions";
import { ConfirmDeleteLeadDialog } from "@/components/dashboard/ConfirmDeleteLeadDialog";
import { completeAppointment } from "@/lib/dashboard/agenda-actions";
import { setKlusGeblokkeerd, toonKlusAfrondenKnoppen } from "@/lib/dashboard/klus-status-client";
import { freezeVerstuurdeOfferteData } from "@/lib/dashboard/offerte-form-actions";
import { addNote, deleteNote, updateNote, setNoteTargets } from "@/lib/dashboard/note-actions";
import { LeadDetailRealtime } from "@/components/dashboard/leads/LeadDetailRealtime";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import { OfferteTerGoedkeuringBlok } from "./OfferteTerGoedkeuringBlok";
import { DOSSIER, deriveAlVerstuurd } from "./dossier-data";
import type { DossierData, DossierNotitie, DossierBericht } from "./dossier-data";
import { InfoTab } from "./InfoTab";
import { OffertesTab } from "./OffertesTab";
import { OpdrachtbonActions } from "./OpdrachtbonActions";
import { FotosTab } from "./FotosTab";
import { AfspraakTab } from "./AfspraakTab";
import { NotitiesTab } from "./NotitiesTab";
import { ChatPanel } from "./ChatPanel";
import { LeadTagsRow } from "./LeadTagsRow";
import type { Tag } from "@/lib/dashboard/database.types";
import styles from "./DossierView.module.css";

type TabKey = "Info" | "Offertes" | "Foto's" | "Afspraak" | "Notities";

interface DossierViewProps {
  lead: Lead;
  /** Echte dossier-data (server-fetch). Zonder = demo-fallback. */
  dossier?: DossierData;
  /** Echte lead_id, nodig voor de server-actions + realtime. */
  leadId?: string;
  /** Echte bot_gepauzeerd-stand uit de lead (Surface aan = !paused). */
  botPaused?: boolean;
  /** Echte dashboard_archived-stand uit de lead. */
  archivedInitial?: boolean;
  /** Afspraak-datum (ISO) van de lead, voor de "Klus afronden"-knoppen. */
  afspraakDatum?: string | null;
  /** dashboard_status van de lead ('open' | 'afgehandeld' | ...). */
  dashboardStatus?: string | null;
  leadTags?: Tag[];
  allTags?: Tag[];
}

/** Lead-dossier (split view). Kop met terug-link, naam, status + acties;
 *  links een tab-kaart (Info / Offertes / Foto's / Afspraak / Notities), rechts het
 *  WhatsApp-gesprek. Met echte data (dossier + leadId) wired naar de
 *  bestaande server-actions/API-routes; zonder valt 'ie terug op demo-state. */
export function DossierView({
  lead,
  dossier,
  leadId,
  botPaused,
  archivedInitial,
  afspraakDatum,
  dashboardStatus,
  leadTags,
  allTags,
}: DossierViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, startSend] = useTransition();
  const [klusPending, startKlus] = useTransition();
  // Flush-API van de offerte-editor (gevuld door OffertesTab -> OfferteEditor),
  // zodat we vóór het versturen de laatste wijzigingen kunnen wegschrijven.
  const offerteApiRef = useRef<OfferteEditorApi | null>(null);

  // Echte data wanneer aanwezig, anders de demo-set.
  const data = dossier ?? DOSSIER;
  const live = Boolean(leadId);

  const [tab, setTab] = useState<TabKey>("Info");
  const [archived, setArchived] = useState(archivedInitial ?? false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notesFocus, setNotesFocus] = useState(false);
  // In de live-modus is de server de bron van waarheid (router.refresh na een
  // mutatie); we tonen de server-data direct. In demo-modus houden we lokale
  // state zodat de preview interactief blijft.
  const [notitiesDemo, setNotitiesDemo] = useState<DossierNotitie[]>(DOSSIER.notities);
  const [chatDemo, setChatDemo] = useState<DossierBericht[]>(DOSSIER.chat);
  const [botAanDemo, setBotAanDemo] = useState(true);

  const notities = live ? data.notities : notitiesDemo;
  const chat = live ? data.chat : chatDemo;
  // Surface is "aan" zolang de bot niet gepauzeerd is.
  const botAan = live ? !(botPaused ?? false) : botAanDemo;

  const voegNotitieToe = (tekst: string) => {
    if (live && leadId) {
      startTransition(async () => {
        const res = await addNote(leadId, tekst);
        if (res.ok) router.refresh();
      });
      return;
    }
    setNotitiesDemo((prev) => [
      {
        id: `demo-${prev.length + 1}-${tekst.length}`,
        wie: "Christiaan",
        tijd: "zojuist",
        tekst,
        opAfspraak: true,
        opOpdrachtbon: true,
      },
      ...prev,
    ]);
  };

  const verwijderNotitie = (id: string) => {
    if (live && leadId) {
      startTransition(async () => {
        const res = await deleteNote(id, leadId);
        if (res.ok) router.refresh();
        else window.alert(res.error || "Verwijderen mislukt.");
      });
      return;
    }
    setNotitiesDemo((prev) => prev.filter((n) => n.id !== id));
  };

  const bewerkNotitie = (id: string, tekst: string) => {
    if (live && leadId) {
      startTransition(async () => {
        const res = await updateNote(id, leadId, tekst);
        if (res.ok) router.refresh();
        else window.alert(res.error || "Bewerken mislukt.");
      });
      return;
    }
    setNotitiesDemo((prev) => prev.map((n) => (n.id === id ? { ...n, tekst } : n)));
  };

  const zetNotitieTargets = (
    id: string,
    targets: { opAfspraak: boolean; opOpdrachtbon: boolean },
  ) => {
    if (live && leadId) {
      startTransition(async () => {
        const res = await setNoteTargets(id, leadId, targets);
        if (res.ok) router.refresh();
        else window.alert(res.error || "Opslaan van de vinkjes mislukt.");
      });
      return;
    }
    setNotitiesDemo((prev) => prev.map((n) => (n.id === id ? { ...n, ...targets } : n)));
  };

  // Zelf een bericht sturen pauzeert Surface (server-side, na 24u-window-check).
  const stuurBericht = (tekst: string) => {
    if (live && leadId) {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/dashboard/lead/${leadId}/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bericht: tekst }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && body?.ok !== false) router.refresh();
        } catch {
          // Netwerkfout, demo-pad onaangeroerd; de owner ziet geen wijziging.
        }
      });
      return;
    }
    setChatDemo((prev) => [...prev, { van: "mij", tekst, tijd: "nu" }]);
    setBotAanDemo(false);
  };

  // Surface pauzeren/hervatten via de bestaande proxy-route.
  const zetBot = (next: boolean) => {
    if (live && leadId) {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/dashboard/lead/${leadId}/bot-pauzeren`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paused: !next }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && body?.ok !== false) router.refresh();
        } catch {
          // Netwerkfout; geen state-mutatie.
        }
      });
      return;
    }
    setBotAanDemo(next);
  };

  const vraagFotos = () => {
    // Demo-only: voegt een Surface-bericht aan het transcript toe. In de
    // live-modus is dit (nog) geen aparte server-actie (zie follow-ups), dus
    // doen we niets dat de echte data zou maskeren.
    if (live) return;
    setChatDemo((prev) => [
      ...prev,
      {
        van: "bot",
        tekst:
          "Zou je nog een paar extra foto's kunnen sturen? Vooral van de randen en de afvoer.",
        tijd: "nu",
      },
    ]);
  };

  const toggleArchief = () => {
    if (live && leadId) {
      const next = !archived;
      // Geen bevestiging: archiveren haalt de lead uit de pipeline, maar de
      // knop flipt meteen naar "Herstel" (hier én in de archief-lijst), dus
      // per ongeluk archiveren is altijd één klik terug te draaien.
      setArchived(next); // optimistisch; revalidate bevestigt
      startTransition(async () => {
        const res = next ? await archiveLead(leadId) : await unarchiveLead(leadId);
        if (res.ok) router.refresh();
        else setArchived(!next); // rollback bij fout
      });
      return;
    }
    setArchived((a) => !a);
  };

  // "Geen echte lead": spam/test/dubbel/verkeerd nummer. Haalt de lead uit ALLE
  // statistieken (uitgesloten_van_stats) en archiveert hem meteen. Geen
  // bevestiging: omkeerbaar via Herstel in het archief (dat zet beide vlaggen terug).
  const markeerGeenEcht = () => {
    if (!live || !leadId) return;
    setArchived(true); // markeren archiveert ook; optimistisch
    startTransition(async () => {
      const res = await markeerGeenEchteLead(leadId);
      if (res.ok) router.refresh();
      else setArchived(false);
    });
  };

  // "Klus afronden"-knoppen: alleen tonen als de lead een afspraak op of vóór
  // vandaag heeft én nog open staat (zie toonKlusAfrondenKnoppen). Niet bij een
  // gearchiveerde lead.
  const toonKlus =
    live && !archived && toonKlusAfrondenKnoppen(afspraakDatum, dashboardStatus);

  // "Klus afgerond": de afspraak ging door, zet dashboard_status='afgehandeld'.
  const handleKlusAfgerond = () => {
    if (!live || !leadId || klusPending) return;
    startKlus(async () => {
      const res = await completeAppointment(leadId);
      if (res.ok) router.refresh();
      else window.alert(res.error || "Afronden mislukt.");
    });
  };

  // "Klus niet doorgegaan": markeer de klus als geblokkeerd via de bot-proxy.
  const handleKlusNietDoorgegaan = () => {
    if (!live || !leadId || klusPending) return;
    startKlus(async () => {
      const res = await setKlusGeblokkeerd(leadId, true);
      if (res.ok) router.refresh();
      else window.alert(res.error || "Markeren mislukt.");
    });
  };

  const naarNotities = () => {
    setTab("Notities");
    // Re-trigger de autofocus ook als de tab al actief was.
    setNotesFocus(false);
    requestAnimationFrame(() => setNotesFocus(true));
  };

  const naarOffertesTab = () => {
    setTab("Offertes");
  };

  // Is er al een offerte verstuurd? Dan kan deze knop niet opnieuw versturen
  // (de bot-revisie-flow is een aparte stap). We leiden dit af uit de
  // offertes-lijst: een niet-concept, niet-archief-offerte = verstuurd.
  const alVerstuurd = deriveAlVerstuurd(data.offertes);

  // Offerte versturen naar de klant via de bot (WhatsApp). De editor slaat zijn
  // wijzigingen debounced op (600ms); de bevestigingsdialoog overbrugt die tijd,
  // zodat de bot het laatst opgeslagen concept verstuurt. Alleen eerste
  // verzending; bij een reeds verstuurde offerte is de knop uitgeschakeld.
  const handleVerstuur = () => {
    if (!live || !leadId || sending || alVerstuurd) return;
    if (
      !window.confirm(
        `Offerte nu naar ${lead.naam} sturen via WhatsApp? De klant ontvangt direct de PDF.`,
      )
    ) {
      return;
    }
    startSend(async () => {
      try {
        // Schrijf eerst eventuele net-bewerkte concept-wijzigingen weg, zodat
        // de bot exact de zichtbare offerte verstuurt (de editor auto-saved
        // debounced; dit forceert de laatste staat).
        await offerteApiRef.current?.flush();
        const res = await fetch(`/api/dashboard/lead/${leadId}/approve-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.ok !== false) {
          // Bevries de volledige editor-invoer in de zojuist verstuurde
          // snapshot (de bot schrijft alleen pricing+regels), zodat "Terug naar
          // verstuurde versie" later de werk-invoer compleet kan terugzetten.
          // Best-effort: een fout hier mag het versturen niet doen lijken te
          // mislukken.
          await freezeVerstuurdeOfferteData(leadId).catch(() => {});
          router.refresh();
        } else {
          window.alert(
            typeof body?.error === "string"
              ? body.error
              : `Versturen mislukt (HTTP ${res.status}).`,
          );
        }
      } catch {
        window.alert("Versturen mislukt door een netwerkfout. Probeer het opnieuw.");
      }
    });
  };

  const tabOptions: { value: TabKey; label: string }[] = [
    { value: "Info", label: "Info" },
    { value: "Offertes", label: `Offertes · ${data.offertes.length}` },
    { value: "Foto's", label: `Foto's · ${data.fotos.length}` },
    { value: "Afspraak", label: "Afspraak" },
    { value: "Notities", label: `Notities · ${notities.length}` },
  ];

  return (
    <div className={styles.page}>
      {/* Realtime: bij nieuwe berichten/fotos refresht de server-fetch. In een
          display:none-houder zodat de LiveDot geen layout-cel inneemt. */}
      {live && leadId ? (
        <span hidden>
          <LeadDetailRealtime leadId={leadId} />
        </span>
      ) : null}

      {/* Kop */}
      <div className={styles.kop}>
        {/* Terug naar de lijst waar deze lead leeft: gearchiveerd → het archief
            (?archief=1, spiegelt de ArchiveSwitch), anders de actieve lijst. We
            kijken naar de live `archived`-state, dus na de-archiveren in het
            dossier landt 'ie weer in de actieve lijst. */}
        <Link href={`${V2_BASE}/leads${archived ? "?archief=1" : ""}`} className={styles.back}>
          <ChevronLeft size={16} strokeWidth={2.4} />
          Leads
        </Link>
        <Avatar initials={lead.initials} name={lead.naam} size={44} />
        <div className={styles.kopMain}>
          <div className={styles.kopTitleRow}>
            <h1 className={styles.naam}>{lead.naam}</h1>
            <StatusPill kind={lead.statusKind}>● {lead.status}</StatusPill>
            {archived ? (
              <span className={styles.archivedPill}>
                <Archive size={11} strokeWidth={2.4} />
                Gearchiveerd
              </span>
            ) : null}
          </div>
          <div className={styles.meta}>
            {lead.dienst} · {lead.plaats} · via {lead.bron} · laatste bericht {data.binnen}
          </div>
          {leadId ? (
            <LeadTagsRow
              leadId={leadId}
              leadTags={leadTags ?? []}
              allTags={allTags ?? []}
              live={live}
            />
          ) : null}
        </div>
        <div className={styles.acties}>
          <button type="button" className={styles.actieBtn} onClick={naarNotities}>
            <StickyNote size={15} strokeWidth={2.1} />
            Notitie
          </button>
          <button
            type="button"
            className={styles.actieBtn}
            onClick={toggleArchief}
            disabled={pending}
          >
            {archived ? (
              <>
                <RotateCcw size={15} strokeWidth={2.1} />
                Herstel
              </>
            ) : (
              <>
                <Archive size={15} strokeWidth={2.1} />
                Archief
              </>
            )}
          </button>
          {!archived ? (
            <button
              type="button"
              className={styles.actieBtn}
              onClick={markeerGeenEcht}
              disabled={pending}
              title="Spam, test, dubbel of verkeerd nummer: uit je lijst en uit alle statistieken"
            >
              <Trash2 size={15} strokeWidth={2.1} />
              Verwijderen
            </button>
          ) : null}
          {archived && live ? (
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => setDeleteOpen(true)}
              disabled={pending}
              title="Lead definitief verwijderen — kan niet ongedaan worden gemaakt"
            >
              <Trash2 size={15} strokeWidth={2.1} />
              Definitief verwijderen
            </button>
          ) : null}
          {/* Klus afronden: de afspraak is voorbij en de lead staat nog open.
              "Klus afgerond" → afgehandeld; "Klus niet doorgegaan" → geblokkeerd. */}
          {toonKlus ? (
            <>
              <button
                type="button"
                className={styles.klusOkBtn}
                onClick={handleKlusAfgerond}
                disabled={klusPending}
                title="De klus is doorgegaan en afgerond"
              >
                <CheckCircle2 size={15} strokeWidth={2.2} />
                Klus afgerond
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleKlusNietDoorgegaan}
                disabled={klusPending}
                title="De klus is niet doorgegaan"
              >
                <XCircle size={15} strokeWidth={2.2} />
                Klus niet doorgegaan
              </button>
            </>
          ) : null}
          {/* Offerte versturen naar de klant via de bot (WhatsApp). Alleen de
              eerste verzending; bij een reeds verstuurde offerte toont de knop
              "Al verstuurd" en is 'ie uitgeschakeld. */}
          <OpdrachtbonActions
            model={data.opdrachtbon}
            klantNaam={lead.naam}
            triggerClassName={styles.actieBtn}
          />
          {!data.offerteTerGoedkeuring ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleVerstuur}
              disabled={!live || alVerstuurd || sending}
              title={
                alVerstuurd
                  ? "Deze offerte is al verstuurd"
                  : "Offerte versturen naar de klant via WhatsApp"
              }
              style={!live || alVerstuurd ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
            >
              {sending ? "Versturen…" : alVerstuurd ? "Al verstuurd" : "Offerte versturen"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Het goedkeur-blok verdwijnt zodra je in het Offertes-tabblad (de editor)
          zit: de pagina heeft een vaste hoogte met een interne kolom-scroll, dus
          een groot blok zou de editor in een klein vakje persen. In de editor zie
          je de regels toch al, met een eigen Goedkeuren-knop. */}
      {data.offerteTerGoedkeuring && tab !== "Offertes" ? (
        <OfferteTerGoedkeuringBlok
          dienst={data.offerteTerGoedkeuring.dienst}
          m2={data.offerteTerGoedkeuring.m2}
          totaal={data.offerteTerGoedkeuring.totaal}
          regels={data.offerteTerGoedkeuring.regels}
          subtotaal={data.offerteTerGoedkeuring.subtotaal}
          korting={data.offerteTerGoedkeuring.korting}
          btw={data.offerteTerGoedkeuring.btw}
          pdfModel={data.offerteTerGoedkeuring.pdfModel}
          sending={sending}
          onGoedkeuren={handleVerstuur}
          onAanpassen={naarOffertesTab}
        />
      ) : null}

      {/* Split view */}
      <div className={`${styles.split} ${archived ? styles.dimmed : ""}`}>
        {/* Links: tabs */}
        <div className={styles.tabCard}>
          <div className={styles.tabBar}>
            <SegmentedControl<TabKey>
              options={tabOptions}
              value={tab}
              onChange={(t) => setTab(t)}
            />
          </div>
          <div className={styles.tabBody}>
            {tab === "Info" ? <InfoTab dienst={lead.dienst} data={data} /> : null}
            {tab === "Offertes" ? (
              <OffertesTab
                data={data}
                leadId={leadId}
                offerteApiRef={offerteApiRef}
                onGoedkeuren={data.offerteTerGoedkeuring ? handleVerstuur : undefined}
              />
            ) : null}
            {tab === "Foto's" ? <FotosTab onVraagFotos={vraagFotos} data={data} /> : null}
            {tab === "Afspraak" ? <AfspraakTab data={data} /> : null}
            {tab === "Notities" ? (
              <NotitiesTab
                notities={notities}
                onAdd={voegNotitieToe}
                onDelete={verwijderNotitie}
                onUpdate={bewerkNotitie}
                onSetTargets={zetNotitieTargets}
                autoFocus={notesFocus}
              />
            ) : null}
          </div>
        </div>

        {/* Rechts: WhatsApp-gesprek */}
        <ChatPanel
          initials={lead.initials}
          naam={lead.naam}
          messages={chat}
          botAan={botAan}
          onToggleBot={zetBot}
          onSend={stuurBericht}
          data={data}
        />
      </div>

      <ConfirmDeleteLeadDialog
        open={deleteOpen}
        leadId={leadId ?? ""}
        leadNaam={lead.naam}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          // De lead bestaat niet meer: terug naar het archief i.p.v. dit dossier.
          router.push(`${V2_BASE}/leads?archief=1`);
        }}
      />
    </div>
  );
}
