"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import styles from "./LeadsSearch.module.css";

/** Zoekbalk in de Leads-kop (glas-pill met kbd-hint). Wired op de `q`
 *  searchParam: bij submit (Enter) pusht 'ie /v2/leads?q=… zodat de
 *  server-component opnieuw filtert, zelfde semantiek als de bestaande
 *  (app)-zoekbalk. De look (glas-pill, icoon, kbd) blijft gelijk. */
export function LeadsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const next = value.trim();
    if (next) {
      params.set("q", next);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${V2_BASE}/leads?${qs}` : `${V2_BASE}/leads`);
    });
  }

  return (
    <form className={styles.search} onSubmit={submit} role="search">
      <Search size={15} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder="Zoek een lead…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Zoek een lead"
        disabled={pending}
      />
      <kbd className={styles.kbd}>⌘K</kbd>
    </form>
  );
}
