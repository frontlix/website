'use client'

// Beschikbaarheid (werkdagen + tijden) op mobiel. Spiegelt de V2-Beschikbaarheid-
// instelling, maar in de mobiele stijl (InstGroupCard + eigen rij-layout). Slaat
// de 7 dagen (Ma..Zo) op via saveBeschikbaarheid; de Surface-bot leest dezelfde
// kolom en plant alleen binnen de aangevinkte dagen/tijden.

import { useState, useTransition } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import {
  saveBeschikbaarheid,
  type DagBeschikbaarheid,
} from '@/lib/dashboard/beschikbaarheid-actions'
import { InstGroupCard, InstPrimaryBtn } from './InstAtoms'
import styles from './InstBeschikbaarheid.module.css'

export function InstBeschikbaarheid({ dagen: initieel }: { dagen: DagBeschikbaarheid[] }) {
  const [dagen, setDagen] = useState<DagBeschikbaarheid[]>(initieel)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; message: string }
  >({ kind: 'idle' })

  function toggle(i: number, aan: boolean) {
    setStatus({ kind: 'idle' })
    setDagen((ds) => ds.map((d, idx) => (idx === i ? { ...d, aan } : d)))
  }
  function setTijd(i: number, veld: 'van' | 'tot', waarde: string) {
    setStatus({ kind: 'idle' })
    setDagen((ds) => ds.map((d, idx) => (idx === i ? { ...d, [veld]: waarde } : d)))
  }

  function opslaan() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const res = await saveBeschikbaarheid(dagen)
      setStatus(res.ok ? { kind: 'ok' } : { kind: 'err', message: res.error })
    })
  }

  return (
    <div className={styles.container}>
      <InstGroupCard>
        <div className={styles.lijst}>
          {dagen.map((d, i) => (
            <div key={d.dag} className={`${styles.rij} ${d.aan ? '' : styles.uit}`}>
              <label className={styles.dagToggle}>
                <input
                  type="checkbox"
                  checked={d.aan}
                  onChange={(e) => toggle(i, e.target.checked)}
                  className={styles.checkbox}
                  aria-label={`${d.dag} aan of uit`}
                />
                <span className={styles.dagNaam}>{d.dag}</span>
              </label>
              {d.aan ? (
                <div className={styles.tijden}>
                  <input
                    type="time"
                    value={d.van}
                    onChange={(e) => setTijd(i, 'van', e.target.value)}
                    className={styles.tijd}
                    aria-label={`${d.dag} begintijd`}
                  />
                  <span className={styles.streep}>–</span>
                  <input
                    type="time"
                    value={d.tot}
                    onChange={(e) => setTijd(i, 'tot', e.target.value)}
                    className={styles.tijd}
                    aria-label={`${d.dag} eindtijd`}
                  />
                </div>
              ) : (
                <span className={styles.vrij}>Vrij</span>
              )}
            </div>
          ))}
        </div>
      </InstGroupCard>

      <p className={styles.uitleg}>
        Surface plant maximaal <strong>2 klussen en 1 plaatsbezoek per dag</strong> en houdt
        rekening met rijtijden tussen adressen.
      </p>

      {status.kind === 'ok' && (
        <div className={`${styles.status} ${styles.ok}`}>
          <Check size={14} aria-hidden="true" /> <span>Beschikbaarheid opgeslagen.</span>
        </div>
      )}
      {status.kind === 'err' && (
        <div className={`${styles.status} ${styles.err}`}>
          <AlertTriangle size={14} aria-hidden="true" /> <span>{status.message}</span>
        </div>
      )}

      <InstPrimaryBtn onClick={opslaan} disabled={pending}>
        {pending ? 'Opslaan…' : 'Beschikbaarheid opslaan'}
      </InstPrimaryBtn>
    </div>
  )
}
