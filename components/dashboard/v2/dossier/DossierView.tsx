"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, StickyNote, Archive, RotateCcw } from "lucide-react";
import { Avatar, StatusPill, SegmentedControl } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { archiveLead, unarchiveLead } from "@/lib/dashboard/lead-actions";
import { addNote } from "@/lib/dashboard/note-actions";
import { LeadDetailRealtime } from "@/components/dashboard/leads/LeadDetailRealtime";
import type { Lead } from "@/components/dashboard/v2/demo-data";
import { DOSSIER } from "./dossier-data";
import type { DossierData, DossierNotitie, DossierBericht } from "./dossier-data";
import { InfoTab } from "./InfoTab";
import { OffertesTab } from "./OffertesTab";
import { FotosTab } from "./FotosTab";
import { NotitiesTab } from "./NotitiesTab";
import { ChatPanel } from "./ChatPanel";
import styles from "./DossierView.module.css";

type TabKey = "Info" | "Offertes" | "Foto's" | "Notities";

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
}

/** Lead-dossier (split view). Kop met terug-link, naam, status + acties;
 *  links een tab-kaart (Info / Offertes / Foto's / Notities), rechts het
 *  WhatsApp-gesprek. Met echte data (dossier + leadId) wired naar de
 *  bestaande server-actions/API-routes; zonder valt 'ie terug op demo-state. */
export function DossierView({
  lead,
  dossier,
  leadId,
  botPaused,
  archivedInitial,
}: DossierViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Echte data wanneer aanwezig, anders de demo-set.
  const data = dossier ?? DOSSIER;
  const live = Boolean(leadId);

  const [tab, setTab] = useState<TabKey>("Info");
  const [archived, setArchived] = useState(archivedInitial ?? false);
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
    setNotitiesDemo((prev) => [{ wie: "Christiaan", tijd: "zojuist", tekst }, ...prev]);
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

  const naarNotities = () => {
    setTab("Notities");
    // Re-trigger de autofocus ook als de tab al actief was.
    setNotesFocus(false);
    requestAnimationFrame(() => setNotesFocus(true));
  };

  const openOfferteWizard = () => {
    window.dispatchEvent(new CustomEvent("rb:new-offerte"));
  };

  const tabOptions: { value: TabKey; label: string }[] = [
    { value: "Info", label: "Info" },
    { value: "Offertes", label: `Offertes · ${data.offertes.length}` },
    { value: "Foto's", label: `Foto's · ${data.fotos.length}` },
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
        <Link href={`${V2_BASE}/leads`} className={styles.back}>
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
          {/* Offerte versturen vanuit het dossier is nog niet gekoppeld
              (opende een blanco wizard). Uitgeschakeld met "binnenkort" zodat
              het duidelijk is dat dit eraan komt. */}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={openOfferteWizard}
            disabled
            title="Binnenkort beschikbaar"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            Offerte versturen (binnenkort)
          </button>
        </div>
      </div>

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
            {tab === "Offertes" ? <OffertesTab data={data} leadId={leadId} /> : null}
            {tab === "Foto's" ? <FotosTab onVraagFotos={vraagFotos} data={data} /> : null}
            {tab === "Notities" ? (
              <NotitiesTab notities={notities} onAdd={voegNotitieToe} autoFocus={notesFocus} />
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
    </div>
  );
}
