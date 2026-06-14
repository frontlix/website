"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, AlertTriangle, Check } from "lucide-react";
import {
  requestDataExportAction,
  requestAccountDeleteAction,
} from "@/lib/dashboard/avg-actions";
import styles from "./panels.module.css";

interface AvgPanelProps {
  /** false in de demo-fallback (geen sessie): acties zijn dan no-op. */
  live: boolean;
}

type Msg = { ok: boolean; text: string } | null;

/** Statusbanner onder een blok (groen bij ok, rood bij fout). */
function StatusBanner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      className={`${styles.tplStatus} ${msg.ok ? styles.tplStatusOk : styles.tplStatusErr}`}
    >
      {msg.ok ? <Check size={15} strokeWidth={2.5} /> : <AlertTriangle size={15} />}
      {msg.text}
    </div>
  );
}

/** AVG/Privacy-paneel: je gegevens exporteren of je account verwijderen.
 *  Zelf-afhandelend; hergebruikt de bestaande server-acties. */
export function AvgPanel({ live }: AvgPanelProps) {
  return (
    <>
      <ExportBlock live={live} />
      <DeleteBlock live={live} />
    </>
  );
}

function ExportBlock({ live }: { live: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  function onClick() {
    if (!live) return;
    setMsg(null);
    startTransition(async () => {
      const res = await requestDataExportAction();
      setMsg(
        res.ok
          ? { ok: true, text: res.message ?? "Aanvraag genoteerd." }
          : { ok: false, text: res.error },
      );
    });
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        <Download size={15} strokeWidth={2} /> Exporteer mijn gegevens
      </div>
      <div className={styles.sectionSub}>
        We verzamelen je leads, gesprekken, foto&apos;s en offertes. Na je aanvraag
        neemt Frontlix contact op zodra je export klaarstaat.
      </div>
      <StatusBanner msg={msg} />
      <button
        type="button"
        className={styles.geoBtn}
        onClick={onClick}
        disabled={pending || !live}
        style={{ marginTop: 16 }}
      >
        {pending ? "Aanvragen..." : "Vraag export aan"}
      </button>
    </div>
  );
}

function DeleteBlock({ live }: { live: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!live) return;
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const res = await requestAccountDeleteAction(fd);
      if (res.ok) {
        setMsg({ ok: true, text: res.message ?? "Verzoek genoteerd, je wordt uitgelogd." });
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={styles.section}>
      <div className={styles.sectionTitle} style={{ color: "var(--rb-danger)" }}>
        <AlertTriangle size={15} strokeWidth={2} /> Verwijder mijn account
      </div>
      <div className={styles.sectionSub}>
        Onomkeerbaar. Al je leads, gesprekken en offertes worden binnen 30 dagen
        permanent verwijderd en je wordt direct uitgelogd.
      </div>

      <div className={styles.gridTop} style={{ maxWidth: 340 }}>
        <div className={styles.fieldLabel}>Bevestig door VERWIJDER te typen</div>
        <input
          className={styles.authInput}
          type="text"
          name="bevestiging"
          placeholder="VERWIJDER"
          required
        />
      </div>

      <StatusBanner msg={msg} />
      <button
        type="submit"
        className={styles.geoBtn}
        disabled={pending || !live}
        style={{ marginTop: 16, background: "var(--rb-danger)" }}
      >
        {pending ? "Bezig..." : "Account verwijderen"}
      </button>
    </form>
  );
}
