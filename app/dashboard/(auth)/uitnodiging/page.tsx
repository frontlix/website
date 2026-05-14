'use client'

import { useActionState, useEffect } from 'react'
import { uitnodigingAction, type UitnodigingState } from './actions'
import styles from '../login/page.module.css'

const initial: UitnodigingState = {}

export default function UitnodigingPage() {
  const [state, formAction, pending] = useActionState(uitnodigingAction, initial)

  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo
  }, [state?.redirectTo])

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Welkom bij Frontlix</h1>
      <p className={styles.subtitle}>
        Je bent uitgenodigd als medewerker. Stel een wachtwoord in om aan de slag te gaan.
      </p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          Wachtwoord
          <input type="password" name="nieuw" required autoComplete="new-password" className={styles.input} minLength={8} />
        </label>
        <label className={styles.label}>
          Herhaal wachtwoord
          <input type="password" name="herhaal" required autoComplete="new-password" className={styles.input} minLength={8} />
        </label>

        {state?.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending || !!state?.redirectTo} className={styles.submit}>
          {pending ? 'Bezig…' : state?.redirectTo ? 'Doorsturen…' : 'Account activeren'}
        </button>
      </form>
    </div>
  )
}
