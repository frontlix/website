"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Lock, Mail, Check, AlertTriangle } from "lucide-react";
import {
  updatePasswordAction,
  updateEmailAction,
} from "@/lib/dashboard/account-actions";
import styles from "./panels.module.css";

interface AccountPanelProps {
  /** Huidig e-mailadres (s.user.email); "" in de demo-fallback. */
  email: string;
  /** false in de demo-fallback (geen sessie): acties zijn dan no-op. */
  live: boolean;
}

type Msg = { ok: boolean; text: string } | null;

/** Statusbanner onder een formulier (groen bij ok, rood bij fout). */
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

/** Account-paneel: wachtwoord en e-mailadres wijzigen. Zelf-afhandelend (eigen
 *  knop + status), net als het Integraties-paneel; hergebruikt de bestaande
 *  server-acties, herbouwt geen logica. */
export function AccountPanel({ email, live }: AccountPanelProps) {
  return (
    <>
      <PasswordBlock live={live} />
      <EmailBlock currentEmail={email} live={live} />
      {!live ? (
        <div className={styles.note}>
          Account wijzigen werkt alleen wanneer je bent ingelogd op het echte dashboard.
        </div>
      ) : null}
    </>
  );
}

function PasswordBlock({ live }: { live: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!live) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMsg(null);
    startTransition(async () => {
      const res = await updatePasswordAction(fd);
      setMsg(
        res.ok
          ? { ok: true, text: res.message ?? "Wachtwoord bijgewerkt." }
          : { ok: false, text: res.error },
      );
      if (res.ok) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className={styles.section}>
      <div className={styles.sectionTitle}>
        <Lock size={15} strokeWidth={2} /> Wachtwoord wijzigen
      </div>
      <div className={styles.sectionSub}>Minimaal 8 tekens, kies iets sterks.</div>

      <div className={styles.gridTop}>
        <div className={styles.fieldLabel}>Huidig wachtwoord</div>
        <input
          className={styles.authInput}
          type="password"
          name="huidig"
          autoComplete="current-password"
          required
        />
      </div>
      <div className={styles.gridTop}>
        <div className={styles.fieldLabel}>Nieuw wachtwoord</div>
        <input
          className={styles.authInput}
          type="password"
          name="nieuw"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className={styles.gridTop}>
        <div className={styles.fieldLabel}>Herhaal nieuw wachtwoord</div>
        <input
          className={styles.authInput}
          type="password"
          name="herhaal"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <StatusBanner msg={msg} />
      <button
        type="submit"
        className={styles.geoBtn}
        disabled={pending || !live}
        style={{ marginTop: 16 }}
      >
        {pending ? "Opslaan..." : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}

function EmailBlock({ currentEmail, live }: { currentEmail: string; live: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!live) return;
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const res = await updateEmailAction(fd);
      setMsg(
        res.ok
          ? { ok: true, text: res.message ?? "Wijziging aangevraagd." }
          : { ok: false, text: res.error },
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className={styles.section}>
      <div className={styles.sectionTitle}>
        <Mail size={15} strokeWidth={2} /> E-mailadres
      </div>
      <div className={styles.sectionSub}>Huidig: {currentEmail || "onbekend"}</div>

      <div className={styles.gridTop}>
        <div className={styles.fieldLabel}>Nieuw e-mailadres</div>
        <input
          className={styles.authInput}
          type="email"
          name="email"
          autoComplete="email"
          defaultValue={currentEmail}
          required
        />
      </div>

      <StatusBanner msg={msg} />
      <button
        type="submit"
        className={styles.geoBtn}
        disabled={pending || !live}
        style={{ marginTop: 16 }}
      >
        {pending ? "Versturen..." : "Wijziging aanvragen"}
      </button>
    </form>
  );
}
