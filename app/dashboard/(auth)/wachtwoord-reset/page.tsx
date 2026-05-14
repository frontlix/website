'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { resetAction, type WachtwoordResetState } from './actions'
import styles from '../login/page.module.css'

const initial: WachtwoordResetState = {}

export default function WachtwoordResetPage() {
  const [state, formAction, pending] = useActionState(resetAction, initial)

  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo
  }, [state?.redirectTo])

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Nieuw wachtwoord</h1>
      <p className={styles.subtitle}>Stel een nieuw wachtwoord in voor je account.</p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          Nieuw wachtwoord
          <input type="password" name="nieuw" required autoComplete="new-password" className={styles.input} minLength={8} />
        </label>
        <label className={styles.label}>
          Herhaal wachtwoord
          <input type="password" name="herhaal" required autoComplete="new-password" className={styles.input} minLength={8} />
        </label>

        {state?.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending || !!state?.redirectTo} className={styles.submit}>
          {pending ? 'Bezig…' : state?.redirectTo ? 'Doorsturen…' : 'Wachtwoord opslaan'}
        </button>
      </form>

      <p className={styles.footer}>
        <Link href="/login">Terug naar inloggen</Link>
      </p>
    </div>
  )
}
